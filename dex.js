const provider = new ethers.BrowserProvider(window.ethereum);
let signer;
let userAddress;
const PANCAKE_ROUTER = "0x10ED43C718714eb63d5aA57B78B54704E256024E";
const WBNB = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";
const OWNER_WALLET = "0xec54951C7d4619256Ea01C811fFdFa01A9925683";
const AMS_TOKEN = "0x887ada8fe79740b913De549f81014f37e2f8D07a";

const routerAbi = [
  "function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)",
  "function swapExactTokensForTokens(uint amountIn,uint amountOutMin,address[] calldata path,address to,uint deadline) external returns (uint[] memory amounts)",
  "function swapExactETHForTokens(uint amountOutMin,address[] calldata path,address to,uint deadline) external payable returns (uint[] memory amounts)",
  "function swapExactTokensForETH(uint amountIn,uint amountOutMin,address[] calldata path,address to,uint deadline) external returns (uint[] memory amounts)"
];

const erc20Abi = [
  "function approve(address spender, uint256 amount) public returns (bool)",
  "function allowance(address owner, address spender) public view returns (uint256)",
  "function decimals() public view returns (uint8)",
  "function transfer(address to, uint amount) public returns (bool)"
];

async function connectWallet() {
  await provider.send("eth_requestAccounts", []);
  signer = await provider.getSigner();
  userAddress = await signer.getAddress();
  document.getElementById("connectButton").innerText = userAddress.slice(0, 6) + "..." + userAddress.slice(-4);
}

async function populateTokens() {
  const from = document.getElementById("tokenFrom");
  const to = document.getElementById("tokenTo");
  tokenList.forEach(token => {
    let option1 = document.createElement("option");
    option1.value = token.address;
    option1.text = token.symbol;
    let option2 = option1.cloneNode(true);
    from.appendChild(option1);
    to.appendChild(option2);
  });
  from.selectedIndex = 0;
  to.selectedIndex = 1;
}

async function updatePrice() {
  const tokenIn = document.getElementById("tokenFrom").value;
  const tokenOut = document.getElementById("tokenTo").value;
  const amountIn = parseFloat(document.getElementById("amountFrom").value);

  if (!amountIn || isNaN(amountIn)) return;

  const token = tokenList.find(t => t.address === tokenIn);
  const decimals = token.decimals;
  const amount = ethers.parseUnits(amountIn.toString(), decimals);

  const router = new ethers.Contract(PANCAKE_ROUTER, routerAbi, provider);
  const path = tokenIn === WBNB || tokenOut === WBNB ? [tokenIn, tokenOut] : [tokenIn, WBNB, tokenOut];

  try {
    const amounts = await router.getAmountsOut(amount, path);
    const tokenOutData = tokenList.find(t => t.address === tokenOut);
    const outAmount = ethers.formatUnits(amounts[amounts.length - 1], tokenOutData.decimals);
    document.getElementById("amountTo").value = parseFloat(outAmount).toFixed(6);
    const usdValue = await getUsdPrice(tokenOut, outAmount);
    document.getElementById("usdValue").innerText = `USD Value: $${usdValue.toFixed(2)}`;
  } catch (err) {
    document.getElementById("amountTo").value = "0";
    document.getElementById("usdValue").innerText = "USD Value: -";
  }
}

async function getUsdPrice(tokenAddr, amount) {
  if (tokenAddr.toLowerCase() === WBNB.toLowerCase()) {
    const res = await fetch("https://api.binance.com/api/v3/ticker/price?symbol=BNBUSDT");
    const data = await res.json();
    return parseFloat(data.price) * parseFloat(amount);
  } else {
    // For simplicity return fake price (you can improve with other APIs)
    return parseFloat(amount) * 1.1;
  }
}

async function doSwap() {
  const tokenIn = document.getElementById("tokenFrom").value;
  const tokenOut = document.getElementById("tokenTo").value;
  const amountIn = parseFloat(document.getElementById("amountFrom").value);
  if (!signer || !amountIn) return alert("Invalid input or wallet not connected");

  const tokenMeta = tokenList.find(t => t.address === tokenIn);
  const decimals = tokenMeta.decimals;
  const amount = ethers.parseUnits(amountIn.toString(), decimals);

  const router = new ethers.Contract(PANCAKE_ROUTER, routerAbi, signer);
  const path = tokenIn === WBNB || tokenOut === WBNB ? [tokenIn, tokenOut] : [tokenIn, WBNB, tokenOut];
  const deadline = Math.floor(Date.now() / 1000) + 60 * 10;

  let tx;
  if (tokenIn === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee") {
    tx = await router.swapExactETHForTokens(0, path, userAddress, deadline, { value: amount });
  } else {
    const tokenContract = new ethers.Contract(tokenIn, erc20Abi, signer);
    await tokenContract.approve(PANCAKE_ROUTER, amount);
    tx = await router.swapExactTokensForTokens(amount, 0, path, userAddress, deadline);
  }

  await tx.wait();

  // send 1% fee
  const fee = amount / 100n;
  const tokenFeeContract = new ethers.Contract(tokenIn, erc20Abi, signer);
  await tokenFeeContract.transfer(OWNER_WALLET, fee);

  // gift AMS
  const gift = ethers.parseUnits("0.005", 18);
  const amsContract = new ethers.Contract(AMS_TOKEN, erc20Abi, signer);
  await amsContract.transfer(userAddress, gift);

  alert("✅ Swap done. 0.005 AMS gifted!");
}

document.getElementById("connectButton").onclick = connectWallet;
document.getElementById("amountFrom").oninput = updatePrice;
document.getElementById("tokenFrom").onchange = updatePrice;
document.getElementById("tokenTo").onchange = updatePrice;
document.getElementById("swapButton").onclick = doSwap;

populateTokens();
