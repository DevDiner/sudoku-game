// Grid dimensions
export const SIZE = 9;
export const BOX_SIZE = 3;

// Fisher–Yates shuffle to randomize arrays
export function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

// Check if num can be placed at (row, col)
export function isValidPlacement(board, row, col, num) {
  // Check row and column
  for (let i = 0; i < SIZE; i++) {
    if (board[row][i] === num || board[i][col] === num) return false;
  }

  // Check 3x3 box
  const startRow = Math.floor(row / BOX_SIZE) * BOX_SIZE;
  const startCol = Math.floor(col / BOX_SIZE) * BOX_SIZE;
  for (let i = 0; i < BOX_SIZE; i++) {
    for (let j = 0; j < BOX_SIZE; j++) {
      if (board[startRow + i][startCol + j] === num) return false;
    }
  }
  return true;
}

// Backtracking solver that fills the board in-place
export function solveSudoku(board) {
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      // Find empty cell
      if (board[row][col] === null) {
        const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];
        shuffle(numbers); // Randomize to vary generated boards

        for (const num of numbers) {
          if (isValidPlacement(board, row, col, num)) {
            board[row][col] = num;
            // Recurse; if success, propagate true
            if (solveSudoku(board)) {
              return true;
            }
            // Backtrack
            board[row][col] = null;
          }
        }
        // No valid number for this cell
        return false;
      }
    }
  }
  // No empty cells left: solved
  return true;
}

// Generate a puzzle and its full solution
export function generateSudoku(difficulty) {
  // Create empty board and solve to get a full valid solution
  const solution = Array(SIZE)
    .fill(null)
    .map(() => Array(SIZE).fill(null));
  solveSudoku(solution);

  // Copy solution to start the puzzle
  const puzzle = solution.map((row) => [...row]);

  // Decide how many cells to remove based on difficulty
  let removals;
  switch (difficulty) {
    case "easy":
      removals = 40;
      break;
    case "medium":
      removals = 50;
      break;
    case "hard":
      removals = 60;
      break;
    default:
      removals = 50;
  }

  // List all cell coordinates
  const cells = [];
  for (let i = 0; i < SIZE; i++)
    for (let j = 0; j < SIZE; j++) cells.push([i, j]);
  shuffle(cells); // Randomize removal order

  // Remove numbers to create the puzzle
  for (const [row, col] of cells) {
    if (removals <= 0) break;
    if (puzzle[row][col] !== null) {
      puzzle[row][col] = null;
      removals--;
    }
  }

  return { puzzle, solution };
}
