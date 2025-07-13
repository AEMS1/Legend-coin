let web3;
let router;
let userAddress = null;

const owner = "0xec54951C7d4619256Ea01C811fFdFa01A9925683"; // مالک
const routerAddress = "0x10ED43C718714eb63d5aA57B78B54704E256024E"; // PancakeSwap
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
    document.getElementById("connectButton").innerText = "🔌 Connected";

    fillTokenOptions();
    disableUI(false);
    updatePriceInfo();

    ["fromToken", "toToken", "amount"].forEach(id =>
      document.getElementById(id).addEventListener("input", updatePriceInfo)
    );
  } catch (err) {
    alert("خطا در اتصال به کیف پول.");
  }
}

function disableUI(disabled) {
  ["fromToken", "toToken", "amount", "swapButton", "reverseButton"].forEach(id => {
    document.getElementById(id).disabled = disabled;
  });
}

function fillTokenOptions() {
  ["fromToken", "toToken"].forEach(id => {
    const sel = document.getElementById(id);
    sel.innerHTML = "";
    tokens.forEach(t => {
      const opt = document.createElement("option");
      opt.value = t.address;
      opt.innerText = t.symbol;
      sel.appendChild(opt);
    });
  });
}

function getTokenSymbol(address) {
  const token = tokens.find(t => t.address.toLowerCase() === address.toLowerCase());
  return token ? token.symbol : "";
}

async function fetchPriceFromDexTools(address) {
  try {
    const res = await fetch(`https://api.dexscreener.com/latest/dex/pairs/bsc/${address}`);
    const data = await res.json();
    return parseFloat(data?.pair?.priceUsd || 0);
  } catch {
    return 0;
  }
}

async function updatePriceInfo() {
  const from = document.getElementById("fromToken").value;
  const to = document.getElementById("toToken").value;
  const amount = parseFloat(document.getElementById("amount").value);

  if (!amount || from === to) {
    document.getElementById("priceInfo").innerText = "-";
    document.getElementById("priceUSD").innerText = "-";
    return;
  }

  try {
    const amountIn = web3.utils.toWei(amount.toString(), "ether");
    const path = [from, to];
    const amountsOut = await router.methods.getAmountsOut(amountIn, path).call();
    const out = web3.utils.fromWei(amountsOut[1].toString(), "ether");

    document.getElementById("priceInfo").innerText = `${parseFloat(out).toFixed(6)} ${getTokenSymbol(to)}`;

    const price = await fetchPriceFromDexTools(to);
    document.getElementById("priceUSD").innerText = price > 0 ? `$${(price * parseFloat(out)).toFixed(2)}` : "-";
  } catch {
    document.getElementById("priceInfo").innerText = "⚠️";
    document.getElementById("priceUSD").innerText = "-";
  }
}

function reverseTokens() {
  const from = document.getElementById("fromToken");
  const to = document.getElementById("toToken");
  [from.value, to.value] = [to.value, from.value];
  updatePriceInfo();
}

async function swapTokens() {
  if (!userAddress) return alert("اول کیف پول را وصل کن");

  const from = document.getElementById("fromToken").value;
  const to = document.getElementById("toToken").value;
  const amount = parseFloat(document.getElementById("amount").value);

  if (!amount || from === to) return alert("مقدار نامعتبر است");

  const amountInWei = web3.utils.toWei(amount.toString(), "ether");

  const priceFrom = await fetchPriceFromDexTools(from);
  const priceBNB = await fetchPriceFromDexTools(WBNB);
  if (!priceFrom || !priceBNB) return alert("قیمت‌گذاری انجام نشد");

  const usdVal = amount * priceFrom;
  const feeInUSD = usdVal * FEE_PERCENT;
  const feeInBNB = (feeInUSD / priceBNB).toFixed(18);
  const feeWei = web3.utils.toWei(feeInBNB, "ether");

  try {
    document.getElementById("status").innerText = "پرداخت کارمزد...";
    await web3.eth.sendTransaction({ from: userAddress, to: owner, value: feeWei });

    const token = new web3.eth.Contract(erc20ABI, from);
    await token.methods.approve(routerAddress, amountInWei).send({ from: userAddress });

    const path = [from, to];
    const deadline = Math.floor(Date.now() / 1000) + 60 * 10;

    document.getElementById("status").innerText = "در حال سواپ...";
    await router.methods.swapExactTokensForTokens(
      amountInWei,
      0,
      path,
      userAddress,
      deadline
    ).send({ from: userAddress });

    document.getElementById("status").innerText = "✅ سواپ با موفقیت انجام شد";
  } catch (err) {
    console.error("Swap Error:", err);
    document.getElementById("status").innerText = "❌ خطا در سواپ";
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
