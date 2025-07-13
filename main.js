let web3, router, userAddress = null;

const routerAddress = "0x10ED43C718714eb63d5aA57B78B54704E256024E";
const owner = "0xec54951C7d4619256Ea01C811fFdFa01A9925683"; // مالک
const WBNB = "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c";
const FEE_PERCENT = 0.006;

window.addEventListener("load", () => {
  disableUI(true);
});

async function connectWallet() {
  if (!window.ethereum) return alert("لطفاً Metamask نصب کنید!");
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
}

function disableUI(dis) {
  ["fromToken", "toToken", "amount", "swapButton", "reverseButton"]
    .forEach(id => document.getElementById(id).disabled = dis);
}

function fillTokenOptions() {
  ["fromToken", "toToken"].forEach(id => {
    const sel = document.getElementById(id);
    sel.innerHTML = "";
    tokens.forEach(t => sel.add(new Option(t.symbol, t.address)));
  });
}

function getSymbol(addr) {
  const t = tokens.find(x => x.address.toLowerCase() === addr.toLowerCase());
  return t ? t.symbol : "";
}

async function getTokenPriceUSD(tokenAddress) {
  try {
    const path = [tokenAddress, WBNB];
    const amountIn = web3.utils.toWei("1", "ether");
    const amounts = await router.methods.getAmountsOut(amountIn, path).call();
    const bnbOut = web3.utils.fromWei(amounts[1], "ether");

    const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=binancecoin&vs_currencies=usd");
    const data = await res.json();
    const bnbPriceUSD = data.binancecoin.usd;

    return parseFloat(bnbOut) * parseFloat(bnbPriceUSD);
  } catch (err) {
    console.warn("❌ getTokenPriceUSD error:", err.message);
    return null;
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
    const inWei = web3.utils.toWei(amount.toString(), "ether");
    const amounts = await router.methods.getAmountsOut(inWei, [from, to]).call();
    const outAmount = parseFloat(web3.utils.fromWei(amounts[1], "ether"));
    document.getElementById("priceInfo").innerText = `${outAmount.toFixed(6)} ${getSymbol(to)}`;

    const priceUSD = await getTokenPriceUSD(to);
    document.getElementById("priceUSD").innerText = priceUSD
      ? `$${(outAmount * priceUSD).toFixed(2)}`
      : "-";
  } catch (err) {
    console.warn("Price calc error:", err.message);
    document.getElementById("priceInfo").innerText = "⚠️";
    document.getElementById("priceUSD").innerText = "-";
  }
}

function reverseTokens() {
  const f = document.getElementById("fromToken");
  const t = document.getElementById("toToken");
  [f.value, t.value] = [t.value, f.value];
  updatePriceInfo();
}

async function swapTokens() {
  if (!userAddress) return alert("کیف پول متصل نیست.");
  const from = document.getElementById("fromToken").value;
  const to = document.getElementById("toToken").value;
  const amount = parseFloat(document.getElementById("amount").value);
  if (!amount || from === to) return alert("ورودی نامعتبر!");

  const inWei = web3.utils.toWei(amount.toString(), "ether");
  const fromPriceUSD = await getTokenPriceUSD(from);
  const bnbPriceUSD = await getTokenPriceUSD(WBNB);

  if (!fromPriceUSD || !bnbPriceUSD) {
    alert("❌ خطا در دریافت قیمت برای کارمزد!");
    return;
  }

  const feeInBNB = (amount * fromPriceUSD * FEE_PERCENT) / bnbPriceUSD;
  const feeWei = web3.utils.toWei(feeInBNB.toFixed(18), "ether");

  try {
    document.getElementById("status").innerText = "💰 پرداخت کارمزد...";
    await web3.eth.sendTransaction({
      from: userAddress,
      to: owner,
      value: feeWei
    });

    document.getElementById("status").innerText = "⏳ تایید توکن...";
    const token = new web3.eth.Contract(erc20ABI, from);
    await token.methods.approve(routerAddress, inWei).send({ from: userAddress });

    document.getElementById("status").innerText = "🔁 در حال سواپ...";
    await router.methods.swapExactTokensForTokens(
      inWei,
      0,
      [from, to],
      userAddress,
      Math.floor(Date.now() / 1000) + 60 * 10
    ).send({ from: userAddress });

    document.getElementById("status").innerText = "✅ سواپ موفقیت‌آمیز!";
  } catch (err) {
    console.error("Swap error:", err);
    document.getElementById("status").innerText = "❌ خطا در سواپ!";
  }
}
