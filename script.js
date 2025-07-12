const routerAddress = "0x10ED43C718714eb63d5aA57B78B54704E256024E"; // PancakeSwap
const ownerWallet = "0xec54951C7d4619256Ea01C811fFdFa01A9925683"; // برای دریافت 0.7%

let provider, signer;

document.getElementById("connectWallet").onclick = async () => {
  if (window.ethereum) {
    await window.ethereum.request({ method: "eth_requestAccounts" });
    provider = new ethers.providers.Web3Provider(window.ethereum);
    signer = provider.getSigner();
    document.getElementById("statusMessage").innerText = "Wallet Connected";
  }
};

function populateTokenDropdowns() {
  const fromSelect = document.getElementById("fromToken");
  const toSelect = document.getElementById("toToken");

  tokenList.forEach(token => {
    const optionFrom = document.createElement("option");
    optionFrom.value = token.address;
    optionFrom.text = token.symbol;
    fromSelect.appendChild(optionFrom);

    const optionTo = document.createElement("option");
    optionTo.value = token.address;
    optionTo.text = token.symbol;
    toSelect.appendChild(optionTo);
  });
}

window.onload = () => {
  populateTokenDropdowns();
};

document.getElementById("fromAmount").oninput = async () => {
  const from = document.getElementById("fromToken").value;
  const to = document.getElementById("toToken").value;
  const amount = parseFloat(document.getElementById("fromAmount").value);

  if (!amount || !from || !to || !provider) return;

  const router = new ethers.Contract(routerAddress, [
    "function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)"
  ], provider);

  const amountIn = ethers.utils.parseUnits(amount.toString(), 18);
  try {
    const amounts = await router.getAmountsOut(amountIn, [from, to]);
    const amountOut = ethers.utils.formatUnits(amounts[1], 18);
    document.getElementById("toAmount").value = amountOut;
    document.getElementById("priceInfo").innerText = `Price: 1 ${tokenList.find(t => t.address === from).symbol} = ${(amountOut / amount).toFixed(6)} ${tokenList.find(t => t.address === to).symbol}`;
  } catch (err) {
    console.error(err);
  }
};

document.getElementById("swapButton").onclick = async () => {
  if (!signer) return alert("Connect wallet first");

  const from = document.getElementById("fromToken").value;
  const to = document.getElementById("toToken").value;
  const amount = parseFloat(document.getElementById("fromAmount").value);
  if (!amount || !from || !to) return;

  const router = new ethers.Contract(routerAddress, [
    "function swapExactTokensForTokensSupportingFeeOnTransferTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external",
    "function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)"
  ], signer);

  const fromToken = new ethers.Contract(from, [
    "function approve(address spender, uint256 amount) public returns (bool)"
  ], signer);

  const amountIn = ethers.utils.parseUnits(amount.toString(), 18);
  const path = [from, to];

  try {
    await fromToken.approve(routerAddress, amountIn);
    
    // کارمزد 0.7٪
    const fee = amountIn.mul(7).div(1000);
    const finalAmountIn = amountIn.sub(fee);

    // ارسال کارمزد به کیف پول مالک
    const fromTokenForFee = new ethers.Contract(from, [
      "function transfer(address to, uint amount) public returns (bool)"
    ], signer);
    await fromTokenForFee.transfer(ownerWallet, fee);

    // اجرای سواپ
    const deadline = Math.floor(Date.now() / 1000) + 60 * 10; // 10 دقیقه
    await router.swapExactTokensForTokensSupportingFeeOnTransferTokens(
      finalAmountIn,
      0,
      path,
      await signer.getAddress(),
      deadline
    );

    document.getElementById("statusMessage").innerText = "Swap Successful ✅";
  } catch (err) {
    console.error(err);
    document.getElementById("statusMessage").innerText = "Swap Failed ❌";
  }
};
