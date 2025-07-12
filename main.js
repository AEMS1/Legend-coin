let provider, signer, router, userAddress;
const FEE_PERCENT = 1;
const FEE_WALLET = "0xec54951C7d4619256Ea01C811fFdFa01A9925683";

async function connectWallet() {
  if (window.ethereum) {
    provider = new ethers.providers.Web3Provider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    signer = provider.getSigner();
    userAddress = await signer.getAddress();
    document.getElementById("walletAddress").textContent = userAddress;
    router = new ethers.Contract(routerAddress, routerAbi, signer);
  } else {
    alert("Install MetaMask!");
  }
}

document.getElementById("connectBtn").onclick = connectWallet;

window.onload = () => {
  const fromSelect = document.getElementById("fromToken");
  const toSelect = document.getElementById("toToken");
  tokenList.forEach(token => {
    const opt = new Option(token.symbol, token.address);
    fromSelect.add(opt.cloneNode(true));
    toSelect.add(opt.cloneNode(true));
  });
};

document.getElementById("fromAmount").oninput = async () => {
  const fromToken = document.getElementById("fromToken").value;
  const toToken = document.getElementById("toToken").value;
  const amount = parseFloat(document.getElementById("fromAmount").value || "0");
  if (amount > 0 && fromToken !== toToken) {
    try {
      const amountIn = ethers.utils.parseUnits(amount.toString(), 18);
      const amounts = await router.getAmountsOut(amountIn, [fromToken, toToken]);
      const rawOut = amounts[1];
      const fee = rawOut.mul(FEE_PERCENT).div(100);
      const amountOut = rawOut.sub(fee);
      document.getElementById("toAmount").value = ethers.utils.formatUnits(amountOut, 18);
      document.getElementById("priceInfo").textContent = `1 ${getSymbol(fromToken)} ≈ ${ethers.utils.formatUnits(amounts[1].mul(1e18).div(amountIn), 18)} ${getSymbol(toToken)}`;
      document.getElementById("feeInfo").textContent = `1% fee to: ${FEE_WALLET.slice(0, 6)}...${FEE_WALLET.slice(-4)}`;
    } catch (e) {
      document.getElementById("toAmount").value = "";
      document.getElementById("priceInfo").textContent = "Error getting quote";
    }
  }
};

function getSymbol(address) {
  const token = tokenList.find(t => t.address === address);
  return token ? token.symbol : "";
}

document.getElementById("swapBtn").onclick = async () => {
  const fromToken = document.getElementById("fromToken").value;
  const toToken = document.getElementById("toToken").value;
  const amount = parseFloat(document.getElementById("fromAmount").value || "0");
  if (!userAddress || amount <= 0) return alert("Invalid input or wallet not connected");

  const path = [fromToken, toToken];
  const amountIn = ethers.utils.parseUnits(amount.toString(), 18);
  const deadline = Math.floor(Date.now() / 1000) + 60 * 10;

  try {
    if (fromToken === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee") {
      const tx = await router.swapExactETHForTokens(
        0,
        path,
        userAddress,
        deadline,
        { value: amountIn }
      );
      await tx.wait();
    } else {
      const tokenContract = new ethers.Contract(fromToken, erc20Abi, signer);
      const allowance = await tokenContract.allowance(userAddress, routerAddress);
      if (allowance.lt(amountIn)) {
        await tokenContract.approve(routerAddress, amountIn);
      }
      const tx = await router.swapExactTokensForTokens(
        amountIn,
        0,
        path,
        userAddress,
        deadline
      );
      await tx.wait();
    }
    document.getElementById("txStatus").textContent = "✅ Swap successful!";
  } catch (err) {
    console.error(err);
    document.getElementById("txStatus").textContent = "❌ Swap failed.";
  }
};
