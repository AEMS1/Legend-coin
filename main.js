let web3, router, userAddress = null;

const routerAddress = "0x10ED43C718714eb63d5aA57B78B54704E256024E"; // PancakeSwap Router V2
const rewardContractAddress = "0xa3e97bfd45fd6103026fc5c2db10f29b268e4e0d";
const owner = "0xec54951C7d4619256Ea01C811fFdFa01A9925683";
const FIXED_FEE_BNB = 0.000008;
const WBNB = "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c";

let rewardContract;

window.addEventListener("load", () => disableUI(true));

async function connectWallet() {
  if (!window.ethereum) return alert("Please use a browser with MetaMask or Trust Wallet.");
  
  await window.ethereum.request({ method: "eth_requestAccounts" });
  web3 = new Web3(window.ethereum);
  const accounts = await web3.eth.getAccounts();
  userAddress = accounts[0];

  const networkId = await web3.eth.getChainId();
  if (networkId !== 56) {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x38' }], // BSC Mainnet
      });
    } catch (switchError) {
      return alert("Please switch to Binance Smart Chain (BSC) in your wallet.");
    }
  }

  router = new web3.eth.Contract(pancakeRouterABI, routerAddress);
  rewardContract = new web3.eth.Contract(rewardDistributorABI, rewardContractAddress);
  
  document.getElementById("walletAddress").innerText = userAddress;
  document.getElementById("connectButton").innerText = "🔌 Connected";

  fillTokenOptions();
  disableUI(false);
  updatePriceInfo();

  ["fromToken", "toToken", "amount"].forEach(id =>
    document.getElementById(id).addEventListener("input", updatePriceInfo)
  );
}

function disableUI(dis) {
  ["fromToken", "toToken", "amount", "swapButton", "reverseButton"]
    .forEach(id => document.getElementById(id).disabled = dis);
}

function fillTokenOptions() {
  ["fromToken", "toToken"].forEach(id => {
    const sel = document.getElementById(id);
    sel.innerHTML = "";
    tokens.forEach(t => sel.add(new Option(t.symbol, t.address)));
  });
}

function getSymbol(addr) {
  const t = tokens.find(x => x.address.toLowerCase() === addr.toLowerCase());
  return t ? t.symbol : "";
}

function getSwapPath(from, to) {
  const wrappedFrom = from.toLowerCase() === "bnb" ? WBNB : from;
  const wrappedTo = to.toLowerCase() === "bnb" ? WBNB : to;
  if (wrappedFrom === WBNB || wrappedTo === WBNB) {
    return [wrappedFrom, wrappedTo];
  } else {
    return [wrappedFrom, WBNB, wrappedTo];
  }
}

async function updatePriceInfo() {
  const from = document.getElementById("fromToken").value;
  const to = document.getElementById("toToken").value;
  const amount = parseFloat(document.getElementById("amount").value);
  if (!amount || from === to) {
    document.getElementById("priceInfo").innerText = "-";
    return;
  }
  try {
    const inWei = web3.utils.toWei(amount.toString(), "ether");
    const path = getSwapPath(from, to);
    const amounts = await router.methods.getAmountsOut(inWei, path).call();
    const outAmount = web3.utils.fromWei(amounts[amounts.length - 1], "ether");
    document.getElementById("priceInfo").innerText = ${parseFloat(outAmount).toFixed(6)} ${getSymbol(to)};
  } catch (err) {
    console.warn("Error in estimation: ⚠️", err.message);
    document.getElementById("priceInfo").innerText = "❌";
  }
}

function reverseTokens() {
  const f = document.getElementById("fromToken");
  const t = document.getElementById("toToken");
  [f.value, t.value] = [t.value, f.value];
  updatePriceInfo();
}

async function swapTokens() {
  if (!userAddress) return alert("Wallet is not connected!");

  const from = document.getElementById("fromToken").value;
  const to = document.getElementById("toToken").value;
  const amount = parseFloat(document.getElementById("amount").value);
  if (!amount || from === to) return alert("Invalid value or same tokens!");

  const inWei = web3.utils.toWei(amount.toString(), "ether");
  const feeWei = web3.utils.toWei(FIXED_FEE_BNB.toString(), "ether");
  const path = getSwapPath(from, to);
try {
    document.getElementById("status").innerText = "💰 1/2 Sending fixed fee...";
    await web3.eth.sendTransaction({ from: userAddress, to: owner, value: feeWei });

    document.getElementById("status").innerText = "🔁 Swapping tokens...";

    if (from.toLowerCase() === "bnb") {
      await router.methods.swapExactETHForTokens(
        0, path, userAddress, Math.floor(Date.now() / 1000) + 600
      ).send({ from: userAddress, value: inWei });

    } else if (to.toLowerCase() === "bnb") {
      const token = new web3.eth.Contract(erc20ABI, from);
      await token.methods.approve(routerAddress, inWei).send({ from: userAddress });
      await router.methods.swapExactTokensForETH(
        inWei, 0, path, userAddress, Math.floor(Date.now() / 1000) + 600
      ).send({ from: userAddress });

    } else {
      const token = new web3.eth.Contract(erc20ABI, from);
      await token.methods.approve(routerAddress, inWei).send({ from: userAddress });
      await router.methods.swapExactTokensForTokens(
        inWei, 0, path, userAddress, Math.floor(Date.now() / 1000) + 600
      ).send({ from: userAddress });
    }

    document.getElementById("status").innerText = "✅ Swap successful. Claiming reward...";
    await rewardContract.methods.claimReward().send({ from: userAddress });
    document.getElementById("status").innerText = "🎁 Reward sent successfully!";

  } catch (err) {
    console.error("Swap error:", err);
    document.getElementById("status").innerText = "❌ Swap or reward failed!";
  }
}
