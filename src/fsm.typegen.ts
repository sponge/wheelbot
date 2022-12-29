
  // This file was automatically generated. Edits will be overwritten

  export interface Typegen0 {
        '@@xstate/typegen': true;
        internalEvents: {
          "": { type: "" };
"xstate.after(50)#wheel.nextPlayerTurn": { type: "xstate.after(50)#wheel.nextPlayerTurn" };
"xstate.after(50)#wheel.playerAFK": { type: "xstate.after(50)#wheel.playerAFK" };
"xstate.after(50)#wheel.puzzleGuessCorrect": { type: "xstate.after(50)#wheel.puzzleGuessCorrect" };
"xstate.after(PLAYER_IDLE_TIME)#wheel.guessConsonant": { type: "xstate.after(PLAYER_IDLE_TIME)#wheel.guessConsonant" };
"xstate.after(PLAYER_IDLE_TIME)#wheel.guessVowel": { type: "xstate.after(PLAYER_IDLE_TIME)#wheel.guessVowel" };
"xstate.after(PLAYER_IDLE_TIME)#wheel.playerTurn": { type: "xstate.after(PLAYER_IDLE_TIME)#wheel.playerTurn" };
"xstate.after(READ_TIME)#wheel.lettersInPuzzle": { type: "xstate.after(READ_TIME)#wheel.lettersInPuzzle" };
"xstate.after(READ_TIME)#wheel.noLettersInPuzzle": { type: "xstate.after(READ_TIME)#wheel.noLettersInPuzzle" };
"xstate.after(READ_TIME)#wheel.puzzleGuessWrong": { type: "xstate.after(READ_TIME)#wheel.puzzleGuessWrong" };
"xstate.after(READ_TIME)#wheel.spinWheel": { type: "xstate.after(READ_TIME)#wheel.spinWheel" };
"xstate.after(WAITING_GAME_TIMEOUT)#wheel.waiting": { type: "xstate.after(WAITING_GAME_TIMEOUT)#wheel.waiting" };
"xstate.init": { type: "xstate.init" };
        };
        invokeSrcNameMap: {
          
        };
        missingImplementations: {
          actions: never;
          delays: never;
          guards: never;
          services: never;
        };
        eventsCausingActions: {
          "addScore": "GUESS_LETTER";
"bankruptCurrentPlayer": "xstate.after(READ_TIME)#wheel.spinWheel";
"buyVowel": "GUESS_LETTER";
"cycleNextPlayer": "xstate.after(50)#wheel.playerAFK" | "xstate.after(READ_TIME)#wheel.noLettersInPuzzle" | "xstate.after(READ_TIME)#wheel.puzzleGuessWrong" | "xstate.after(READ_TIME)#wheel.spinWheel";
"guaranteeMinimumWin": "" | "SOLVE_PUZZLE";
"registerNewPlayer": "NEW_PLAYER";
"spinWheel": "SPIN_WHEEL";
"updateUsedLetters": "GUESS_LETTER";
        };
        eventsCausingDelays: {
          "PLAYER_IDLE_TIME": "" | "BUY_VOWEL" | "GUESS_LETTER" | "xstate.after(50)#wheel.nextPlayerTurn" | "xstate.after(READ_TIME)#wheel.lettersInPuzzle" | "xstate.after(READ_TIME)#wheel.spinWheel";
"READ_TIME": "GUESS_LETTER" | "SOLVE_PUZZLE" | "SPIN_WHEEL";
"WAITING_GAME_TIMEOUT": "xstate.init";
        };
        eventsCausingGuards: {
          "hasAnyPlayers": "START_GAME";
"isGameFull": "";
"isPuzzleGuessCorrect": "SOLVE_PUZZLE";
"isPuzzleGuessWrong": "SOLVE_PUZZLE";
"isPuzzleSolved": "";
"isSpinBankrupt": "xstate.after(READ_TIME)#wheel.spinWheel";
"isSpinLoseATurn": "xstate.after(READ_TIME)#wheel.spinWheel";
"letterInPuzzle": "GUESS_LETTER";
"letterNotInPuzzle": "GUESS_LETTER";
"notConsonantGuess": "GUESS_LETTER";
"notVowelGuess": "GUESS_LETTER";
"playerCanBuyVowel": "BUY_VOWEL";
"playerCanSpin": "SPIN_WHEEL";
        };
        eventsCausingServices: {
          
        };
        matchesStates: "gameOver" | "gameTimeout" | "guessConsonant" | "guessVowel" | "lettersInPuzzle" | "nextPlayerTurn" | "noLettersInPuzzle" | "playerAFK" | "playerTurn" | "puzzleGuessCorrect" | "puzzleGuessWrong" | "spinWheel" | "startGame" | "waiting";
        tags: never;
      }
  