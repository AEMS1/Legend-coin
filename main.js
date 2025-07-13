let web3, router, userAddress = null;
const owner = "0xec54951C7d4619256Ea01C811fFdFa01A9925683";
const routerAddr = "0x10ED43C718714eb63d5aA57B78B54704E256024E";
const WBNB = "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c";
const FEE = 0.006;

window.onload = () => disableUI(true);

async function fetchPrice(address) {
  try {
    const res = await fetch(`https://api.pancakeswap.info/api/v2/tokens/${address}`);
    const { data } = await res.json();
    return data?.price ? parseFloat(data.price) : null;
  } catch {
    return null;
  }
}

function disableUI(state) {
  ["fromToken","toToken","amount","swapButton","reverseButton"]
    .forEach(id => document.getElementById(id).disabled = state);
}

function fillTokens() {
  ["fromToken","toToken"].forEach(id => {
    const sel = document.getElementById(id);
    sel.innerHTML = "";
    tokens.forEach(t => sel.add(new Option(t.symbol, t.address)));
  });
}

function getSymbol(addr) {
  const t = tokens.find(x=>x.address.toLowerCase()===addr.toLowerCase());
  return t ? t.symbol : "";
}

async function connectWallet(){
  if(!window.ethereum)return alert("متامسک نصب نیست!");
  await window.ethereum.request({ method:"eth_requestAccounts" });
  web3 = new Web3(window.ethereum);
  [userAddress] = await web3.eth.getAccounts();
  router = new web3.eth.Contract(pancakeRouterABI, routerAddr);
  document.getElementById("walletAddress").innerText = userAddress;
  document.getElementById("connectButton").innerText = "🔌 Connected";
  fillTokens();
  disableUI(false);
  updatePrice();
  ["fromToken","toToken","amount"].forEach(id =>
    document.getElementById(id).addEventListener("input", updatePrice)
  );
}

async function updatePrice() {
  const f = document.getElementById("fromToken").value;
  const t = document.getElementById("toToken").value;
  const a = parseFloat(document.getElementById("amount").value) || 0;
  if(!a || f===t){
    document.getElementById("priceInfo").innerText="-";
    document.getElementById("priceUSD").innerText="-";
    return;
  }
  try {
    const inWei = web3.utils.toWei(a.toString(),"ether");
    const amounts = await router.methods.getAmountsOut(inWei,[f,t]).call();
    const out = parseFloat(web3.utils.fromWei(amounts[1],"ether"));
    document.getElementById("priceInfo").innerText = `${out.toFixed(6)} ${getSymbol(t)}`;

    const p = await fetchPrice(t);
    document.getElementById("priceUSD").innerText = p ? `$${(out*p).toFixed(2)}` : "-";
  } catch {
    document.getElementById("priceInfo").innerText="⚠️";
    document.getElementById("priceUSD").innerText="-";
  }
}

function reverseTokens(){
  const f = document.getElementById("fromToken");
  const t = document.getElementById("toToken");
  [f.value, t.value] = [t.value, f.value];
  updatePrice();
}

async function swapTokens(){
  if(!userAddress) return alert("کیف پول وصل نیست.");
  const f = document.getElementById("fromToken").value;
  const t = document.getElementById("toToken").value;
  const a = parseFloat(document.getElementById("amount").value);
  if(!a||f===t)return alert("ورودی نامعتبر.");
  const inWei = web3.utils.toWei(a.toString(),"ether");
  const pF = await fetchPrice(f);
  const pB = await fetchPrice(WBNB);
  if(!pF||!pB) return alert("❌ قیمت‌گذاری انجام نشد!");
  const feeWei = web3.utils.toWei(((a*pF*FEE)/pB).toFixed(18),"ether");
  try {
    document.getElementById("status").innerText="💰 پرداخت کارمزد...";
    await web3.eth.sendTransaction({from:userAddress,to:owner,value:feeWei});

    document.getElementById("status").innerText="🔄 در حال سواپ...";
    const tok = new web3.eth.Contract(erc20ABI,f);
    await tok.methods.approve(routerAddr,inWei).send({from:userAddress});
    await router.methods.swapExactTokensForTokens(inWei,0,[f,t],userAddress,Math.floor(Date.now()/1000)+600)
      .send({from:userAddress});

    document.getElementById("status").innerText="✅ سواپ موفقیت‌آمیز بود!";
  } catch (e) {
    console.error(e);
    document.getElementById("status").innerText="❌ خطا در سواپ!";
  }
}
