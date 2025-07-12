let provider, signer, userAddress;
const PANCAKE_ROUTER = '0x10ED43C718714eb63d5aA57B78B54704E256024E';
const OWNER = '0xec54951C7d4619256Ea01C811fFdFa01A9925683'; // 1% fee

async function connectWallet() {
  if (window.ethereum) {
    provider = new ethers.BrowserProvider(window.ethereum);
    signer = await provider.getSigner();
    userAddress = await signer.getAddress();
    document.getElementById('connectBtn').innerText = userAddress.slice(0, 6) + '...' + userAddress.slice(-4);
  } else {
    alert('Install MetaMask!');
  }
}

document.getElementById('connectBtn').onclick = connectWallet;

function populateTokens() {
  const from = document.getElementById('fromToken');
  const to = document.getElementById('toToken');
  tokenList.forEach(token => {
    const option1 = new Option(token.symbol, token.address);
    const option2 = new Option(token.symbol, token.address);
    from.add(option1);
    to.add(option2);
  });
  to.selectedIndex = 1;
}

populateTokens();

document.getElementById('fromAmount').oninput = async () => {
  const fromToken = document.getElementById('fromToken').value;
  const toToken = document.getElementById('toToken').value;
  const amount = document.getElementById('fromAmount').value;
  if (!amount || !fromToken || !toToken || fromToken === toToken) return;

  try {
    const router = new ethers.Contract(PANCAKE_ROUTER, pancakeRouterAbi, provider);
    const path = fromToken === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
      ? [tokenList[8].address, toToken]
      : toToken === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
      ? [fromToken, tokenList[8].address]
      : [fromToken, toToken];

    const amounts = await router.getAmountsOut(ethers.parseUnits(amount, 18), path);
    const outAmount = ethers.formatUnits(amounts[amounts.length - 1], 18);

    const receive = parseFloat(outAmount * 0.99).toFixed(6); // minus 1% fee
    document.getElementById('toAmount').value = receive;
    document.getElementById('priceInfo').innerText = `1 ${tokenList.find(t => t.address === fromToken)?.symbol} = ${(receive / amount).toFixed(6)} ${tokenList.find(t => t.address === toToken)?.symbol}`;
    document.getElementById('receiveInfo').innerText = `You will receive: ${receive}`;
  } catch (e) {
    document.getElementById('toAmount').value = 'Error';
    console.error(e);
  }
};

document.getElementById('swapBtn').onclick = async () => {
  const fromToken = document.getElementById('fromToken').value;
  const toToken = document.getElementById('toToken').value;
  const amount = document.getElementById('fromAmount').value;

  if (!amount || !signer) return alert('Connect wallet');

  const router = new ethers.Contract(PANCAKE_ROUTER, pancakeRouterAbi, signer);
  const deadline = Math.floor(Date.now() / 1000) + 1800;
  const path = fromToken === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
    ? [tokenList[8].address, toToken]
    : toToken === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
    ? [fromToken, tokenList[8].address]
    : [fromToken, toToken];

  const amountIn = ethers.parseUnits(amount, 18);
  const amounts = await router.getAmountsOut(amountIn, path);
  const minOut = amounts[amounts.length - 1] * 99n / 100n;

  try {
    if (fromToken === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') {
      await router.swapExactETHForTokensSupportingFeeOnTransferTokens(
        minOut,
        path,
        userAddress,
        deadline,
        { value: amountIn }
      );
    } else {
      const fromERC20 = new ethers.Contract(fromToken, erc20Abi, signer);
      const allowance = await fromERC20.allowance(userAddress, PANCAKE_ROUTER);
      if (allowance < amountIn) {
        await fromERC20.approve(PANCAKE_ROUTER, amountIn);
      }

      await router.swapExactTokensForTokensSupportingFeeOnTransferTokens(
        amountIn,
        minOut,
        path,
        userAddress,
        deadline
      );
    }

    // 🔁 Send 1% fee manually
    const feeToken = new ethers.Contract(toToken, erc20Abi, signer);
    const outAmount = ethers.formatUnits(amounts[amounts.length - 1], 18);
    const fee = (parseFloat(outAmount) * 0.01).toFixed(6);
    await feeToken.transfer(OWNER, ethers.parseUnits(fee, 18));

    alert(`Swap successful! Fee sent: ${fee}`);
  } catch (err) {
    console.error(err);
    alert("Swap failed");
  }
};
