const pancakeRouterABI = [
  {
    "name": "getAmountsOut",
    "type": "function",
    "stateMutability": "view",
    "inputs": [
      { "name": "amountIn", "type": "uint256" },
      { "name": "path", "type": "address[]" }
    ],
    "outputs": [
      { "name": "amounts", "type": "uint256[]" }
    ]
  },
  {
    "name": "swapExactTokensForTokens",
    "type": "function",
    "stateMutability": "nonpayable",
    "inputs": [
      { "name": "amountIn", "type": "uint256" },
      { "name": "amountOutMin", "type": "uint256" },
      { "name": "path", "type": "address[]" },
      { "name": "to", "type": "address" },
      { "name": "deadline", "type": "uint256" }
    ],
    "outputs": [
      { "name": "amounts", "type": "uint256[]" }
    ]
  },
  {
    "name": "swapExactETHForTokens",
    "type": "function",
    "stateMutability": "payable",
    "inputs": [
      { "name": "amountOutMin", "type": "uint256" },
      { "name": "path", "type": "address[]" },
      { "name": "to", "type": "address" },
      { "name": "deadline", "type": "uint256" }
    ],
    "outputs": [
      { "name": "amounts", "type": "uint256[]" }
    ]
  },
  {
    "name": "swapExactTokensForETH",
    "type": "function",
    "stateMutability": "nonpayable",
    "inputs": [
      { "name": "amountIn", "type": "uint256" },
      { "name": "amountOutMin", "type": "uint256" },
      { "name": "path", "type": "address[]" },
      { "name": "to", "type": "address" },
      { "name": "deadline", "type": "uint256" }
    ],
    "outputs": [
      { "name": "amounts", "type": "uint256[]" }
    ]
  }
];
const erc20ABI = [
  // فقط متد approve برای کار ما کافیه
  {
    "constant": false,
    "inputs": [
      { "name": "_spender", "type": "address" },
      { "name": "_value", "type": "uint256" }
    ],
    "name": "approve",
    "outputs": [{ "name": "", "type": "bool" }],
    "type": "function"
  }
];
