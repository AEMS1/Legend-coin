let web3;
let router;
let userAddress = null;

const owner = "0xec54951C7d4619256Ea01C811fFdFa01A9925683"; // کیف پول مالک
const routerAddress = "0x10ED43C718714eb63d5aA57B78B54704E256024E"; // PancakeSwap Router
const WBNB = "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c"; // آدرس WBNB با حروف کوچک

const FEE_PERCENT = 0.006; // 0.6 درصد کارمزد

window.addEventListener("load", () => {
  disableUI(true);
});

async function connectWallet() {
  if (!window.ethereum) return alert("متامسک نصب نشده!");

  try {
    await window.ethereum.request({ method: "eth_requestAccounts" });
    web3 = new Web3(window.ethereum);
    const accounts = await web3.eth.getAccounts();
    userAddress = accounts[0];

    document.getElementById("walletAddress").innerText = "Connected: " + userAddress;
    document.getElementById("connectButton").innerText = "🔌 Wallet Connected";

    router = new web3.eth.Contract(pancakeRouterABI, routerAddress);
    fillTokenOptions();
    disableUI(false);
    updatePriceInfo();

    document.getElementById("fromToken").addEventListener("change", updatePriceInfo);
    document.getElementById("toToken").addEventListener("change", updatePriceInfo);
    document.getElementById("amount").addEventListener("input", updatePriceInfo);

    window.ethereum.on('accountsChanged', (accounts) => {
      userAddress = accounts[0] || null;
      location.reload();
    });

    window.ethereum.on('chainChanged', () => location.reload());

  } catch (err) {
    console.error(err);
    alert("اتصال به کیف پول لغو شد.");
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
      opt.value = token.address.toLowerCase();
      opt.text = token.symbol;
      select.appendChild(opt);
    });
  });
}

function getPath(from, to) {
  const f = from.toLowerCase() === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee" ? WBNB : from;
  const t = to.toLowerCase() === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee" ? WBNB : to;
  return [f, t];
}

function getTokenDecimals(address) {
  const token = tokens.find(t => t.address.toLowerCase() === address.toLowerCase());
  return token ? token.decimals : 18;
}

function getTokenSymbol(address) {
  const token = tokens.find(t => t.address.toLowerCase() === address.toLowerCase());
  return token ? token.symbol : "";
}

function formatAmount(amount, decimals) {
  return parseFloat(web3.utils.fromWei(amount.toString(), "ether")).toFixed(6);
}

// محاسبه ارزش توکن به BNB (برای کارمزد)
async function getTokenValueInBNB(tokenAddress, amountInWei) {
  if (tokenAddress.toLowerCase() === WBNB.toLowerCase()) {
    return web3.utils.toBN(amountInWei);
  }
  try {
    const path = [tokenAddress, WBNB];
    const amountsOut = await router.methods.getAmountsOut(amountInWei, path).call();
    const bnbAmount = amountsOut[amountsOut.length - 1];
    return web3.utils.toBN(bnbAmount);
  } catch (e) {
    console.error("Error getting token value in BNB:", e);
    return web3.utils.toBN("0");
  }
}

async function updatePriceInfo() {
  const from = document.getElementById("fromToken").value;
  const to = document.getElementById("toToken").value;
  const amount = parseFloat(document.getElementById("amount").value);

  if (!amount || amount <= 0 || from === to) {
    document.getElementById("priceInfo").innerText = "-";
    document.getElementById("minReceived").innerText = "-";
    return;
  }

  try {
    const amountIn = web3.utils.toWei(amount.toString(), "ether");
    const path = getPath(from, to);
    const amountsOut = await router.methods.getAmountsOut(amountIn, path).call();

    const output = amountsOut[amountsOut.length - 1];
    const decimalsOut = getTokenDecimals(to);
    const formatted = formatAmount(output, decimalsOut);
    const minReceived = output * 0.99; // slippage 1%

    document.getElementById("priceInfo").innerText = `${formatted} ${getTokenSymbol(to)}`;
    document.getElementById("minReceived").innerText = `${(minReceived / 1e18).toFixed(6)} ${getTokenSymbol(to)}`;
  } catch (e) {
    document.getElementById("priceInfo").innerText = "Error";
    document.getElementById("minReceived").innerText = "-";
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
  if (!userAddress) return alert("اول کیف پولت رو وصل کن.");

  const from = document.getElementById("fromToken").value;
  const to = document.getElementById("toToken").value;
  const amount = parseFloat(document.getElementById("amount").value);

  if (!amount || amount <= 0 || from === to) return alert("ورودی نامعتبر است.");

  const amountInWei = web3.utils.toWei(amount.toString(), "ether");

  // محاسبه مقدار BNB معادل مقدار توکن مبدا
  const bnbValue = await getTokenValueInBNB(from, amountInWei);

  // مقدار کارمزد به BNB (0.6 درصد)
  const feeBNB = bnbValue.mul(web3.utils.toBN(FEE_PERCENT * 1e6)).div(web3.utils.toBN(1e6));

  if (feeBNB.lte(web3.utils.toBN(0))) {
    return alert("خطا در محاسبه کارمزد");
  }

  const deadline = Math.floor(Date.now() / 1000) + 600;

  document.getElementById("status").innerText = "⏳ در حال انجام تراکنش...";

  try {
    // ارسال کارمزد BNB به مالک
    await web3.eth.sendTransaction({
      from: userAddress,
      to: owner,
      value: feeBNB.toString()
    });

    // سپس انجام سواپ کامل (بدون کسر کارمزد از مقدار توکن مبدا)
    if (from.toLowerCase() === WBNB.toLowerCase()) {
      // BNB → توکن
      const path = [WBNB, to];
      await router.methods.swapExactETHForTokens(
        0,
        path,
        userAddress,
        deadline
      ).send({
        from: userAddress,
        value: amountInWei
      });
    } else if (to.toLowerCase() === WBNB.toLowerCase()) {
      // توکن → BNB
      const tokenContract = new web3.eth.Contract(erc20ABI, from);
      await tokenContract.methods.approve(routerAddress, amountInWei).send({ from: userAddress });

      const path = [from, WBNB];
      await router.methods.swapExactTokensForETH(
        amountInWei,
        0,
        path,
        userAddress,
        deadline
      ).send({ from: userAddress });
    } else {
      // توکن → توکن
      const tokenContract = new web3.eth.Contract(erc20ABI, from);
      await tokenContract.methods.approve(routerAddress, amountInWei).send({ from: userAddress });

      const path = [from, to];
      await router.methods.swapExactTokensForTokens(
        amountInWei,
        0,
        path,
        userAddress,
        deadline
      ).send({ from: userAddress });
    }

    document.getElementById("status").innerText = "✅ سواپ با موفقیت انجام شد!";
  } catch (err) {
    console.error(err);
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
