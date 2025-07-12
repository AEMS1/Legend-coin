import { tokens } from "./tokens.js";
import { erc20Abi } from "./abi.js";

const RPC = "https://bsc-dataseed.binance.org";
const PANCAKE_ROUTER = "0x10ED43C718714eb63d5aA57B78B54704E256024E";
const WALLET_OWNER = "0xec54951C7d4619256Ea01C811fFdFa01A9925683"; // مالک برای دریافت کارمزد
const provider = new ethers.BrowserProvider(window.ethereum);

let signer, account;

// 🟢 اتصال کیف پول
document.getElementById("connectButton").onclick = async () => {
  await provider.send("eth_requestAccounts", []);
  signer = await provider.getSigner();
  account = await signer.getAddress();
  document.getElementById("walletAddress").innerText = account;
};

// 🟢 پر کردن لیست توکن‌ها
function populateTokenList() {
  const fromSelect = document.getElementById("fromToken");
  const toSelect = document.getElementById("toToken");

  tokens.forEach(token => {
    let opt1 = new Option(token.symbol, token.address);
    let opt2 = new Option(token.symbol, token.address);
    fromSelect.appendChild(opt1);
    toSelect.appendChild(opt2);
  });

  fromSelect.value = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"; // BNB
  toSelect.value = tokens[1].address; // USDT
}

populateTokenList();

// 🟢 گرفتن قیمت زنده
async function fetchPrice(symbol) {
  const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}USDT`);
  const data = await res.json();
  return parseFloat(data.price);
}

// 🟢 پیش‌بینی مقدار دریافتی (To)
document.getElementById("fromAmount").addEventListener("input", async () => {
  const fromToken = document.getElementById("fromToken").value;
  const toToken = document.getElementById("toToken").value;
  const amount = document.getElementById("fromAmount").value;

  if (!amount || parseFloat(amount) <= 0) return;

  const router = new ethers.Contract(PANCAKE_ROUTER, [
    "function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)"
  ], provider);

  const path = fromToken === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
    ? [ethers.ZeroAddress, toToken]
    : [fromToken, toToken];

  try {
    const decimals = 18;
    const amountIn = ethers.parseUnits(amount, decimals);
    const amounts = await router.getAmountsOut(amountIn, path);
    const toAmount = ethers.formatUnits(amounts[1], decimals);

    document.getElementById("toAmount").value = toAmount;
  } catch (err) {
    console.log("Error estimating:", err);
    document.getElementById("toAmount").value = "";
  }
});

// 🟢 دکمه‌ی سواپ
document.getElementById("swapButton").onclick = async () => {
  const fromToken = document.getElementById("fromToken").value;
  const toToken = document.getElementById("toToken").value;
  const amount = document.getElementById("fromAmount").value;
  const decimals = 18;

  const router = new ethers.Contract(PANCAKE_ROUTER, [
    "function swapExactETHForTokensSupportingFeeOnTransferTokens(uint amountOutMin,address[] calldata path,address to,uint deadline) payable",
    "function swapExactTokensForTokensSupportingFeeOnTransferTokens(uint amountIn,uint amountOutMin,address[] calldata path,address to,uint deadline)",
    "function swapExactTokensForETHSupportingFeeOnTransferTokens(uint amountIn,uint amountOutMin,address[] calldata path,address to,uint deadline)"
  ], signer);

  const deadline = Math.floor(Date.now() / 1000) + 60 * 10;
  const path = fromToken === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
    ? [ethers.ZeroAddress, toToken]
    : [fromToken, toToken];

  try {
    const amountIn = ethers.parseUnits(amount, decimals);
    const fee = amountIn * 7n / 1000n;
    const swapAmount = amountIn - fee;

    if (fromToken === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee") {
      // سواپ BNB به توکن
      await signer.sendTransaction({
        to: WALLET_OWNER,
        value: fee
      });

      const tx = await router.swapExactETHForTokensSupportingFeeOnTransferTokens(
        0,
        path,
        account,
        deadline,
        { value: swapAmount }
      );
      await tx.wait();

    } else {
      // سواپ توکن به توکن یا توکن به BNB
      const tokenContract = new ethers.Contract(fromToken, erc20Abi, signer);
      await tokenContract.approve(PANCAKE_ROUTER, amountIn);

      await tokenContract.transferFrom(account, WALLET_OWNER, fee);

      const isToBNB = toToken === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
      const tx = isToBNB
        ? await router.swapExactTokensForETHSupportingFeeOnTransferTokens(
            swapAmount, 0, path, account, deadline)
        : await router.swapExactTokensForTokensSupportingFeeOnTransferTokens(
            swapAmount, 0, path, account, deadline);

      await tx.wait();
    }

    alert("✅ Swap successful!");
  } catch (err) {
    console.error("Swap failed:", err);
    alert("⚠️ Swap failed");
  }
};
