let web3;
let router;
let userAddress = null;

const owner = "0xec54951C7d4619256Ea01C811fFdFa01A9925683";
const routerAddress = "0x10ED43C718714eb63d5aA57B78B54704E256024E";
const WBNB = "0xBB4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";

window.addEventListener("load", () => {
  // دکمه‌ها و فرم تا اتصال غیرفعال است
  disableUI(true);
});

async function connectWallet() {
  if (window.ethereum) {
    try {
      await window.ethereum.request({ method: "eth_requestAccounts" });
      web3 = new Web3(window.ethereum);
      const accounts = await web3.eth.getAccounts();
      userAddress = accounts[0];

      document.getElementById("walletAddress").innerText = "Connected: " + userAddress;
      document.getElementById("connectButton").innerText = "🔌 Wallet Connected";

      router = new web3.eth.Contract(pancakeRouterABI, routerAddress);

      // پر کردن لیست توکن‌ها و فعال‌سازی فرم
      fillTokenOptions();
      disableUI(false);
      updatePriceInfo();

      // رویداد تغییر برای بروزرسانی قیمت
      document.getElementById("fromToken").addEventListener("change", updatePriceInfo);
      document.getElementById("toToken").addEventListener("change", updatePriceInfo);
      document.getElementById("amount").addEventListener("input", updatePriceInfo);

      // گوش دادن به تغییر شبکه یا حساب متامسک
      window.ethereum.on('accountsChanged', (accounts) => {
        userAddress = accounts[0] || null;
        if (userAddress) {
          document.getElementById("walletAddress").innerText = "Connected: " + userAddress;
        } else {
          document.getElementById("walletAddress").innerText = "";
          disableUI(true);
        }
      });

      window.ethereum.on('chainChanged', (chainId) => {
        window.location.reload();
      });

    } catch (error) {
      alert("اتصال کیف پول لغو شد یا خطا رخ داد.");
    }
  } else {
    alert("لطفاً افزونه متامسک را نصب کنید.");
  }
}

function disableUI(disabled) {
  document.getElementById("fromToken").disabled = disabled;
  document.getElementById("toToken").disabled = disabled;
  document.getElementById("amount").disabled = disabled;
  document.getElementById("swapButton").disabled = disabled;
  document.getElementById("reverseButton").disabled = disabled;
}

function fillTokenOptions() {
  ["fromToken", "toToken"].forEach(selectId => {
    const select = document.getElementById(selectId);
    select.innerHTML = ""; // پاک کردن قبلی

    tokens.forEach(token => {
      const option = document.createElement("option");
      option.value = token.address;
      option.text = token.symbol;
      select.appendChild(option);
    });
  });
}

// بقیه توابع (updatePriceInfo, swapTokens, reverseTokens) بدون تغییر هستند.
// فقط توابع قبلی رو به‌روزرسانی کن که از userAddress به جای web3.eth.getAccounts استفاده کنن.

async function updatePriceInfo() {
  if (!userAddress) return;

  const from = document.getElementById("fromToken").value;
  const to = document.getElementById("toToken").value;
  const amount = parseFloat(document.getElementById("amount").value);

  if (!amount || amount <= 0 || from === to) {
    document.getElementById("priceInfo").innerText = "-";
    document.getElementById("minReceived").innerText = "-";
    return;
  }

  try {
    const amountInWei = web3.utils.toWei(amount.toString(), "ether");
    const path = getPath(from, to);

    const amountsOut = await router.methods.getAmountsOut(amountInWei, path).call();
    const decimalsOut = getTokenDecimals(to);
    const amountOut = amountsOut[amountsOut.length - 1];
    const amountOutFormatted = formatAmount(amountOut, decimalsOut);

    document.getElementById("priceInfo").innerText = `${amountOutFormatted} ${getTokenSymbol(to)}`;

    const slippagePercent = 1;
    const minReceived = amountOut * (1 - slippagePercent / 100);
    const minReceivedFormatted = formatAmount(minReceived.toString(), decimalsOut);
    document.getElementById("minReceived").innerText = `${minReceivedFormatted} ${getTokenSymbol(to)}`;
  } catch (e) {
    document.getElementById("priceInfo").innerText = "خطا در دریافت قیمت";
    document.getElementById("minReceived").innerText = "-";
  }
}

async function swapTokens() {
  if (!userAddress) {
    alert("ابتدا کیف پول خود را وصل کنید.");
    return;
  }

  const from = document.getElementById("fromToken").value;
  const to = document.getElementById("toToken").value;
  const amount = document.getElementById("amount").value;

  if (!amount || parseFloat(amount) <= 0) {
    alert("لطفاً مقدار معتبر وارد کنید.");
    return;
  }

  if (from === to) {
    alert("توکن مبدا و مقصد نباید یکی باشند.");
    return;
  }

  const amountInWei = web3.utils.toWei(amount, "ether");
  const fee = web3.utils.toBN(amountInWei).mul(web3.utils.toBN(6)).div(web3.utils.toBN(1000));
  const netAmount = web3.utils.toBN(amountInWei).sub(fee);

  const deadline = Math.floor(Date.now() / 1000) + 60 * 10;

  document.getElementById("status").innerText = "⏳ در حال انجام تراکنش... لطفاً صبر کنید.";

  try {
    await web3.eth.sendTransaction({ from: userAddress, to: owner, value: fee.toString() });

    if (from === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee") {
      const path = [WBNB, to];
      await router.methods.swapExactETHForTokens(0, path, userAddress, deadline).send({
        from: userAddress,
        value: netAmount.toString()
      });
    } else if (to === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee") {
      const tokenContract = new web3.eth.Contract(erc20ABI, from);
      await tokenContract.methods.approve(routerAddress, amountInWei).send({ from: userAddress });

      const path = [from, WBNB];
      await router.methods.swapExactTokensForETH(netAmount.toString(), 0, path, userAddress, deadline).send({ from: userAddress });
    } else {
      const tokenContract = new web3.eth.Contract(erc20ABI, from);
      await tokenContract.methods.approve(routerAddress, amountInWei).send({ from: userAddress });

      const path = [from, to];
      await router.methods.swapExactTokensForTokens(netAmount.toString(), 0, path, userAddress, deadline).send({ from: userAddress });
    }

    document.getElementById("status").innerText = "✅ سواپ با موفقیت انجام شد!";
  } catch (error) {
    console.error(error);
    document.getElementById("status").innerText = "❌ خطا در انجام سواپ.";
  }
}

function reverseTokens() {
  const fromSelect = document.getElementById("fromToken");
  const toSelect = document.getElementById("toToken");

  const temp = fromSelect.value;
  fromSelect.value = toSelect.value;
  toSelect.value = temp;

  updatePriceInfo();
}

const erc20ABI = [
  {
    constant: false,
    inputs: [
      { name: "_spender", type: "address" },
      { name: "_value", type: "uint256" }
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    type: "function"
  }
];
