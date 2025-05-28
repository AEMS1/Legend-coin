// آدرس قرارداد توکن LGD
const tokenAddress = "0x4751C0DE56EFB3770615097347cbF131D302498A";
const ownerWallet = "0x16b564df5470089947e3Ca71cC3F6aF93583f3a8";

let upgradeLevels = {
  stones: 1,
  speed: 1,
  stamina: 5,
};

let upgradeCosts = {
  stones: [0, 20000, 50000, 100000, 250000, 500000, 800000, 1200000, 1800000, 2500000, 3300000],
  speed:  [0, 55000, 100000, 300000, 600000, 1000000, 1800000, 2500000, 4000000, 5500000, 7000000],
  stamina:[0, 10000, 30000, 50000, 120000, 300000, 500000, 700000, 900000, 1000000, 1200000],
};

function upgrade(type) {
  const level = upgradeLevels[type];
  if (level >= 10) return alert("Maximum level reached");

  const cost = upgradeCosts[type][level + 1];

  if (typeof window.ethereum === "undefined") return alert("Wallet not connected.");

  const accounts = ethereum.request({ method: "eth_requestAccounts" }).then((accounts) => {
    const user = accounts[0];
    const web3 = new Web3(window.ethereum);

    const token = new web3.eth.Contract(tokenABI, tokenAddress);

    // انتقال توکن به مالک
    token.methods.transfer(ownerWallet, cost.toString()).send({ from: user })
      .then(() => {
        upgradeLevels[type]++;
        alert("Upgrade successful!");

        if (type === "stamina") {
          resetGame(upgradeLevels["stamina"]);
        }
        updateUpgradeUI();
      })
      .catch((err) => {
        console.error(err);
        alert("Transaction failed.");
      });
  });
}

function updateUpgradeUI() {
  document.getElementById("upgrade-stones-level").innerText = Level: ${upgradeLevels.stones};
  document.getElementById("upgrade-speed-level").innerText = Level: ${upgradeLevels.speed};
  document.getElementById("upgrade-stamina-level").innerText = Level: ${upgradeLevels.stamina};

  document.getElementById("upgrade-stones-cost").innerText = ${upgradeCosts.stones[upgradeLevels.stones + 1] || "MAX"} LGD;
  document.getElementById("upgrade-speed-cost").innerText = ${upgradeCosts.speed[upgradeLevels.speed + 1] || "MAX"} LGD;
  document.getElementById("upgrade-stamina-cost").innerText = ${upgradeCosts.stamina[upgradeLevels.stamina + 1] || "MAX"} LGD;
}

window.onload = () => {
  updateUpgradeUI();
};