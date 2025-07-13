let web3;
let router;
let userAddress = null;

const owner = "0xec54951C7d4619256Ea01C811fFdFa01A9925683"; // مالک صرافی
const routerAddress = "0x10ED43C718714eb63d5aA57B78B54704E256024E";
const WBNB = "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c";
const FEE_PERCENT = 0.006;

window.addEventListener("load", () => disableUI(true));

async function connectWallet() {
  if (!window.ethereum) return alert("لطفاً کیف پول متامسک را نصب کنید.");
  try {
    await window.ethereum.request({ method: "eth_requestAccounts" });
    web3 = new Web3(window.ethereum);
    const accounts = await web3.eth.getAccounts();
    userAddress = accounts[0];

    router = new web3.eth.Contract(pancakeRouterABI, routerAddress);
    document.getElementById("walletAddress").innerText = userAddress;
    document.getElementById("connectButton").innerText = "🔌 Wallet Connected";

    fillTokenOptions();
    disableUI(false);
    updatePriceInfo();

    ["fromToken", "toToken", "amount"].forEach(id =>
      document.getElementById(id).addEventListener("input", updatePriceInfo)
    );
  } catch (err) {
    console.error(err);
    alert("خطا در اتصال به کیف پول.");
  }
}

function disableUI(disabled) {
  ["fromToken", "toToken", "amount", "swapButton", "reverseButton"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.disabled = disabled;
  });
}

function fillTokenOptions() {
  ["fromToken", "toToken"].forEach(selectId => {
    const select = document.getElementById(selectId);
    select.innerHTML = "";
    tokens.forEach(token => {
      const opt = document.createElement("option");
      opt.value = token.address;
      opt.text = token.symbol;
      select.appendChild(opt);
    });
  });
}

function getTokenSymbol(address) {
  const token = tokens.find(t => t.address.toLowerCase() === address.toLowerCase());
  return token ? token.symbol : "";
}

async function fetchTokenPriceUSD(address) {
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/token_price/binance-smart-chain?contract_addresses=${address}&vs_currencies=usd`
    );
    const data = await res.json();
    return data[address.toLowerCase()]?.usd || null;
  } catch (e) {
    console.warn("CoinGecko error:", e);
    return null;
  }
}

async function updatePriceInfo() {
  const from = document.getElementById("fromToken").value;
  const to = document.getElementById("toToken").value;
  const amount = parseFloat(document.getElementById("amount").value);
  if (!amount || amount <= 0 || from === to) {
    document.getElementById("priceInfo").innerText = "-";
    document.getElementById("priceUSD").innerText = "-";
    return;
  }

  try {
    const amountIn = web3.utils.toWei(amount.toString(), "ether");
    const path = [from, to];
    const amountsOut = await router.methods.getAmountsOut(amountIn, path).call();
    const output = amountsOut[amountsOut.length - 1];
    const symbol = getTokenSymbol(to);
    const formatted = web3.utils.fromWei(output.toString(), "ether");
    document.getElementById("priceInfo").innerText = `${parseFloat(formatted).toFixed(6)} ${symbol}`;

    const price = await fetchTokenPriceUSD(to);
    if (price) {
      const usdValue = parseFloat(formatted) * price;
      document.getElementById("priceUSD").innerText = `$${usdValue.toFixed(2)}`;
    } else {
      document.getElementById("priceUSD").innerText = "-";
    }
  } catch (err) {
    console.warn("خطا در محاسبه قیمت", err);
    document.getElementById("priceInfo").innerText = "Error";
    document.getElementById("priceUSD").innerText = "-";
  }
}

function reverseTokens() {
  const from = document.getElementById("fromToken");
  const to = document.getElementById("toToken");
  const temp = from.value;
  from.value = to.value;
  to.value = temp;
  updatePriceInfo();
}

async function swapTokens() {
  if (!userAddress) return alert("لطفاً کیف پول را وصل کنید.");

  const from = document.getElementById("fromToken").value;
  const to = document.getElementById("toToken").value;
  const amount = parseFloat(document.getElementById("amount").value);
  if (!amount || amount <= 0 || from === to) return alert("مقدار نامعتبر است.");

  const amountInWei = web3.utils.toWei(amount.toString(), "ether");
  const fromPriceUSD = await fetchTokenPriceUSD(from);
  const bnbPriceUSD = await fetchTokenPriceUSD(WBNB);

  if (!fromPriceUSD || !bnbPriceUSD) return alert("❌ قیمت توکن‌ها دریافت نشد.");

  const usdValue = amount * fromPriceUSD;
  const feeInUSD = usdValue * FEE_PERCENT;
  const feeInBNB = feeInUSD / bnbPriceUSD;
  const feeInBNBFixed = feeInBNB.toFixed(18);
  const feeBNBWei = web3.utils.toWei(feeInBNBFixed, "ether");

  const deadline = Math.floor(Date.now() / 1000) + 600;

  document.getElementById("status").innerText = "💰 در حال پرداخت کارمزد...";

  try {
    await web3.eth.sendTransaction({
      from: userAddress,
      to: owner,
      value: feeBNBWei.toString()
    });

    document.getElementById("status").innerText = "🔄 در حال انجام سواپ...";

    if (from.toLowerCase() === WBNB.toLowerCase()) {
      const path = [WBNB, to];
      await router.methods.swapExactETHForTokens(0, path, userAddress, deadline).send({
        from: userAddress,
        value: amountInWei
      });
    } else {
      const token = new web3.eth.Contract(erc20ABI, from);
      await token.methods.approve(routerAddress, amountInWei).send({ from: userAddress });

      if (to.toLowerCase() === WBNB.toLowerCase()) {
        const path = [from, WBNB];
        await router.methods.swapExactTokensForETH(amountInWei, 0, path, userAddress, deadline).send({ from: userAddress });
      } else {
        const path = [from, to];
        await router.methods.swapExactTokensForTokens(amountInWei, 0, path, userAddress, deadline).send({ from: userAddress });
      }
    }

    document.getElementById("status").innerText = "✅ سواپ با موفقیت انجام شد!";
  } catch (err) {
    console.error("Swap Error:", err);
    document.getElementById("status").innerText = "❌ خطا در انجام سواپ!";
  }
}

const erc20ABI = [
  {
    constant: false,
    inputs: [
      { name: "_spender", type: "address" },
      { name: "_value", type: "uint256" }
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    type: "function"
  }
];
