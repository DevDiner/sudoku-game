
# Sudoku Zen

Sudoku Zen is a classic 9x9 Sudoku game designed for the modern web. Built entirely with HTML5 Canvas, CSS, and vanilla JavaScript, it offers a clean, responsive, and engaging puzzle experience. The game features multiple difficulty levels, tracks high scores on a local leaderboard, and even includes an AI-powered hint system using the Google Gemini API.

## Features

- **Pure Canvas Rendering:** The entire game board and all interactions are rendered on an HTML5 Canvas for a smooth, app-like feel.
- **Multiple Difficulties:** Choose from Easy, Medium, or Hard to match your skill level.
- **Local Leaderboard:** Your best times are saved to your browser's local storage. Compete against yourself to get faster!
- **User Profiles:** Enter a username to personalize your high scores.
- **Solution Validation:** Instantly check your progress and see if you've made any mistakes.
- **AI-Powered Hints:** Stuck on a tough spot? Get a hint from the Google Gemini API to fill in a correct number.
- **Responsive Design:** Fully playable on both desktop (keyboard/mouse) and mobile devices (touch/on-screen keypad).

## How to Play

### Online (GitHub Pages)

Deploy your own version of this game for free using GitHub Pages.

1.  **Fork/Clone this Repository:** Create your own copy of this repository on GitHub.
2.  **Navigate to Settings:** In your repository, go to the "Settings" tab.
3.  **Go to Pages:** In the left sidebar, click on "Pages".
4.  **Configure Deployment:** Under "Build and deployment", select "Deploy from a branch" as the source. Choose your `main` (or `master`) branch and select `/root` as the folder. Click "Save".
5.  **Play:** After a minute or two, the game will be live at the URL provided by GitHub!

> **Note on the "Get Hint" Feature:** On a public static site like GitHub Pages, there is no secure way to store API key. Therefore, the hint feature will be disabled by default. Exposing API key in client-side code is a security risk. For development purposes, see the local setup instructions below.

### Running Locally

Run the game directly from local machine.

1.  **Clone the Repository:**
    ```bash
    git clone <repository-url>
    cd <repository-directory>
    ```
2.  **Open the File:** Simply open the `index.html` file in any modern web browser. The game is fully playable without a web server.

### Enabling Hints Locally (for Development)

If want to test the "Get Hint" feature locally:

1.  **Get an API Key:** Obtain a Google Gemini API Key from [Google AI Studio](https://aistudio.google.com/app/apikey).
2.  **Modify the Code:**
    -   Open the `index.js` file.
    -   Find the line that says: `const apiKey = import.meta.env.VITE_API_KEY;`
    -   Replace it with your actual key: `const apiKey = 'GEMINI_API_KEY';`
3.  **Run the game:** Open `index.html` in a browser. The hint feature should now work.

**IMPORTANT:** Do not commit API key to a public repository like GitHub.

## Unit Testing

This project includes a Jest-based unit test suite to verify the core Sudoku logic (generation, validation, and solving).

### Running Tests

Ensure Node.js is installed, then can run the tests using Jest.

1.  **Install Dependencies (if applicable):**
    If this is the first time running tests, may need to install Jest.
    ```bash
    npm install --save-dev jest
    ```

2.  **Run Tests:** (sudokuLogic.js is for unit testing purposes)
    ```bash
    npx jest sudokuLogic.test.js
    ```
    
    Or if have a `test` script configured in `package.json`:
    ```bash
    npm test
    ```

The tests cover:
- **Board Validation:** Ensuring the `isValidPlacement` function correctly identifies legal moves according to Sudoku rules (row, column, and box constraints).
- **Solving Algorithm:** Verifying that `solveSudoku` can successfully solve a given board.
- **Puzzle Generation:** Confirming that `generateSudoku` produces a board of the correct size with a valid solution and the appropriate number of empty cells.

## Game Instructions & Controls

### The Objective

The goal of Sudoku is to fill the 9x9 grid so that each row, each column, and each of the nine 3x3 subgrids contain all of the digits from 1 to 9.

### Getting Started

-   **Username:** The first time you load the game, you will be prompted to enter a username. This name will be used to record your scores on the leaderboard.
-   **New Game:** Click the "New Game" button to expand the difficulty options (Easy, Medium, Hard). Select one to start a new puzzle.

### Gameplay Controls

-   **Selecting a Cell:** Click or tap on any cell within the grid to select it. The selected row, column, and 3x3 box will be highlighted.
-   **Desktop Controls (Keyboard):**
    -   **Enter Number:** Press any number key from `1` to `9`.
    -   **Erase Number:** Press `Backspace` or `Delete`.
-   **Mobile & Touch Controls:**
    -   The game is fully responsive. On touch devices, simply tap cells to select them and use the **on-screen number pad** to enter or erase digits.

### UI Buttons

-   **New Game:** Starts a new puzzle with the selected difficulty.
-   **Validate:** Checks all your entered numbers against the correct solution. Any incorrect numbers will be temporarily highlighted in red.
-   **Reset:** Clears all of your input from the current puzzle and restarts the timer.
-   **Pause/Resume:** Pauses the game timer and hides the board.
-   **Get Hint:** Fills one randomly chosen empty cell with the correct answer. This button is disabled while a hint is being fetched and will not work unless an API key is configured (see above).
-   **Leaderboard:** Toggles between the game screen and the high scores view.
