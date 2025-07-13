const routerAddress = "0x10ED43C718714eb63d5aA57B78B54704E256024E"; // PancakeSwap Router
const ownerWallet = "0xec54951C7d4619256Ea01C811fFdFa01A9925683";
let provider, signer;

window.onload = async () => {
  provider = new ethers.providers.Web3Provider(window.ethereum);
  signer = provider.getSigner();
  initTokens();
  document.getElementById("connectBtn").onclick = connectWallet;
  document.getElementById("swapBtn").onclick = swap;
};

async function connectWallet() {
  await provider.send("eth_requestAccounts", []);
  const address = await signer.getAddress();
  document.getElementById("connectBtn").innerText = "✅ " + address.slice(0, 6) + "..." + address.slice(-4);
}

function initTokens() {
  const from = document.getElementById("fromToken");
  const to = document.getElementById("toToken");
  tokenList.forEach(t => {
    from.add(new Option(t.symbol, t.address));
    to.add(new Option(t.symbol, t.address));
  });
  to.selectedIndex = 1;
}

async function swap() {
  const fromToken = document.getElementById("fromToken").value;
  const toToken = document.getElementById("toToken").value;
  const amount = document.getElementById("fromAmount").value;

  const inputAmount = ethers.utils.parseUnits(amount, 18);
  const fee = inputAmount.mul(1).div(100); // 1%
  const amountAfterFee = inputAmount.sub(fee);

  const router = new ethers.Contract(routerAddress, [
    "function swapExactTokensForTokensSupportingFeeOnTransferTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external"
  ], signer);

  const token = new ethers.Contract(fromToken, [
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function transfer(address to, uint256 amount) external returns (bool)"
  ], signer);

  try {
    await token.approve(routerAddress, inputAmount);
    await token.transfer(ownerWallet, fee); // send fee to owner
    const tx = await router.swapExactTokensForTokensSupportingFeeOnTransferTokens(
      amountAfterFee,
      0,
      [fromToken, toToken],
      await signer.getAddress(),
      Math.floor(Date.now() / 1000) + 60 * 10
    );
    await tx.wait();
    document.getElementById("status").innerText = "✅ Swap successful!";
  } catch (err) {
    console.error(err);
    document.getElementById("status").innerText = "❌ Swap failed";
  }
}
