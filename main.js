let provider, signer, userAddress;
const routerAddress = "0x10ED43C718714eb63d5aA57B78B54704E256024E";

window.addEventListener("load", () => {
  loadTokens();
  document.getElementById("connectWallet").onclick = connectWallet;
  document.getElementById("swapButton").onclick = swapTokens;
});

function loadTokens() {
  const fromSelect = document.getElementById("fromToken");
  const toSelect = document.getElementById("toToken");
  tokens.forEach(t => {
    const option1 = document.createElement("option");
    const option2 = document.createElement("option");
    option1.value = t.address;
    option1.textContent = t.symbol;
    option2.value = t.address;
    option2.textContent = t.symbol;
    fromSelect.appendChild(option1);
    toSelect.appendChild(option2);
  });
}

async function connectWallet() {
  provider = new ethers.providers.Web3Provider(window.ethereum);
  await provider.send("eth_requestAccounts", []);
  signer = provider.getSigner();
  userAddress = await signer.getAddress();
  document.getElementById("walletAddress").textContent = userAddress;
}

async function swapTokens() {
  const from = document.getElementById("fromToken").value;
  const to = document.getElementById("toToken").value;
  const amountIn = document.getElementById("fromAmount").value;
  const router = new ethers.Contract(routerAddress, pancakeRouterAbi, signer);

  if (!amountIn || parseFloat(amountIn) <= 0) {
    alert("Enter a valid amount");
    return;
  }

  const path = [from, to];
  const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

  try {
    const amount = ethers.utils.parseUnits(amountIn, 18);
    if (from === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee") {
      await router.swapExactETHForTokensSupportingFeeOnTransferTokens(
        0,
        path,
        userAddress,
        deadline,
        { value: amount }
      );
    } else {
      const token = new ethers.Contract(from, ["function approve(address,uint256) public returns (bool)"], signer);
      await token.approve(routerAddress, amount);
      await router.swapExactTokensForTokensSupportingFeeOnTransferTokens(
        amount,
        0,
        path,
        userAddress,
        deadline
      );
    }
    document.getElementById("message").textContent = "✅ Swap successful!";
  } catch (e) {
    console.error(e);
    document.getElementById("message").textContent = "❌ Swap failed.";
  }
}