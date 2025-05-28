let userAddress = null;
let lgdTokenAddress = "0x4751C0DE56EFB3770615097347cbF131D302498A";
let lgdAbi = []; // بعداً فایل contract.js ساخته میشه و ABI کامل اونجا قرار می‌گیره

// اتصال به متامسک
async function connectWallet() {
  if (window.ethereum) {
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      userAddress = accounts[0];
      document.getElementById("userAddress").innerText = "Your Wallet: " + userAddress;

      await loadBalance();
    } catch (error) {
      console.error("Connection Error:", error);
    }
  } else {
    alert("لطفاً MetaMask را نصب کنید.");
  }
}

// دریافت موجودی توکن LGD کاربر
async function loadBalance() {
  if (window.ethereum && userAddress) {
    const web3 = new Web3(window.ethereum);
    const contract = new web3.eth.Contract(lgdAbi, lgdTokenAddress);
    const balance = await contract.methods.balanceOf(userAddress).call();
    const decimals = await contract.methods.decimals().call();
    const formatted = parseFloat(balance / Math.pow(10, decimals)).toFixed(2);

    document.getElementById("lgdBalance").innerText = "LGD Balance: " + formatted;
  }
}

// هدایت به صفحات دیگر
function goTo(page) {
  window.location.href = page;
}