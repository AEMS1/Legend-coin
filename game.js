let gridSize = 4;
let maxStamina = 5;
let remainingStamina = maxStamina;
let totalReward = 0;
let mined = 0;
let blocks = [];
let scoreBlocks = [];

function generateGameBoard() {
  const board = document.getElementById("game-board");
  board.innerHTML = "";
  blocks = [];
  scoreBlocks = [];

  // تولید مجموع تصادفی بین ۵۰۰۰ تا ۱۷۰۰۰
  totalReward = Math.floor(Math.random() * (17000 - 5000 + 1)) + 5000;

  // تولید ۶ موقعیت متفاوت شانسی
  while (scoreBlocks.length < 6) {
    let rand = Math.floor(Math.random() * gridSize * gridSize);
    if (!scoreBlocks.includes(rand)) {
      scoreBlocks.push(rand);
    }
  }

  // توزیع پاداش تصادفی بین ۶ بلوک
  let remaining = totalReward;
  let rewards = [];
  for (let i = 0; i < 6; i++) {
    let max = remaining - (6 - i - 1) * 100; // حداقل امتیاز برای باقی‌مانده‌ها
    let val = i < 5
      ? Math.floor(Math.random() * (max / 2)) + 100
      : remaining; // آخرین بلوک باقی‌مانده را پر کند
    rewards.push(val);
    remaining -= val;
  }

  // ساختن خانه‌ها
  for (let i = 0; i < gridSize * gridSize; i++) {
    const block = document.createElement("div");
    block.className = "block";
    block.dataset.index = i;

    if (scoreBlocks.includes(i)) {
      let index = scoreBlocks.indexOf(i);
      block.dataset.score = rewards[index];
    } else {
      block.dataset.score = 0;
    }

    block.addEventListener("click", () => mineBlock(block));
    blocks.push(block);
    board.appendChild(block);
  }

  document.getElementById("stamina-info").innerText = Stamina: ${remainingStamina}/${maxStamina};
}

function mineBlock(block) {
  if (remainingStamina <= 0) return alert("Stamina تمام شده!");
  if (block.classList.contains("mined")) return;

  block.classList.add("mined");
  remainingStamina--;

  let score = parseInt(block.dataset.score);
  mined += score;
  document.getElementById("score").innerText = Score: ${mined};
  document.getElementById("stamina-info").innerText = Stamina: ${remainingStamina}/${maxStamina};
}

function resetGame(stamina) {
  maxStamina = stamina;
  remainingStamina = stamina;
  mined = 0;
  document.getElementById("score").innerText = "Score: 0";
  generateGameBoard();
}