export const SIZE = 9;
export const BOX_SIZE = 3;

export function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

export function isValidPlacement(board, row, col, num) {
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

export function solveSudoku(board) {
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

export function generateSudoku(difficulty) {
  const solution = Array(SIZE)
    .fill(null)
    .map(() => Array(SIZE).fill(null));
  solveSudoku(solution);

  const puzzle = solution.map((row) => [...row]);

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

  const cells = [];
  for (let i = 0; i < SIZE; i++)
    for (let j = 0; j < SIZE; j++) cells.push([i, j]);
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
