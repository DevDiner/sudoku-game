
import { GoogleGenAI, Type } from "@google/genai";

(function () {
    // --- Sudoku Generation & Validation Logic ---
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
                            if (solveSudoku(board)) {
                                return true;
                            }
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
        const solution = Array(SIZE).fill(null).map(() => Array(SIZE).fill(null));
        solveSudoku(solution);

        const puzzle = solution.map(row => [...row]);

        let removals;
        switch (difficulty) {
            case 'easy': removals = 40; break;
            case 'medium': removals = 50; break;
            case 'hard': removals = 60; break;
            default: removals = 50;
        }

        const cells = [];
        for (let i = 0; i < SIZE; i++) for (let j = 0; j < SIZE; j++) cells.push([i, j]);
        shuffle(cells);

        for (const [row, col] of cells) {
            if (removals <= 0) break;
            if (puzzle[row][col] !== null) {
                puzzle[row][col] = null;
                removals--;
            }
        }
        return { puzzle, solution };
    }

    // --- Gemini Hint Service ---
    let ai;
    try {
        const apiKey = import.meta.env.VITE_API_KEY;
        if (apiKey) {
            ai = new GoogleGenAI({ apiKey: apiKey });
        } else {
            console.warn("VITE_API_KEY environment variable not set. Hint feature will not work. See README.md for setup instructions.");
        }
    } catch (e) {
        console.error("Error initializing GoogleGenAI", e);
    }

    async function getHint(board) {
        if (!ai) {
            showAlert("API Not Initialized", "The Gemini API is not configured, so the hint feature is disabled. Please see the README file for setup instructions.");
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

        const targetCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        const { row, col } = targetCell;
        const boardString = board.map(r => r.map(c => c === null ? 0 : c).join(',')).join('\\n');

        try {
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: `Sudoku board:\n${boardString}\n\nProvide the single correct digit for the cell at row index ${row}, column index ${col}.`,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            value: { type: Type.INTEGER, description: 'The correct number (1-9) for the specified cell.' }
                        }
                    },
                },
            });

            const result = JSON.parse(response.text.trim());
            const value = result.value;

            if (typeof value === 'number' && value >= 1 && value <= 9) {
                return { row, col, value };
            }
            return null;
        } catch (error) {
            console.error("Error fetching hint from Gemini API:", error);
            throw new Error("Failed to get hint from Gemini API.");
        }
    }

    // --- DOM Elements ---
    const canvas = document.getElementById('sudoku-canvas');
    const ctx = canvas.getContext('2d');
    const canvasContainer = document.getElementById('canvas-container');
    const timerEl = document.getElementById('timer');
    const usernameModal = document.getElementById('username-modal');
    const usernameForm = document.getElementById('username-form');
    const usernameInput = document.getElementById('username-input');
    const usernameSubmitBtn = document.getElementById('username-submit-btn');
    const usernameDisplay = document.getElementById('username-display');
    const newGameBtn = document.getElementById('new-game-dropdown-btn');
    const difficultySelector = document.getElementById('difficulty-selector');
    const difficultyBtns = document.querySelectorAll('.difficulty-btn');
    const validateBtn = document.getElementById('validate-btn');
    const resetBtn = document.getElementById('reset-btn');
    const hintBtn = document.getElementById('hint-btn');
    const toggleLeaderboardBtn = document.getElementById('toggle-leaderboard-btn');
    const gameView = document.getElementById('game-view');
    const leaderboardView = document.getElementById('leaderboard-view');
    const winModal = document.getElementById('win-modal');
    const winTimeEl = document.getElementById('win-time');
    const winDifficultyEl = document.getElementById('win-difficulty');
    const playAgainBtn = document.getElementById('play-again-btn');
    const numberPadBtns = document.querySelectorAll('.number-btn');
    const eraseBtn = document.getElementById('erase-btn');
    const alertModal = document.getElementById('alert-modal');
    const alertTitle = document.getElementById('alert-title');
    const alertMessage = document.getElementById('alert-message');
    const alertCloseBtn = document.getElementById('alert-close-btn');

    // --- Game State ---
    let board, solution, userInput;
    let selectedCell = null;
    let difficulty = 'medium';
    let time = 0;
    let timerInterval = null;
    let username = null;
    let scores = [];
    let cellSize, canvasSize;

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
        for (let i = 0; i <= 9; i++) {
            ctx.beginPath();
            const isThick = i % 3 === 0;
            // Using even more visible colors and thicker lines for better clarity
            ctx.lineWidth = isThick ? 4 : 2;
            ctx.strokeStyle = isThick ? '#e2e8f0' : '#64748b'; // slate-200 for thick, slate-500 for thin
            
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
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const fontSize = cellSize * 0.6;
        ctx.font = `bold ${fontSize}px sans-serif`;

        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                const x = col * cellSize + cellSize / 2;
                const y = row * cellSize + cellSize / 2;

                if (userInput[row][col] !== null) {
                    ctx.fillStyle = userInput[row][col].isError ? '#ef4444' : '#f1f5f9'; // red-500 or slate-100
                    ctx.fillText(userInput[row][col].value, x, y);
                }
                else if (board[row][col] !== null) {
                    ctx.fillStyle = '#22d3ee'; // cyan-400
                    ctx.fillText(board[row][col], x, y);
                }
            }
        }
    }

    function drawSelection() {
        if (!selectedCell) return;
        const { row, col } = selectedCell;

        ctx.fillStyle = 'rgba(71, 85, 105, 0.5)'; // slate-600 with opacity
        for (let i = 0; i < 9; i++) {
            ctx.fillRect(i * cellSize, row * cellSize, cellSize, cellSize);
            ctx.fillRect(col * cellSize, i * cellSize, cellSize, cellSize);
        }
        const startRow = Math.floor(row / 3) * 3;
        const startCol = Math.floor(col / 3) * 3;
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
                ctx.fillRect((startCol + c) * cellSize, (startRow + r) * cellSize, cellSize, cellSize);
            }
        }

        ctx.fillStyle = 'rgba(100, 116, 139, 0.7)'; // slate-500 with opacity
        ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);

        ctx.strokeStyle = '#22d3ee'; // cyan-400
        ctx.lineWidth = 3;
        ctx.strokeRect(col * cellSize, row * cellSize, cellSize, cellSize);
    }

    function redrawCanvas() {
        if (!ctx) return;
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.restore();

        drawGrid();
        drawSelection();
        drawNumbers();
    }

    // --- Game Logic ---
    function startGame(newDifficulty) {
        difficulty = newDifficulty;
        updateDifficultyButtonsUI();
        ({ puzzle: board, solution } = generateSudoku(difficulty));
        userInput = Array(9).fill(null).map(() => Array(9).fill(null));
        selectedCell = null;
        time = 0;
        startTimer();
        resizeCanvas();
    }

    function handleInput(value) {
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
        if (selectedCell && board[selectedCell.row][selectedCell.col] === null) {
            userInput[selectedCell.row][selectedCell.col] = null;
            redrawCanvas();
        }
    }

    function resetGame() {
        if (!board) return;
        userInput = Array(9).fill(null).map(() => Array(9).fill(null));
        selectedCell = null;
        time = 0;
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
            winModal.classList.add('active');
        }
    }

    // --- Timer ---
    function formatTime(seconds) {
        const min = Math.floor(seconds / 60).toString().padStart(2, '0');
        const sec = (seconds % 60).toString().padStart(2, '0');
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
        alertModal.classList.add('active');
    }

    function updateDifficultyButtonsUI() {
        difficultyBtns.forEach(b => {
            if (b.dataset.difficulty === difficulty) {
                b.classList.add('bg-cyan-600', 'text-white');
                b.classList.remove('hover:bg-slate-600');
            } else {
                b.classList.remove('bg-cyan-600', 'text-white');
                b.classList.add('hover:bg-slate-600');
            }
        });
    }

    function loadUser() {
        username = localStorage.getItem('sudokuUsername');
        if (username) {
            usernameDisplay.textContent = username;
            usernameModal.classList.remove('active');
            loadScores();
            startGame(difficulty);
        } else {
            usernameModal.classList.add('active');
        }
    }

    function saveUser(name) {
        username = name;
        localStorage.setItem('sudokuUsername', username);
        loadUser();
    }

    function loadScores() {
        const storedScores = localStorage.getItem('sudokuLeaderboard');
        scores = storedScores ? JSON.parse(storedScores) : [];
    }

    function addScore(time, difficulty) {
        if (!username) return;
        const newScore = { username, time, difficulty, date: new Date().toISOString() };
        scores.push(newScore);
        scores.sort((a, b) => a.time - b.time);
        localStorage.setItem('sudokuLeaderboard', JSON.stringify(scores));
    }

    function renderLeaderboard() {
        const container = document.getElementById('leaderboard-scores');
        if (scores.length === 0) {
            container.innerHTML = `<p class="text-center text-slate-400">No scores yet. Complete a game to see your name here!</p>`;
            return;
        }

        const rankColors = ['text-amber-400', 'text-slate-300', 'text-yellow-700'];
        const tableHTML = `
            <table class="w-full text-left">
                <thead>
                  <tr class="border-b border-slate-600 text-slate-400">
                    <th class="p-3">Rank</th><th class="p-3">Username</th><th class="p-3">Time</th><th class="p-3">Difficulty</th>
                  </tr>
                </thead>
                <tbody>
                  ${scores.slice(0, 10).map((score, index) => `
                    <tr class="border-b border-slate-700 ${rankColors[index] || 'text-slate-400'}">
                      <td class="p-3 font-bold">#${index + 1}</td>
                      <td class="p-3">${score.username}</td>
                      <td class="p-3 font-mono">${formatTime(score.time)}</td>
                      <td class="p-3 capitalize">${score.difficulty}</td>
                    </tr>
                  `).join('')}
                </tbody>
            </table>
        `;
        container.innerHTML = tableHTML;
    }

    // --- Event Listeners ---
    function handleCanvasInteraction(e) {
        e.preventDefault();
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

    window.addEventListener('resize', resizeCanvas);

    canvas.addEventListener('click', handleCanvasInteraction);
    canvas.addEventListener('touchstart', handleCanvasInteraction, { passive: false });


    document.addEventListener('keydown', (e) => {
        if (!selectedCell) return;
        if (e.key >= '1' && e.key <= '9') {
            handleInput(e.key);
        } else if (e.key === 'Backspace' || e.key === 'Delete') {
            eraseInput();
        }
    });

    numberPadBtns.forEach(btn => {
        btn.addEventListener('click', () => handleInput(btn.textContent));
    });
    eraseBtn.addEventListener('click', eraseInput);

    usernameInput.addEventListener('input', () => {
        usernameSubmitBtn.disabled = !usernameInput.value.trim();
    });

    usernameForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = usernameInput.value.trim();
        if (name) {
            saveUser(name);
        }
    });

    newGameBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        difficultySelector.classList.toggle('hidden');
    });
    document.addEventListener('click', () => difficultySelector.classList.add('hidden'));

    difficultyBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const newDifficulty = btn.dataset.difficulty;
            difficultySelector.classList.add('hidden');
            startGame(newDifficulty);
        });
    });

    validateBtn.addEventListener('click', () => {
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
            userInput.forEach(row => row.forEach(cell => {
                if (cell) cell.isError = false;
            }));
            redrawCanvas();
        }, 2000);
    });

    resetBtn.addEventListener('click', resetGame);

    hintBtn.addEventListener('click', async () => {
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
                showAlert("Hint Unavailable", "Could not get a hint for the board. It might be full or unsolvable.");
            }
        } catch (error) {
            console.error("Error getting hint:", error);
            showAlert("Hint Error", "Could not fetch a hint. Please check your API key and try again.");
        } finally {
            hintBtn.disabled = false;
            hintBtn.textContent = 'Get Hint';
        }
    });

    toggleLeaderboardBtn.addEventListener('click', () => {
        gameView.classList.toggle('hidden');
        leaderboardView.classList.toggle('hidden');
        if (!leaderboardView.classList.contains('hidden')) {
            renderLeaderboard();
            toggleLeaderboardBtn.textContent = 'Back to Game';
        } else {
            toggleLeaderboardBtn.textContent = 'Leaderboard';
        }
    });

    playAgainBtn.addEventListener('click', () => {
        winModal.classList.remove('active');
        startGame(difficulty);
    });

    alertCloseBtn.addEventListener('click', () => {
        alertModal.classList.remove('active');
    });

    // --- Initialization ---
    loadUser();
})();