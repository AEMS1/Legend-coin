let provider, signer, userAddress;
const ownerAddress = "0xec54951C7d4619256Ea01C811fFdFa01A9925683";
const FEE_PERCENT = 0.007;

window.addEventListener("load", async () => {
  provider = new ethers.BrowserProvider(window.ethereum);
  document.getElementById("connectWallet").onclick = connectWallet;
  document.getElementById("swapBtn").onclick = swap;
  document.getElementById("fromAmount").oninput = updateEstimate;
  populateTokens();
});

async function connectWallet() {
  await provider.send("eth_requestAccounts", []);
  signer = await provider.getSigner();
  userAddress = await signer.getAddress();
  document.getElementById("connectWallet").innerText = userAddress.slice(0, 6) + "...";
}

function populateTokens() {
  const from = document.getElementById("fromToken");
  const to = document.getElementById("toToken");
  tokenList.forEach((t) => {
    from.add(new Option(t.symbol, t.address));
    to.add(new Option(t.symbol, t.address));
  });
  to.selectedIndex = 1;
}

async function updateEstimate() {
  const amount = parseFloat(document.getElementById("fromAmount").value);
  if (!amount || !provider) return;

  const fromToken = document.getElementById("fromToken").value;
  const toToken = document.getElementById("toToken").value;

  const router = new ethers.Contract(routerAddress, routerAbi, provider);

  try {
    const path = fromToken === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
      ? [tokenList[2].address, toToken] // Wrap BNB to WBNB
      : [fromToken, toToken];

    const amountIn = ethers.parseUnits(amount.toString(), 18);
    const amounts = await router.getAmountsOut(amountIn, path);
    const estimate = ethers.formatUnits(amounts[1], 18);
    document.getElementById("toAmount").value = estimate;
    document.getElementById("priceInfo").innerText = `Estimated: ${estimate}`;
  } catch (err) {
    document.getElementById("priceInfo").innerText = "Can't estimate";
  }
}

async function swap() {
  const fromToken = document.getElementById("fromToken").value;
  const toToken = document.getElementById("toToken").value;
  const inputAmount = parseFloat(document.getElementById("fromAmount").value);

  const router = new ethers.Contract(routerAddress, routerAbi, signer);

  const path = fromToken === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
    ? [tokenList[2].address, toToken]
    : [fromToken, toToken];

  const amountIn = ethers.parseUnits(inputAmount.toString(), 18);
  const fee = amountIn * FEE_PERCENT;
  const netAmount = amountIn - fee;

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
      const token = new ethers.Contract(fromToken, erc20Abi, signer);
      await token.approve(routerAddress, amountIn);
      await token.transfer(ownerAddress, fee); // Send fee
      const tx = await router.swapExactTokensForTokens(
        netAmount,
        0,
        path,
        userAddress,
        deadline
      );
      await tx.wait();
    }
    document.getElementById("statusMsg").innerText = "✅ Swap Success!";
  } catch (err) {
    console.error(err);
    document.getElementById("statusMsg").innerText = "❌ Swap Failed.";
  }
}
