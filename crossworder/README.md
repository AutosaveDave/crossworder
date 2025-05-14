# crossworder

Help me set up a react app with firebase authentication and firestore database. I want to use Vite for faster build times.

The app is primarily intended for use on an iPad.

Users should not be able to access anything but the login page unless they are authenticated using an email and password. 

There is no signup page for the app- new user accounts must be added manually in the firebase console. Users should be able to change their password once successfully logged in.

The react app will be hosted on github pages.

Firestore should be used to store user account data and words/clues for use in the puzzles. 

I want to use firebase CLI for deploying firebase features.

There will be several separate sets of words/clues with different categories stored in firestore. Each set of words/clues should have a "weighting" property that determines what percentage of words/clues for any generated crossword puzzle should be taken from that set of words/clues. I want to be able to easily add new sets of words/clues to firestore from a json file using the CLI.

The app generates crossword puzzles for users to solve. The app should allow the user to select a puzzle size (10x10, 15x15, 20x20, 25x25, or 30x30), then generate a new crossword puzzle.

When a user generates a new crossword puzzle, the new puzzle should be saved in the user's user data in firestore. Changes made (letters added to or removed from the puzzle) should always be stored in the user's user data so that they can pick up where they left off on each puzzle.

User data should also keep track of which words/clues have already been used in the user's puzzles, and these already-used words/clues should be avoided (if possible) when generating a new puzzle.

When a user logs in, they should see a UI for generating a new crossword puzzle (with size selection) and a UI for loading any of their saved puzzles.

The UI for loading saved puzzles should display each puzzle's date and time of generation, date and time last accessed, puzzle size, and percentage complete (the percentage of cells filled in by the user). Each should also have a "delete" button that removes the puzzle from the user's user data (after having the user confirm the action).

The user should be able to print any puzzle. When a puzzle is printed, it should not include any letters entered in the puzzle by the user, and the puzzle grid AND clues should all fit on one page. The puzzle should print in black and white or grayscale.

The app should use the `crossword-layout-generator` npm package to generate new crossword puzzles from the sets of words/clues in the firestore database.

The app should use the `Crossword` component from `@jaredreisinger/react-crossword` (npm package) to render puzzles.
