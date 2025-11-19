import { isValidPlacement, solveSudoku, generateSudoku } from "./sudokuLogic";

describe("Sudoku Logic", () => {
  test("isValidPlacement should correctly identify valid and invalid moves", () => {
    const board = Array(9)
      .fill(null)
      .map(() => Array(9).fill(null));
    // Place 5 at (0,0) for context, though pure check doesn't look at self if passed correctly,
    // standard logic checks existing board state.
    board[0][0] = 5;

    // Check same row (0, 1) trying to place 5 -> Invalid
    expect(isValidPlacement(board, 0, 1, 5)).toBe(false);

    // Check same col (1, 0) trying to place 5 -> Invalid
    expect(isValidPlacement(board, 1, 0, 5)).toBe(false);

    // Check same 3x3 box (1, 1) trying to place 5 -> Invalid
    expect(isValidPlacement(board, 1, 1, 5)).toBe(false);

    // Check valid move (0, 1) place 6 -> Valid
    expect(isValidPlacement(board, 0, 1, 6)).toBe(true);
  });

  test("solveSudoku should fill a board completely", () => {
    const board = Array(9)
      .fill(null)
      .map(() => Array(9).fill(null));
    const solved = solveSudoku(board);

    expect(solved).toBe(true);

    // Check if the board is fully filled
    let isFull = true;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (board[r][c] === null) isFull = false;
      }
    }
    expect(isFull).toBe(true);
  });

  test("generateSudoku should create a puzzle and a solution", () => {
    const { puzzle, solution } = generateSudoku("easy");

    // Check dimensions
    expect(puzzle).toHaveLength(9);
    expect(solution).toHaveLength(9);

    // Check solution is fully filled
    let solutionFull = true;
    solution.forEach((row) => {
      row.forEach((cell) => {
        if (cell === null) solutionFull = false;
      });
    });
    expect(solutionFull).toBe(true);

    // Check puzzle has gaps (null values)
    let puzzleHasGaps = false;
    puzzle.forEach((row) => {
      row.forEach((cell) => {
        if (cell === null) puzzleHasGaps = true;
      });
    });
    expect(puzzleHasGaps).toBe(true);
  });
});
