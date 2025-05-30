// آدرس قرارداد شما
const CONTRACT_ADDRESS = "0x4751C0DE56EFB3770615097347cbF131D302498A"; // آدرس قرارداد LGDChessArena شما

let web3;
let contract;
let currentAccount = null;

window.addEventListener("load", async () => {
  if (window.ethereum) {
    web3 = new Web3(window.ethereum);
    document.getElementById("connectWallet").addEventListener("click", connectWallet);
    document.getElementById("startGame").addEventListener("click", startGame);
  } else {
    alert("Please install MetaMask!");
  }
});

async function connectWallet() {
  try {
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    currentAccount = accounts[0];
    document.getElementById("walletAddress").innerText = "🟢 " + currentAccount;
    document.getElementById("startGame").disabled = false;

    // اتصال به قرارداد
    contract = new web3.eth.Contract(abi, CONTRACT_ADDRESS);

    // بازی‌های فعال را بگیریم
    loadActiveGames();
  } catch (err) {
    console.error("Wallet connection error:", err);
  }
}

async function startGame() {
  const amount = web3.utils.toWei("250000", "ether"); // مقدار ورودی به توکن LGD با 18 رقم اعشار

  try {
    // ارسال توکن به قرارداد برای شروع بازی
    await contract.methods.startGame().send({
      from: currentAccount,
      value: 0 // چون توکنه، ارزش اتر نداره
    });

    alert("Game started! Waiting for opponent...");
    loadActiveGames();
  } catch (err) {
    console.error("Start game error:", err);
    alert("Error starting game");
  }
}

async function loadActiveGames() {
  try {
    const games = await contract.methods.getActiveGames().call();
    const list = document.getElementById("activeGamesList");
    list.innerHTML = "";

    games.forEach((gameId, index) => {
      const item = document.createElement("li");
      item.innerText = Game #${gameId};
      list.appendChild(item);
    });
  } catch (err) {
    console.error("Error loading games:", err);
  }
}
