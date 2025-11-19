// Size of the Sudoku grid (9x9)
export const SIZE = 9;
// Size of each sub-grid/box (3x3)
export const BOX_SIZE = 3;

/**
 * Randomly shuffles the elements of an array in place
 * using the Fisher–Yates algorithm.
 */
export function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    // Pick a random index from 0 to i (inclusive)
    const j = Math.floor(Math.random() * (i + 1));
    // Swap elements at i and j
    [array[i], array[j]] = [array[j], array[i]];
  }
}

/**
 * Checks if placing `num` at board[row][col] is valid
 * according to Sudoku rules.
 */
export function isValidPlacement(board, row, col, num) {
  // Check the row and column for the same number
  for (let i = 0; i < SIZE; i++) {
    if (board[row][i] === num || board[i][col] === num) return false;
  }

  // Find the top-left corner of the 3x3 box
  const startRow = Math.floor(row / BOX_SIZE) * BOX_SIZE;
  const startCol = Math.floor(col / BOX_SIZE) * BOX_SIZE;

  // Check the 3x3 box for the same number
  for (let i = 0; i < BOX_SIZE; i++) {
    for (let j = 0; j < BOX_SIZE; j++) {
      if (board[startRow + i][startCol + j] === num) return false;
    }
  }

  // No conflicts found
  return true;
}

/**
 * Solves the given Sudoku board using backtracking.
 * Mutates the board in place and returns true if solved.
 */
export function solveSudoku(board) {
  // Scan the board for an empty cell (null)
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      if (board[row][col] === null) {
        // Try all numbers 1–9 in random order
        const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];
        shuffle(numbers);

        for (const num of numbers) {
          // Check if we can place num here
          if (isValidPlacement(board, row, col, num)) {
            board[row][col] = num; // Tentatively place num

            // Recurse: if the rest of the board can be solved, we’re done
            if (solveSudoku(board)) {
              return true;
            }

            // Otherwise, backtrack
            board[row][col] = null;
          }
        }

        // If no number fits in this cell, this path is invalid
        return false;
      }
    }
  }

  // No empty cells left: puzzle is solved
  return true;
}

/**
 * Generates a Sudoku puzzle of a given difficulty.
 * Returns both the puzzle (with blanks) and the full solution.
 */
export function generateSudoku(difficulty) {
  // Create an empty 9x9 board for the solution
  const solution = Array(SIZE)
    .fill(null)
    .map(() => Array(SIZE).fill(null));

  // Fill it with a complete valid solution
  solveSudoku(solution);

  // Clone the solution to create the puzzle grid
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

  // Create a list of all cell positions (row, col)
  const cells = [];
  for (let i = 0; i < SIZE; i++)
    for (let j = 0; j < SIZE; j++) cells.push([i, j]);

  // Randomize the order in which we remove cells
  shuffle(cells);

  // Remove numbers from the puzzle while we still have removals left
  for (const [row, col] of cells) {
    if (removals <= 0) break;
    if (puzzle[row][col] !== null) {
      puzzle[row][col] = null; // Make this cell empty
      removals--;
    }
  }

  // Return both the puzzle (with blanks) and the full solution
  return { puzzle, solution };
}
