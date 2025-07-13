let web3, router, userAddress = null;
const owner = "0xec54951C7d4619256Ea01C811fFdFa01A9925683";
const routerAddress = "0x10ED43C718714eb63d5aA57B78B54704E256024E";
const WBNB = "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c";
const FEE_PERCENT = 0.006;

window.addEventListener("load", () => disableUI(true));

async function fetchPriceUSD(address) {
  try {
    const res = await fetch(`https://api.pancakeswap.info/api/v2/tokens/${address}`);
    const data = await res.json();
    return parseFloat(data.data.price);
  } catch (e) {
    console.warn("PancakeSwap price error:", e);
    return null;
  }
}

async function connectWallet() {
  if (!window.ethereum) return alert("لطفاً متامسک را نصب کن!");
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

function disableUI(dis) {
  ["fromToken","toToken","amount","swapButton","reverseButton"]
    .forEach(id => document.getElementById(id).disabled = dis);
}

function fillTokenOptions() {
  ["fromToken","toToken"].forEach(id => {
    const sel = document.getElementById(id);
    sel.innerHTML = "";
    tokens.forEach(t => {
      sel.add(new Option(t.symbol, t.address));
    });
  });
}

function getSymbol(addr) {
  const t = tokens.find(t => t.address.toLowerCase()===addr.toLowerCase());
  return t?.symbol || "";
}

async function updatePriceInfo(){
  const from = document.getElementById("fromToken").value;
  const to = document.getElementById("toToken").value;
  const amt = parseFloat(document.getElementById("amount").value);
  if (!amt || from===to) {
    document.getElementById("priceInfo").innerText = "-";
    document.getElementById("priceUSD").innerText = "-";
    return;
  }
  try {
    const inWei = web3.utils.toWei(amt.toString(),"ether");
    const {0:a0,1:a1} = await router.methods.getAmountsOut(inWei,[from,to]).call();
    const outNum = parseFloat(web3.utils.fromWei(a1,"ether"));
    document.getElementById("priceInfo").innerText = `${outNum.toFixed(6)} ${getSymbol(to)}`;
    const price = await fetchPriceUSD(to);
    document.getElementById("priceUSD").innerText = price ? `$${(price*outNum).toFixed(2)}` : "-";
  } catch (e) {
    console.warn(e);
    document.getElementById("priceInfo").innerText = "⚠️";
    document.getElementById("priceUSD").innerText = "-";
  }
}

function reverseTokens() {
  const f = document.getElementById("fromToken");
  const t = document.getElementById("toToken");
  [f.value,t.value]=[t.value,f.value];
  updatePriceInfo();
}

async function swapTokens(){
  if (!userAddress) return alert("کیف پول وصل نیست.");
  const from = document.getElementById("fromToken").value;
  const to = document.getElementById("toToken").value;
  const amt = parseFloat(document.getElementById("amount").value);
  if (!amt || from===to) return alert("مقدار نامعتبر.");
  const inWei = web3.utils.toWei(amt.toString(),"ether");
  const fromPrice = await fetchPriceUSD(from);
  const bnbPrice = await fetchPriceUSD(WBNB);
  if (!fromPrice||!bnbPrice) return alert("❌ قیمت‌گذاری نشده!");
  const feeWei = web3.utils.toWei(((amt*fromPrice*FEE_PERCENT)/bnbPrice).toFixed(18),"ether");
  try {
    document.getElementById("status").innerText="💰 کارمزد...";
    await web3.eth.sendTransaction({from:userAddress,to:owner,value:feeWei});
    document.getElementById("status").innerText="🔄 سواپ...";
    const token = new web3.eth.Contract(erc20ABI,from);
    await token.methods.approve(routerAddress, inWei).send({from:userAddress});
    await router.methods.swapExactTokensForTokens(inWei,0,[from,to],userAddress,Math.floor(Date.now()/1000)+600).send({from:userAddress});
    document.getElementById("status").innerText="✅ موفق!";
  } catch(e){
    console.error(e);
    document.getElementById("status").innerText="❌ خطا!";
  }
}
