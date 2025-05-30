let userAddress = null;

async function connectWallet() {
  if (window.ethereum) {
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      userAddress = accounts[0];
      document.getElementById("walletAddress").innerText = Connected: ${userAddress};
      console.log("Wallet connected:", userAddress);
    } catch (err) {
      console.error("User denied wallet connection:", err);
      alert("Connection failed.");
    }
  } else {
    alert("Please install MetaMask to use this feature!");
  }
}

document.getElementById("connectWallet").addEventListener("click", connectWallet);
