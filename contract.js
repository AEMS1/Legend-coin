// اتصال Web3
if (typeof window.ethereum !== "undefined") {
  window.web3 = new Web3(window.ethereum);
  window.ethereum.enable();
} else {
  alert("لطفاً کیف پول Web3 (مثل Metamask) نصب و فعال کنید.");
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