import { GoogleGenAI, Type } from "@google/genai";
import { generateSudoku, SIZE } from "./sudokuLogic.js";

(function () {
  // --- Gemini Hint Service ---
  let ai;
  try {
    // Safely check for VITE_API_KEY.
    // Use optional chaining or checks to prevent runtime errors in non-Vite environments.
    const env =
      typeof import.meta !== "undefined" && import.meta.env
        ? import.meta.env
        : {};
    const apiKey = env.VITE_API_KEY;

    if (apiKey) {
      ai = new GoogleGenAI({ apiKey: apiKey });
    } else {
      console.warn(
        "VITE_API_KEY environment variable not set. Hint feature will not work."
      );
    }
  } catch (e) {
    console.error("Error initializing GoogleGenAI", e);
  }

  async function getHint(board) {
    if (!ai) {
      showAlert(
        "API Not Initialized",
        "The Gemini API is not configured, so the hint feature is disabled. Please see the README file for setup instructions."
      );
      return null;
    }
    const emptyCells = [];
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (board[r][c] === null) {
          emptyCells.push({ row: r, col: c });
        }
      }
    }

    if (emptyCells.length === 0) return null;

    const targetCell =
      emptyCells[Math.floor(Math.random() * emptyCells.length)];
    const { row, col } = targetCell;
    const boardString = board
      .map((r) => r.map((c) => (c === null ? 0 : c)).join(","))
      .join("\\n");

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Sudoku board:\n${boardString}\n\nProvide the single correct digit for the cell at row index ${row}, column index ${col}.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              value: {
                type: Type.INTEGER,
                description: "The correct number (1-9) for the specified cell.",
              },
            },
          },
        },
      });

      const result = JSON.parse(response.text.trim());
      const value = result.value;

      if (typeof value === "number" && value >= 1 && value <= 9) {
        return { row, col, value };
      }
      return null;
    } catch (error) {
      console.error("Error fetching hint from Gemini API:", error);
      throw new Error("Failed to get hint from Gemini API.");
    }
  }

  // --- DOM Elements ---
  const canvas = document.getElementById("sudoku-canvas");
  const ctx = canvas.getContext("2d");
  const canvasContainer = document.getElementById("canvas-container");
  const timerEl = document.getElementById("timer");

  // Modals & Overlay Elements
  const usernameModal = document.getElementById("username-modal");
  const usernameForm = document.getElementById("username-form");
  const usernameInput = document.getElementById("username-input");
  const usernameSubmitBtn = document.getElementById("username-submit-btn");
  const usernameDisplay = document.getElementById("username-display");
  const changeUserBtn = document.getElementById("change-user-btn");

  const winModal = document.getElementById("win-modal");
  const winTimeEl = document.getElementById("win-time");
  const winDifficultyEl = document.getElementById("win-difficulty");
  const playAgainBtn = document.getElementById("play-again-btn");

  const alertModal = document.getElementById("alert-modal");
  const alertTitle = document.getElementById("alert-title");
  const alertMessage = document.getElementById("alert-message");
  const alertCloseBtn = document.getElementById("alert-close-btn");

  // Game Controls
  const newGameBtn = document.getElementById("new-game-dropdown-btn");
  const difficultySelector = document.getElementById("difficulty-selector");
  const difficultyBtns = document.querySelectorAll(".difficulty-btn");
  const validateBtn = document.getElementById("validate-btn");
  const resetBtn = document.getElementById("reset-btn");
  const pauseBtn = document.getElementById("pause-btn");
  const hintBtn = document.getElementById("hint-btn");
  const toggleLeaderboardBtn = document.getElementById(
    "toggle-leaderboard-btn"
  );
  const gameView = document.getElementById("game-view");
  const leaderboardView = document.getElementById("leaderboard-view");

  const numberPad = document.getElementById("number-pad");
  const numberPadBtns = document.querySelectorAll(".number-btn");
  const eraseBtn = document.getElementById("erase-btn");

  const loadingOverlay = document.getElementById("loading-overlay");

  // --- Game State ---
  let board, solution, userInput;
  let selectedCell = null;
  let difficulty = "medium";
  let time = 0;
  let timerInterval = null;
  let username = null;
  let scores = [];
  let cellSize, canvasSize;
  let isPaused = false;

  // --- Helper: Check if user can interact ---
  function isGameInteractive() {
    return (
      !isPaused &&
      !usernameModal.classList.contains("active") &&
      !winModal.classList.contains("active") &&
      !alertModal.classList.contains("active")
    );
  }

  // --- Canvas Drawing ---
  function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvasContainer.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    ctx.scale(dpr, dpr);

    canvasSize = rect.width;
    cellSize = canvasSize / 9;

    redrawCanvas();
  }

  function drawGrid() {
    if (!cellSize || !canvasSize) return;
    for (let i = 0; i <= 9; i++) {
      ctx.beginPath();
      const isThick = i % 3 === 0;
      ctx.lineWidth = isThick ? 4 : 2;
      ctx.strokeStyle = isThick ? "#e2e8f0" : "#64748b";

      const pos = Math.round(i * cellSize);

      ctx.moveTo(pos, 0);
      ctx.lineTo(pos, canvasSize);
      ctx.moveTo(0, pos);
      ctx.lineTo(canvasSize, pos);

      ctx.stroke();
    }
  }

  function drawNumbers() {
    if (!board || !cellSize) return;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const fontSize = cellSize * 0.6;
    ctx.font = `bold ${fontSize}px sans-serif`;

    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        const x = col * cellSize + cellSize / 2;
        const y = row * cellSize + cellSize / 2;

        if (userInput[row][col] !== null) {
          ctx.fillStyle = userInput[row][col].isError ? "#ef4444" : "#f1f5f9";
          ctx.fillText(userInput[row][col].value, x, y);
        } else if (board[row][col] !== null) {
          ctx.fillStyle = "#22d3ee";
          ctx.fillText(board[row][col], x, y);
        }
      }
    }
  }

  function drawSelection() {
    if (!selectedCell || !cellSize) return;
    const { row, col } = selectedCell;

    ctx.fillStyle = "rgba(71, 85, 105, 0.5)";
    for (let i = 0; i < 9; i++) {
      ctx.fillRect(i * cellSize, row * cellSize, cellSize, cellSize);
      ctx.fillRect(col * cellSize, i * cellSize, cellSize, cellSize);
    }
    const startRow = Math.floor(row / 3) * 3;
    const startCol = Math.floor(col / 3) * 3;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        ctx.fillRect(
          (startCol + c) * cellSize,
          (startRow + r) * cellSize,
          cellSize,
          cellSize
        );
      }
    }

    ctx.fillStyle = "rgba(100, 116, 139, 0.7)";
    ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);

    ctx.strokeStyle = "#22d3ee";
    ctx.lineWidth = 3;
    ctx.strokeRect(col * cellSize, row * cellSize, cellSize, cellSize);
  }

  function redrawCanvas() {
    if (!ctx || !canvasSize) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    if (isPaused) {
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, canvasSize, canvasSize);

      ctx.fillStyle = "#22d3ee";
      ctx.font = "bold 40px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("PAUSED", canvasSize / 2, canvasSize / 2);
    } else {
      drawGrid();
      drawSelection();
      drawNumbers();
    }
  }

  // --- Game Logic ---
  function startGame(newDifficulty) {
    // Ensure user is logged in before generating a board
    if (!username) {
      usernameModal.classList.add("active");
      return;
    }

    difficulty = newDifficulty;
    updateDifficultyButtonsUI();
    ({ puzzle: board, solution } = generateSudoku(difficulty));
    userInput = Array(9)
      .fill(null)
      .map(() => Array(9).fill(null));
    selectedCell = null;
    time = 0;
    isPaused = false;
    updatePauseButtonState();
    startTimer();
    resizeCanvas();
  }

  function handleInput(value) {
    if (!isGameInteractive()) return;

    if (!selectedCell || board[selectedCell.row][selectedCell.col] !== null) {
      return;
    }
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
    if (!isGameInteractive()) return;
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
    isPaused = false;
    updatePauseButtonState();
    startTimer();
    redrawCanvas();
  }

  function checkWinCondition() {
    let isFull = true;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const userVal = userInput[r][c]?.value;
        const boardVal = board[r][c];
        if (userVal === undefined && boardVal === null) {
          isFull = false;
          break;
        }
        if (userVal !== undefined && userVal !== solution[r][c]) {
          return;
        }
      }
      if (!isFull) break;
    }

    if (isFull) {
      stopTimer();
      addScore(time, difficulty);
      winDifficultyEl.textContent = difficulty;
      winTimeEl.textContent = formatTime(time);
      winModal.classList.add("active");
    }
  }

  function togglePause() {
    if (!board) return; // Don't toggle if game hasn't started

    if (isPaused) {
      isPaused = false;
      startTimer();
    } else {
      isPaused = true;
      stopTimer();
    }
    updatePauseButtonState();
    redrawCanvas();
  }

  function updatePauseButtonState() {
    if (isPaused) {
      pauseBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd" />
                </svg> Resume`;
      timerEl.classList.add("opacity-50");
      numberPad.classList.add("opacity-25", "pointer-events-none");
      validateBtn.classList.add("opacity-50", "pointer-events-none");
      hintBtn.classList.add("opacity-50", "pointer-events-none");
    } else {
      pauseBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
                </svg> Pause`;
      timerEl.classList.remove("opacity-50");
      numberPad.classList.remove("opacity-25", "pointer-events-none");
      validateBtn.classList.remove("opacity-50", "pointer-events-none");
      hintBtn.classList.remove("opacity-50", "pointer-events-none");
    }
  }

  // --- Timer ---
  function formatTime(seconds) {
    const min = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const sec = (seconds % 60).toString().padStart(2, "0");
    return `${min}:${sec}`;
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

  // --- Local Storage & UI ---
  function showAlert(title, message) {
    alertTitle.textContent = title;
    alertMessage.textContent = message;
    alertModal.classList.add("active");
  }

  function updateDifficultyButtonsUI() {
    difficultyBtns.forEach((b) => {
      if (b.dataset.difficulty === difficulty) {
        b.classList.add("bg-cyan-600", "text-white");
        b.classList.remove("hover:bg-slate-600");
      } else {
        b.classList.remove("bg-cyan-600", "text-white");
        b.classList.add("hover:bg-slate-600");
      }
    });
  }

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

  function loadScores() {
    const storedScores = localStorage.getItem("sudokuLeaderboard");
    scores = storedScores ? JSON.parse(storedScores) : [];
  }

  function addScore(time, difficulty) {
    if (!username) return;
    const newScore = {
      username,
      time,
      difficulty,
      date: new Date().toISOString(),
    };
    scores.push(newScore);
    scores.sort((a, b) => a.time - b.time);
    localStorage.setItem("sudokuLeaderboard", JSON.stringify(scores));
  }

  function renderLeaderboard() {
    const container = document.getElementById("leaderboard-scores");
    if (scores.length === 0) {
      container.innerHTML = `<p class="text-center text-slate-400">No scores yet. Complete a game to see your name here!</p>`;
      return;
    }

    const rankColors = ["text-amber-400", "text-slate-300", "text-yellow-700"];
    const tableHTML = `
            <table class="w-full text-left">
                <thead>
                  <tr class="border-b border-slate-600 text-slate-400">
                    <th class="p-3">Rank</th><th class="p-3">Username</th><th class="p-3">Time</th><th class="p-3">Difficulty</th>
                  </tr>
                </thead>
                <tbody>
                  ${scores
                    .slice(0, 10)
                    .map(
                      (score, index) => `
                    <tr class="border-b border-slate-700 ${
                      rankColors[index] || "text-slate-400"
                    }">
                      <td class="p-3 font-bold">#${index + 1}</td>
                      <td class="p-3">${score.username}</td>
                      <td class="p-3 font-mono">${formatTime(score.time)}</td>
                      <td class="p-3 capitalize">${score.difficulty}</td>
                    </tr>
                  `
                    )
                    .join("")}
                </tbody>
            </table>
        `;
    container.innerHTML = tableHTML;
  }

  // --- Event Listeners ---
  function handleCanvasInteraction(e) {
    e.preventDefault();
    if (!isGameInteractive()) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const col = Math.floor(x / cellSize);
    const row = Math.floor(y / cellSize);

    if (row >= 0 && row < SIZE && col >= 0 && col < SIZE) {
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
    if (!isGameInteractive()) return;

    if (!selectedCell) return;
    if (e.key >= "1" && e.key <= "9") {
      handleInput(e.key);
    } else if (e.key === "Backspace" || e.key === "Delete") {
      eraseInput();
    }
  });

  numberPadBtns.forEach((btn) => {
    btn.addEventListener("click", () => handleInput(btn.textContent));
  });
  eraseBtn.addEventListener("click", eraseInput);

  usernameInput.addEventListener("input", () => {
    usernameSubmitBtn.disabled = !usernameInput.value.trim();
  });

  usernameForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = usernameInput.value.trim();
    if (name) {
      saveUser(name);
    }
  });

  changeUserBtn.addEventListener("click", () => {
    username = null;
    localStorage.removeItem("sudokuUsername");
    stopTimer();
    gameView.classList.remove("hidden");
    leaderboardView.classList.add("hidden");
    usernameModal.classList.add("active");
    // Force a redraw so the background isn't stuck in a weird state if needed
    // but modal covers it.
  });

  newGameBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (!isGameInteractive()) return;
    difficultySelector.classList.toggle("hidden");
  });
  document.addEventListener("click", () =>
    difficultySelector.classList.add("hidden")
  );

  difficultyBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const newDifficulty = btn.dataset.difficulty;
      difficultySelector.classList.add("hidden");
      startGame(newDifficulty);
    });
  });

  validateBtn.addEventListener("click", () => {
    if (!isGameInteractive()) return;
    if (!solution) return;
    let hasError = false;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const cell = userInput[r][c];
        if (cell) {
          if (cell.value !== solution[r][c]) {
            cell.isError = true;
            hasError = true;
          } else {
            cell.isError = false;
          }
        }
      }
    }
    if (!hasError) showAlert("Validation Complete", "No errors found so far!");
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

  pauseBtn.addEventListener("click", togglePause);

  hintBtn.addEventListener("click", async () => {
    if (!isGameInteractive()) return;
    hintBtn.disabled = true;
    hintBtn.innerHTML = `
            <svg class="animate-spin -ml-1 mr-1 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg> Hinting...`;

    try {
      const currentBoardState = board.map((row, rIdx) =>
        row.map((cell, cIdx) => userInput[rIdx][cIdx]?.value ?? cell ?? null)
      );
      const hint = await getHint(currentBoardState);
      if (hint) {
        selectedCell = { row: hint.row, col: hint.col };
        handleInput(String(hint.value));
      } else {
        showAlert(
          "Hint Unavailable",
          "Could not get a hint for the board. It might be full or unsolvable."
        );
      }
    } catch (error) {
      console.error("Error getting hint:", error);
      showAlert(
        "Hint Error",
        "Could not fetch a hint. Please check your API key and try again."
      );
    } finally {
      hintBtn.disabled = false;
      hintBtn.textContent = "Get Hint";
    }
  });

  toggleLeaderboardBtn.addEventListener("click", () => {
    // Block if modal is open
    if (usernameModal.classList.contains("active")) return;

    if (isPaused && gameView.classList.contains("hidden")) {
      setTimeout(redrawCanvas, 0);
    }

    gameView.classList.toggle("hidden");
    leaderboardView.classList.toggle("hidden");

    if (!leaderboardView.classList.contains("hidden")) {
      renderLeaderboard();
      toggleLeaderboardBtn.textContent = "Back to Game";
    } else {
      toggleLeaderboardBtn.textContent = "Leaderboard";
      if (isPaused) redrawCanvas();
    }
  });

  playAgainBtn.addEventListener("click", () => {
    winModal.classList.remove("active");
    startGame(difficulty);
  });

  alertCloseBtn.addEventListener("click", () => {
    alertModal.classList.remove("active");
  });

  // --- Initialization ---
  // Remove loading overlay if we got this far
  if (loadingOverlay) loadingOverlay.remove();

  // Force initial resize to set up canvas context even if game hasn't started
  resizeCanvas();

  loadUser();
})();
