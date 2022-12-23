import { interpret } from 'xstate';
import inquirer from 'inquirer';
import chalk from 'chalk';

import { wheelMachine, WheelContext } from './fsm.js'

function printScores(context: WheelContext) {
  let i = 0;
  let str = '';

  for (let player of context.players) {
    const c = i == 0 ? chalk.white.bgRed : i == 1 ? chalk.white.bgYellow : chalk.white.bgBlue;
    str += c(`${player.name}: \$${player.score}`)
    str += ' ';
    i++;
  }

  console.log(str);
}

function printBoard(context: WheelContext) {
  const letters = 'abcdefghijklmnopqrstuvwxyz';
  const fullwidth = 'ＡＢＣＤＥＦＧＨＩＪＫＬＭＮＯＰＱＲＳＴＵＶＷＸＹＺ';
  let board = '';
  for (let letter of context.puzzle) {
    if (letter == ' ') board += '🟩';
    else if (letters.includes(letter) == false) board += letter; // ampersands?
    else if (context.guessedLetters.includes(letter)) board += fullwidth[letters.indexOf(letter)];
    else board += '⬜';
  }

  console.log(context.category.toUpperCase());
  console.log(board);
}

function printUsedLetters(context: WheelContext) {
  function inner(letter: string) {
    return (context.guessedLetters.includes(letter) ? chalk.gray : chalk.whiteBright)(letter);
  }

  let avail = '';
  avail += 'abcdefghijklm'.split('').map(inner).join(' ');
  avail += '\n';
  avail += 'nopqrstuvwxyz'.split('').map(inner).join(' ');
  console.log(avail);
}

if (wheelMachine.options.delays) {
  wheelMachine.options.delays.PLAYER_IDLE_TIME = Math.pow(2, 32) / 2 - 1;
}

const wheelService = interpret(wheelMachine)
  .onTransition((state: any) => console.log(`New state: ${state.value}`))
  .start();

const { numPlayers } = await inquirer.prompt({
  type: 'list',
  name: 'numPlayers',
  message: 'How many players?',
  choices: [
    { name: '1 player', value: 1 },
    { name: '2 players', value: 2 },
    { name: '3 players', value: 3 },
  ],
});

for (let i = 0; i < numPlayers; i++) {
  const ans = await inquirer.prompt({
    type: 'input',
    name: 'playerName',
    default: `Player ${i + 1}`,
    message: `Player ${i + 1} name:`
  })

  wheelService.send('NEW_PLAYER', ans);
}

wheelService.subscribe(async (state) => {
  if (!state.matches('playerTurn')) return;

  const { currentPlayer } = state.context;

  console.log();
  printScores(state.context);
  console.log();
  printBoard(state.context);
  console.log();
  printUsedLetters(state.context);
  console.log();

  const { action } = await inquirer.prompt({
    type: 'list',
    name: 'action',
    message: `${currentPlayer?.name}, it's your turn:`,
    choices: () => {
      const choices = [];
      choices.push({ name: 'Spin the wheel', value: 'SPIN_WHEEL' });
      if (currentPlayer.score >= 250) choices.push({ name: 'Buy a vowel', value: 'BUY_VOWEL' });
      choices.push({ name: 'Solve the puzzle', value: 'SOLVE_PUZZLE' });
      return choices;
    },
  });

  if (action != 'SOLVE_PUZZLE') {
    wheelService.send(action);
  } else {
    const ans = await inquirer.prompt({
      type: 'input',
      name: 'guess',
      message: `Solve the puzzle:`
    });
    wheelService.send(action, ans);
  }
});

wheelService.subscribe(async (state) => {
  if (!state.matches('guessConsonent')) return;

  const { currentPlayer, guessedLetters } = state.context;

  console.log(`You spun $${state.context.spinAmount}`);

  const { letter } = await inquirer.prompt({
    type: 'input',
    name: 'letter',
    message: `${currentPlayer?.name}, choose a consonent:`,
    validate: input => {
      if (input.length != 1) return 'Only one letter at a time!';
      if (guessedLetters.includes(input)) return 'Already guessed letter!';
      if (['a', 'e', 'i', 'o', 'u'].includes(input)) return "Can't choose a vowel!";
      return true;
    }
  });

  wheelService.send('GUESS_LETTER', { letter });
});

wheelService.subscribe(async (state) => {
  if (!state.matches('guessVowel')) return;

  const { currentPlayer, guessedLetters } = state.context;

  const { letter } = await inquirer.prompt({
    type: 'input',
    name: 'letter',
    message: `${currentPlayer?.name}, choose a vowel:`,
    validate: input => {
      if (input.length != 1) return 'Only one letter at a time!';
      if (guessedLetters.includes(input)) return 'Already guessed letter!';
      if (['a', 'e', 'i', 'o', 'u'].includes(input) == false) return "Can't choose a consonant!";

      return true;
    }
  });

  wheelService.send('GUESS_LETTER', { letter });
});