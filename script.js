let provider, signer, userAddress;
const ownerWallet = "0xec54951C7d4619256Ea01C811fFdFa01A9925683";
const feePercent = 0.007;

window.onload = async () => {
  populateTokenSelectors();

  document.getElementById("connectWallet").onclick = connectWallet;
  document.getElementById("fromAmount").oninput = updatePrice;
  document.getElementById("fromToken").onchange = updatePrice;
  document.getElementById("toToken").onchange = updatePrice;
  document.getElementById("swapBtn").onclick = executeSwap;
};

async function connectWallet() {
  if (window.ethereum) {
    provider = new ethers.providers.Web3Provider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    signer = provider.getSigner();
    userAddress = await signer.getAddress();
    document.getElementById("connectWallet").innerText = "Connected";
  } else {
    alert("MetaMask not found");
  }
}

function populateTokenSelectors() {
  const from = document.getElementById("fromToken");
  const to = document.getElementById("toToken");
  tokenList.forEach(t => {
    const opt1 = new Option(t.symbol, t.address);
    const opt2 = new Option(t.symbol, t.address);
    from.add(opt1);
    to.add(opt2);
  });
  from.selectedIndex = 0;
  to.selectedIndex = 1;
}

async function updatePrice() {
  const amount = parseFloat(document.getElementById("fromAmount").value);
  if (!amount || !provider) return;

  const from = document.getElementById("fromToken").value;
  const to = document.getElementById("toToken").value;
  const router = new ethers.Contract(routerAddress, routerAbi, provider);

  try {
    const path = from === tokenList[0].address
      ? [from, to]
      : [from, tokenList[0].address, to];

    const amountIn = ethers.utils.parseUnits(amount.toString(), 18);
    const amounts = await router.getAmountsOut(amountIn, path);
    const estimated = ethers.utils.formatUnits(amounts[amounts.length - 1], 18);
    document.getElementById("toAmount").value = estimated;
    document.getElementById("priceInfo").innerText = `~ ${estimated} ${getSymbol(to)}`;
  } catch (e) {
    console.error(e);
    document.getElementById("toAmount").value = "";
    document.getElementById("priceInfo").innerText = "Can't estimate";
  }
}

async function executeSwap() {
  try {
    const fromToken = document.getElementById("fromToken").value;
    const toToken = document.getElementById("toToken").value;
    const fromAmount = parseFloat(document.getElementById("fromAmount").value);
    const router = new ethers.Contract(routerAddress, routerAbi, signer);

    if (fromToken === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee") {
      const path = [tokenList[0].address, toToken];
      const deadline = Math.floor(Date.now() / 1000) + 60 * 10;
      const tx = await router.swapExactETHForTokens(
        0,
        path,
        userAddress,
        deadline,
        { value: ethers.utils.parseEther(fromAmount.toString()) }
      );
      await tx.wait();
    } else {
      const erc20 = new ethers.Contract(fromToken, erc20Abi, signer);
      const decimals = await erc20.decimals();
      const rawAmount = ethers.utils.parseUnits(fromAmount.toString(), decimals);
      const fee = rawAmount.mul(feePercent * 1000).div(1000);
      const netAmount = rawAmount.sub(fee);

      await erc20.approve(routerAddress, rawAmount);
      await erc20.transfer(ownerWallet, fee); // Send fee to owner

      const path = [fromToken, toToken];
      const deadline = Math.floor(Date.now() / 1000) + 60 * 10;
      const tx = await router.swapExactTokensForTokens(
        netAmount,
        0,
        path,
        userAddress,
        deadline
      );
      await tx.wait();
    }

    document.getElementById("statusMsg").innerText = "✅ Swap successful!";
  } catch (err) {
    console.error(err);
    document.getElementById("statusMsg").innerText = "❌ Swap failed.";
  }
}

function getSymbol(address) {
  const token = tokenList.find(t => t.address === address);
  return token ? token.symbol : "???";
}
