const routerAddress = "0x10ED43C718714eb63d5aA57B78B54704E256024E";
const ownerWallet = "0xec54951C7d4619256Ea01C811fFdFa01A9925683";
let provider, signer;

window.onload = () => {
  provider = new ethers.providers.Web3Provider(window.ethereum);
  populateTokens();
  setupChart();
  document.getElementById("connectBtn").onclick = connectWallet;
  document.getElementById("swapBtn").onclick = executeSwap;
  document.getElementById("fromAmount").oninput = estimateOut;
  document.getElementById("fromToken").onchange = estimateOut;
  document.getElementById("toToken").onchange = estimateOut;
};

async function connectWallet() {
  try {
    const [acc] = await provider.send("eth_requestAccounts", []);
    signer = provider.getSigner();
    document.getElementById("connectBtn").innerText = acc.slice(0,6)+"..."+acc.slice(-4);
  } catch {
    alert("Connection failed");
  }
}

function populateTokens() {
  const from = document.getElementById("fromToken");
  const to = document.getElementById("toToken");
  tokenList.forEach(t => {
    from.add(new Option(t.symbol, t.address));
    to.add(new Option(t.symbol, t.address));
  });
  to.selectedIndex = 1;
}

async function estimateOut() {
  const amt = document.getElementById("fromAmount").value;
  const from = document.getElementById("fromToken").value;
  const to = document.getElementById("toToken").value;
  if (!amt || !from || !to) return;
  const router = new ethers.Contract(routerAddress, ["function getAmountsOut(uint, address[]) view returns(uint[])"], provider);
  const path = [from, to];
  const aIn = ethers.utils.parseUnits(amt,18);
  try {
    const res = await router.getAmountsOut(aIn, path);
    const out = ethers.utils.formatUnits(res[1],18);
    document.getElementById("toAmount").value = out;
    document.getElementById("priceInfo").innerText = `1 ${tokenList.find(t=>t.address===from).symbol} ≈ ${(res[1]/aIn).toFixed(6)} ${tokenList.find(t=>t.address===to).symbol}`;
    updateChart(from,to);
  } catch {
    document.getElementById("priceInfo").innerText = `Unable to fetch`;
  }
}

async function executeSwap() {
  if (!signer) return alert("Connect wallet first");
  const from = document.getElementById("fromToken").value;
  const to = document.getElementById("toToken").value;
  const amt = document.getElementById("fromAmount").value;
  const aIn = ethers.utils.parseUnits(amt,18);
  const path = [from,to];
  const fee = aIn.mul(7).div(1000);
  const net = aIn.sub(fee);

  const token = new ethers.Contract(from, ["function approve(address,uint256)","function transfer(address,uint256)"], signer);
  const router = new ethers.Contract(routerAddress, ["function swapExactTokensForTokensSupportingFeeOnTransferTokens(uint,uint,address[],address,uint)"], signer);

  try {
    await token.approve(routerAddress, aIn);
    await token.transfer(ownerWallet, fee);
    await router.swapExactTokensForTokensSupportingFeeOnTransferTokens(net,0,path,await signer.getAddress(),Date.now()+600);
    document.getElementById("status").innerText = "✅ Swap completed!";
  } catch (e) {
    console.error(e);
    document.getElementById("status").innerText = "❌ Swap failed.";
  }
}

// 🕒 CHART
let chart;
function setupChart(){
  const cont = document.getElementById("chart");
  chart = LightweightCharts.createChart(cont,{layout:{backgroundColor:'#1e1e1e',textColor:'#ddd'},grid:{vertLines:{color:'#373737'},horzLines:{color:'#373737'}},timeScale:{borderColor:'#555'}});
  chart.addCandlestickSeries({upColor:'#00ff9f',downColor:'#ff4b5c'});
}

async function updateChart(from,to) {
  // Example: fetch dummy data. Replace API endpoints as needed.
  const data = await fetch(`https://api.pancakeswap.info/api/v2/tokens/${to}`).then(r=>r.json());
  // Use dummy OHLC because Pancake doesn't provide candlestick via this endpoint.
  chart.applyOptions({timeScale:{timeVisible:true}});
  chart.series.setData([]);
}
