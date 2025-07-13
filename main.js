let web3, router, userAddress = null;

const routerAddress = "0x10ED43C718714eb63d5aA57B78B54704E256024E"; // PancakeSwap
const owner = "0xec54951C7d4619256Ea01C811fFdFa01A9925683"; // مالک
const WBNB = "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c";

// 🔧 کارمزد ثابت قابل ویرایش (بر حسب BNB)
const FIXED_FEE_BNB = 0.00008;

window.addEventListener("load", () => disableUI(true));

async function connectWallet() {
  if (!window.ethereum) return alert("Metamask نصب نیست.");
  await window.ethereum.request({ method: "eth_requestAccounts" });
  web3 = new Web3(window.ethereum);
  const accounts = await web3.eth.getAccounts();
  userAddress = accounts[0];
  router = new web3.eth.Contract(pancakeRouterABI, routerAddress);

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

async function updatePriceInfo() {
  const from = document.getElementById("fromToken").value;
  const to = document.getElementById("toToken").value;
  const amount = parseFloat(document.getElementById("amount").value);
  if (!amount || from === to) {
    document.getElementById("priceInfo").innerText = "-";
    return;
  }

  try {
    const path = getSwapPath(from, to);
    const inWei = web3.utils.toWei(amount.toString(), "ether");
    const amounts = await router.methods.getAmountsOut(inWei, path).call();
    const outAmount = parseFloat(web3.utils.fromWei(amounts[amounts.length - 1], "ether"));
    document.getElementById("priceInfo").innerText = `${outAmount.toFixed(6)} ${getSymbol(to)}`;
  } catch (err) {
    console.warn("⚠️ خطا در تخمین:", err.message);
    document.getElementById("priceInfo").innerText = "❌";
  }
}

function getSwapPath(from, to) {
  if (from === WBNB || to === WBNB) {
    return [from, to];
  } else {
    return [from, WBNB, to]; // مسیر از طریق BNB
  }
}

function reverseTokens() {
  const f = document.getElementById("fromToken");
  const t = document.getElementById("toToken");
  [f.value, t.value] = [t.value, f.value];
  updatePriceInfo();
}

async function swapTokens() {
  if (!userAddress) return alert("کیف پول متصل نیست.");

  const from = document.getElementById("fromToken").value;
  const to = document.getElementById("toToken").value;
  const amount = parseFloat(document.getElementById("amount").value);
  if (!amount || from === to) return alert("ورودی نامعتبر است.");

  const path = getSwapPath(from, to);
  const inWei = web3.utils.toWei(amount.toString(), "ether");
  const feeWei = web3.utils.toWei(FIXED_FEE_BNB.toString(), "ether");

  try {
    document.getElementById("status").innerText = "💰 پرداخت کارمزد...";

    await web3.eth.sendTransaction({
      from: userAddress,
      to: owner,
      value: feeWei
    });

    document.getElementById("status").innerText = "✅ کارمزد پرداخت شد";

    if (from !== WBNB) {
      const token = new web3.eth.Contract(erc20ABI, from);
      document.getElementById("status").innerText = "🔒 تایید توکن...";
      await token.methods.approve(routerAddress, inWei).send({ from: userAddress });
    }

    document.getElementById("status").innerText = "🔁 در حال سواپ...";

    await router.methods.swapExactTokensForTokens(
      inWei,
      0,
      path,
      userAddress,
      Math.floor(Date.now() / 1000) + 600
    ).send({ from: userAddress });

    document.getElementById("status").innerText = "✅ سواپ موفق!";
  } catch (err) {
    console.error("Swap error:", err);
    document.getElementById("status").innerText = "❌ خطا در سواپ!";
  }
}
