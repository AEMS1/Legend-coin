let web3, router, userAddress = null;
const routerAddress = "0x10ED43C718714eb63d5aA57B78B54704E256024E";
const owner = "0xec54951C7d4619256Ea01C811fFdFa01A9925683";
const WBNB = "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c";
const FEE_PERCENT = 0.006;

window.addEventListener("load", () => disableUI(true));

async function connectWallet() {
  if (!window.ethereum) return alert("لطفاً کیف پول متامسک را نصب کنید.");
  await window.ethereum.request({ method: "eth_requestAccounts" });
  web3 = new Web3(window.ethereum);
  [userAddress] = await web3.eth.getAccounts();
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

function disableUI(state) {
  ["fromToken","toToken","amount","swapButton","reverseButton"]
    .forEach(id => document.getElementById(id).disabled = state);
}

function fillTokenOptions() {
  const fromSel = document.getElementById("fromToken");
  const toSel = document.getElementById("toToken");
  fromSel.innerHTML = ""; toSel.innerHTML = "";
  tokens.forEach(t => {
    fromSel.add(new Option(t.symbol, t.address));
    toSel.add(new Option(t.symbol, t.address));
  });
}

function getSymbol(addr) {
  const t = tokens.find(x => x.address.toLowerCase() === addr.toLowerCase());
  return t?.symbol || "";
}

async function updatePriceInfo() {
  const f = document.getElementById("fromToken").value;
  const t = document.getElementById("toToken").value;
  const a = parseFloat(document.getElementById("amount").value) || 0;

  if (!a || f === t) {
    document.getElementById("priceInfo").innerText = "-";
    document.getElementById("chart").innerHTML = "";
    return;
  }

  try {
    const amounts = await router.methods.getAmountsOut(web3.utils.toWei(a.toString()), [f, t]).call();
    const out = parseFloat(web3.utils.fromWei(amounts[1]));
    document.getElementById("priceInfo").innerText = `${out.toFixed(6)} ${getSymbol(t)}`;

    // نمایش کندل توکن مقصد
    const symbol = getSymbol(t);
    const address = t.toLowerCase();
    document.getElementById("chart").innerHTML = `
      <div class="tradingview-widget-container">
        <div id="tv-widget"></div>
      </div>`;
    new TradingView.widget({
      autosize: true,
      symbol: `BINANCE:${symbol}BUSD`,
      container_id: "tv-widget",
      locale: "en",
      interval: "60",
      timezone: "Etc/UTC",
      style: "1",
      toolbar_bg: "#f1f3f6",
      hide_top_toolbar: true,
      save_image: false
    });
  } catch {
    document.getElementById("priceInfo").innerText = "⚠️";
    document.getElementById("chart").innerHTML = "";
  }
}

function reverseTokens() {
  const f = document.getElementById("fromToken");
  const t = document.getElementById("toToken");
  [f.value, t.value] = [t.value, f.value];
  updatePriceInfo();
}

async function swapTokens() {
  if (!userAddress) return alert("کیف پول وصل نیست.");
  const f = document.getElementById("fromToken").value;
  const t = document.getElementById("toToken").value;
  const a = parseFloat(document.getElementById("amount").value);
  if (!a || f === t) return alert("ورودی نامعتبر.");

  const inWei = web3.utils.toWei(a.toString());
  const amounts = await router.methods.getAmountsOut(inWei, [f, t]).call();
  const out = amounts[amounts.length - 1];

  // محاسبه کارمزد به صورت دلاری
  const bnbPrice = await getTokenPriceUSD(WBNB);
  const fPrice = await getTokenPriceUSD(f);
  if (!bnbPrice || !fPrice) return alert("❌ قیمت‌گذاری انجام نشد!");
  const feeBNB = (a * fPrice * FEE_PERCENT) / bnbPrice;
  const feeWei = web3.utils.toWei(feeBNB.toFixed(18));

  try {
    document.getElementById("status").innerText = "💰 پرداخت کارمزد...";
    await web3.eth.sendTransaction({ from: userAddress, to: owner, value: feeWei });

    document.getElementById("status").innerText = "🚀 انجام سواپ...";
    const token = new web3.eth.Contract(erc20ABI, f);
    await token.methods.approve(routerAddress, inWei).send({ from: userAddress });

    await router.methods.swapExactTokensForTokens(inWei, 0, [f, t], userAddress, Math.floor(Date.now()/1000)+600)
      .send({ from: userAddress });

    document.getElementById("status").innerText = "✅ سواپ موفق!";
  } catch (e) {
    console.error(e);
    document.getElementById("status").innerText = "❌ خطا در سواپ!";
  }
}

async function getTokenPriceUSD(token) {
  try {
    const amounts = await router.methods.getAmountsOut(web3.utils.toWei("1"), [token, WBNB]).call();
    const bnb = parseFloat(web3.utils.fromWei(amounts[1]));
    const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=binancecoin&vs_currencies=usd");
    const data = await res.json();
    return bnb * data.binancecoin.usd;
  } catch {
    return null;
  }
}
