// اتصال Web3
async function connectWallet() {
  if (typeof window.ethereum !== 'undefined') {
    try {
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      window.web3 = new Web3(window.ethereum);
      const accounts = await web3.eth.getAccounts();
      const userAddress = accounts[0];
      console.log("Wallet connected:", userAddress);
      document.getElementById("walletAddress").innerText = Wallet: ${userAddress};
    } catch (err) {
      console.error("User denied access", err);
      alert("اتصال رد شد. لطفاً اجازه اتصال بدهید.");
    }
  } else {
    alert("MetaMask نصب نشده است. لطفاً نصب کنید.");
  }
}

// آدرس قرارداد توکن LGD روی شبکه BNB
const tokenAddress = "0x4751C0DE56EFB3770615097347cbF131D302498A";

// ABI ساده‌شده ERC20 برای عملیات transfer
const tokenABI = [
  {
    constant: false,
    inputs: [
      { name: "_to", type: "address" },
      { name: "_value", type: "uint256" }
    ],
    name: "transfer",
    outputs: [{ name: "success", type: "bool" }],
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    type: "function"
  },
  {
    constant: true,
    inputs: [{ name: "_owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "balance", type: "uint256" }],
    type: "function"
  }
];
