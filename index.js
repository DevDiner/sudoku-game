import { GoogleGenAI, Type } from "@google/genai";

(function () {
  // Sudoku generation & validation logic
  const SIZE = 9;
  const BOX_SIZE = 3;

  function solveSudoku(board) {
    for (let row = 0; row < SIZE; row++) {
      for (let col = 0; col < SIZE; col++) {
        if (board[row][col] === null) {
          const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];
          shuffle(numbers);
          for (const num of numbers) {
            if (isValidPlacement(board, row, col, num)) {
              board[row][col] = num;
              if (solveSudoku(board)) return true;
              board[row][col] = null;
            }
          }
          return false;
        }
      }
    }
    return true;
  }

  function isValidPlacement(board, row, col, num) {
    for (let i = 0; i < SIZE; i++) {
      if (board[row][i] === num || board[i][col] === num) return false;
    }
    const startRow = Math.floor(row / BOX_SIZE) * BOX_SIZE;
    const startCol = Math.floor(col / BOX_SIZE) * BOX_SIZE;

    for (let i = 0; i < BOX_SIZE; i++) {
      for (let j = 0; j < BOX_SIZE; j++) {
        if (board[startRow + i][startCol + j] === num) return false;
      }
    }
    return true;
  }

  function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  function generateSudoku(difficulty) {
    const solution = Array(SIZE)
      .fill(null)
      .map(() => Array(SIZE).fill(null));
    solveSudoku(solution);
    const puzzle = solution.map((row) => [...row]);

    let removals = { easy: 40, medium: 50, hard: 60 }[difficulty] ?? 50;

    const cells = [];
    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) cells.push([r, c]);
    shuffle(cells);

    for (const [r, c] of cells) {
      if (removals <= 0) break;
      if (puzzle[r][c] !== null) {
        puzzle[r][c] = null;
        removals--;
      }
    }

    return { puzzle, solution };
  }

  // Gemini hint service
  let ai = null;
  const apiKey = window.GEMINI_API_KEY || null;

  if (apiKey && apiKey.trim() !== "") {
    try {
      ai = new GoogleGenAI({ apiKey });
    } catch (e) {
      console.error("Gemini init failed:", e);
      ai = null;
    }
  }

  async function getHint(board) {
    if (!ai) {
      showAlert(
        "Hint Feature Disabled",
        "No Gemini API key found. Add your key in config.js to enable hints."
      );
      return null;
    }

    const empty = [];
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (board[r][c] === null) empty.push({ row: r, col: c });
      }
    }

    if (empty.length === 0) return null;

    const { row, col } = empty[Math.floor(Math.random() * empty.length)];

    const boardString = board
      .map((r) => r.map((c) => (c === null ? 0 : c)).join(","))
      .join("\n");

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Sudoku board:\n${boardString}\n\nReturn ONLY the correct number (1-9) for row ${row}, column ${col}.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              value: { type: Type.INTEGER },
            },
          },
        },
      });

      let parsed;
      try {
        parsed = JSON.parse(response.text.trim());
      } catch (err) {
        console.error("JSON parse failed:", err, response.text);
        return null;
      }

      if (parsed && parsed.value >= 1 && parsed.value <= 9) {
        return { row, col, value: parsed.value };
      }

      return null;
    } catch (err) {
      console.error("Gemini error:", err);
      showAlert("Hint Error", "Gemini could not provide a hint.");
      return null;
    }
  }

  // DOM elements
  const canvas = document.getElementById("sudoku-canvas");
  const ctx = canvas.getContext("2d");
  const canvasContainer = document.getElementById("canvas-container");
  const timerEl = document.getElementById("timer");
  const usernameModal = document.getElementById("username-modal");
  const usernameForm = document.getElementById("username-form");
  const usernameInput = document.getElementById("username-input");
  const usernameSubmitBtn = document.getElementById("username-submit-btn");
  const usernameDisplay = document.getElementById("username-display");
  const newGameBtn = document.getElementById("new-game-dropdown-btn");
  const difficultySelector = document.getElementById("difficulty-selector");
  const difficultyBtns = document.querySelectorAll(".difficulty-btn");
  const validateBtn = document.getElementById("validate-btn");
  const resetBtn = document.getElementById("reset-btn");
  const hintBtn = document.getElementById("hint-btn");
  const toggleLeaderboardBtn = document.getElementById(
    "toggle-leaderboard-btn"
  );
  const gameView = document.getElementById("game-view");
  const leaderboardView = document.getElementById("leaderboard-view");
  const winModal = document.getElementById("win-modal");
  const winTimeEl = document.getElementById("win-time");
  const winDifficultyEl = document.getElementById("win-difficulty");
  const playAgainBtn = document.getElementById("play-again-btn");
  const numberPadBtns = document.querySelectorAll(".number-btn");
  const eraseBtn = document.getElementById("erase-btn");
  const alertModal = document.getElementById("alert-modal");
  const alertTitle = document.getElementById("alert-title");
  const alertMessage = document.getElementById("alert-message");

  // Game state
  let board, solution, userInput;
  let selectedCell = null;
  let difficulty = "medium";
  let time = 0;
  let timerInterval = null;
  let username = null;
  let scores = [];
  let cellSize, canvasSize;

  // Canvas rendering
  function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvasContainer.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + "px";
    canvas.style.height = rect.height + "px";

    ctx.scale(dpr, dpr);

    canvasSize = rect.width;
    cellSize = canvasSize / 9;

    redrawCanvas();
  }

  function drawGrid() {
    for (let i = 0; i <= 9; i++) {
      ctx.beginPath();
      const thick = i % 3 === 0;
      ctx.lineWidth = thick ? 4 : 2;
      ctx.strokeStyle = thick ? "#e2e8f0" : "#64748b";

      const pos = Math.round(i * cellSize);
      ctx.moveTo(pos, 0);
      ctx.lineTo(pos, canvasSize);
      ctx.moveTo(0, pos);
      ctx.lineTo(canvasSize, pos);
      ctx.stroke();
    }
  }

  function drawNumbers() {
    if (!board) return;

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `bold ${cellSize * 0.6}px sans-serif`;

    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const x = c * cellSize + cellSize / 2;
        const y = r * cellSize + cellSize / 2;

        if (userInput[r][c] !== null) {
          ctx.fillStyle = userInput[r][c].isError ? "#ef4444" : "#f1f5f9";
          ctx.fillText(userInput[r][c].value, x, y);
        } else if (board[r][c] !== null) {
          ctx.fillStyle = "#22d3ee";
          ctx.fillText(board[r][c], x, y);
        }
      }
    }
  }

  function drawSelection() {
    if (!selectedCell) return;

    const { row, col } = selectedCell;

    ctx.fillStyle = "rgba(71,85,105,0.5)";
    for (let i = 0; i < 9; i++) {
      ctx.fillRect(i * cellSize, row * cellSize, cellSize, cellSize);
      ctx.fillRect(col * cellSize, i * cellSize, cellSize, cellSize);
    }

    const sr = Math.floor(row / 3) * 3;
    const sc = Math.floor(col / 3) * 3;

    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        ctx.fillRect(
          (sc + c) * cellSize,
          (sr + r) * cellSize,
          cellSize,
          cellSize
        );
      }
    }

    ctx.fillStyle = "rgba(100,116,139,0.7)";
    ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);

    ctx.strokeStyle = "#22d3ee";
    ctx.lineWidth = 3;
    ctx.strokeRect(col * cellSize, row * cellSize, cellSize, cellSize);
  }

  function redrawCanvas() {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    drawGrid();
    drawSelection();
    drawNumbers();
  }

  // Game logic
  function startGame(newDifficulty) {
    difficulty = newDifficulty;
    updateDifficultyButtonsUI();

    ({ puzzle: board, solution } = generateSudoku(difficulty));
    userInput = Array(9)
      .fill(null)
      .map(() => Array(9).fill(null));
    selectedCell = null;

    time = 0;
    startTimer();
    resizeCanvas();
  }

  function handleInput(value) {
    if (!selectedCell || board[selectedCell.row][selectedCell.col] !== null)
      return;

    const { row, col } = selectedCell;
    const num = parseInt(value, 10);

    if (!isNaN(num) && num >= 1 && num <= 9) {
      userInput[row][col] = { value: num, isError: false };
    } else {
      userInput[row][col] = null;
    }

    redrawCanvas();
    checkWinCondition();
  }

  function eraseInput() {
    if (selectedCell && board[selectedCell.row][selectedCell.col] === null) {
      userInput[selectedCell.row][selectedCell.col] = null;
      redrawCanvas();
    }
  }

  function resetGame() {
    if (!board) return;

    userInput = Array(9)
      .fill(null)
      .map(() => Array(9).fill(null));
    selectedCell = null;

    time = 0;
    startTimer();
    redrawCanvas();
  }

  function checkWinCondition() {
    let full = true;

    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const userVal = userInput[r][c]?.value;
        const boardVal = board[r][c];

        if (userVal === undefined && boardVal === null) full = false;
        if (userVal !== undefined && userVal !== solution[r][c]) return;
      }
    }

    if (full) {
      stopTimer();
      addScore(time, difficulty);
      winDifficultyEl.textContent = difficulty;
      winTimeEl.textContent = formatTime(time);
      winModal.classList.add("active");
    }
  }

  // Timer
  function formatTime(sec) {
    return `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(
      sec % 60
    ).padStart(2, "0")}`;
  }

  function startTimer() {
    stopTimer();
    timerEl.textContent = formatTime(time);

    timerInterval = setInterval(() => {
      time++;
      timerEl.textContent = formatTime(time);
    }, 1000);
  }

  function stopTimer() {
    clearInterval(timerInterval);
  }

  // Alerts
  function showAlert(title, msg) {
    alertTitle.textContent = title;
    alertMessage.textContent = msg;
    alertModal.classList.add("active");
  }

  // Difficulty button UI
  function updateDifficultyButtonsUI() {
    difficultyBtns.forEach((b) => {
      if (b.dataset.difficulty === difficulty) {
        b.classList.add("bg-cyan-600", "text-white");
      } else {
        b.classList.remove("bg-cyan-600", "text-white");
      }
    });
  }

  // User handling
  function loadUser() {
    username = localStorage.getItem("sudokuUsername");
    if (username) {
      usernameDisplay.textContent = username;
      usernameModal.classList.remove("active");
      loadScores();
      startGame(difficulty);
    } else {
      usernameModal.classList.add("active");
    }
  }

  function saveUser(name) {
    username = name;
    localStorage.setItem("sudokuUsername", username);
    loadUser();
  }

  // Score handling
  function loadScores() {
    const raw = localStorage.getItem("sudokuLeaderboard");
    scores = raw ? JSON.parse(raw) : [];
  }

  function addScore(time, difficulty) {
    if (!username) return;

    scores.push({
      username,
      time,
      difficulty,
      date: new Date().toISOString(),
    });

    scores.sort((a, b) => a.time - b.time);
    localStorage.setItem("sudokuLeaderboard", JSON.stringify(scores));
  }

  function renderLeaderboard() {
    const box = document.getElementById("leaderboard-scores");

    if (scores.length === 0) {
      box.innerHTML = `<p class="text-center text-slate-400">No scores yet.</p>`;
      return;
    }

    box.innerHTML = `
            <table class="w-full text-left">
                <thead>
                    <tr class="border-b border-slate-600 text-slate-400">
                        <th class="p-3">Rank</th>
                        <th class="p-3">Username</th>
                        <th class="p-3">Time</th>
                        <th class="p-3">Difficulty</th>
                    </tr>
                </thead>
                <tbody>
                    ${scores
                      .slice(0, 10)
                      .map(
                        (s, i) => `
                        <tr class="border-b border-slate-700">
                            <td class="p-3 font-bold">#${i + 1}</td>
                            <td class="p-3">${s.username}</td>
                            <td class="p-3 font-mono">${formatTime(s.time)}</td>
                            <td class="p-3 capitalize">${s.difficulty}</td>
                        </tr>
                    `
                      )
                      .join("")}
                </tbody>
            </table>
        `;
  }

  // Event listeners
  function handleCanvasInteraction(e) {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;

    const col = Math.floor(x / cellSize);
    const row = Math.floor(y / cellSize);

    if (row >= 0 && row < 9 && col >= 0 && col < 9) {
      selectedCell = { row, col };
      redrawCanvas();
    }
  }

  window.addEventListener("resize", resizeCanvas);

  canvas.addEventListener("click", handleCanvasInteraction);
  canvas.addEventListener("touchstart", handleCanvasInteraction, {
    passive: false,
  });

  document.addEventListener("keydown", (e) => {
    if (!selectedCell) return;
    if (/[1-9]/.test(e.key)) handleInput(e.key);
    if (e.key === "Backspace" || e.key === "Delete") eraseInput();
  });

  numberPadBtns.forEach((btn) =>
    btn.addEventListener("click", () => handleInput(btn.textContent))
  );

  eraseBtn.addEventListener("click", eraseInput);

  usernameInput.addEventListener("input", () => {
    usernameSubmitBtn.disabled = !usernameInput.value.trim();
  });

  usernameForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = usernameInput.value.trim();
    if (name) saveUser(name);
  });

  newGameBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    difficultySelector.classList.toggle("hidden");
  });

  document.addEventListener("click", () =>
    difficultySelector.classList.add("hidden")
  );

  difficultyBtns.forEach((btn) =>
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      startGame(btn.dataset.difficulty);
      difficultySelector.classList.add("hidden");
    })
  );

  validateBtn.addEventListener("click", () => {
    if (!solution) return;

    let hasError = false;

    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const cell = userInput[r][c];
        if (cell && cell.value !== solution[r][c]) {
          cell.isError = true;
          hasError = true;
        }
      }
    }

    if (!hasError) showAlert("Validation Complete", "No errors found!");
    redrawCanvas();

    setTimeout(() => {
      userInput.forEach((row) =>
        row.forEach((cell) => {
          if (cell) cell.isError = false;
        })
      );
      redrawCanvas();
    }, 2000);
  });

  resetBtn.addEventListener("click", resetGame);

  hintBtn.addEventListener("click", async () => {
    hintBtn.disabled = true;
    hintBtn.innerHTML = `
            <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-
75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.37 0 0 5.37 0 12h4z"></path>
            </svg> Hinting...
        `;

    try {
      const state = board.map((r, ri) =>
        r.map((c, ci) => userInput[ri][ci]?.value ?? c ?? null)
      );

      const hint = await getHint(state);

      if (!hint) {
        showAlert("Hint Unavailable", "Could not get a hint.");
      } else {
        selectedCell = { row: hint.row, col: hint.col };
        handleInput(String(hint.value));
      }
    } finally {
      hintBtn.disabled = false;
      hintBtn.textContent = "Get Hint";
    }
  });

  toggleLeaderboardBtn.addEventListener("click", () => {
    gameView.classList.toggle("hidden");
    leaderboardView.classList.toggle("hidden");

    if (!leaderboardView.classList.contains("hidden")) {
      renderLeaderboard();
      toggleLeaderboardBtn.textContent = "Back to Game";
    } else {
      toggleLeaderboardBtn.textContent = "Leaderboard";
    }
  });

  playAgainBtn.addEventListener("click", () => {
    winModal.classList.remove("active");
    startGame(difficulty);
  });

  document.getElementById("alert-close-btn").addEventListener("click", () => {
    alertModal.classList.remove("active");
  });

  // Initialize app
  loadUser();
})();
