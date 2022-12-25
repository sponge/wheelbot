import { interpret } from 'xstate';
import inquirer from 'inquirer';
import chalk from 'chalk';

import { wheelMachine, WheelContext } from './fsm.js';
import Utils from './util.js'

/*
import { puzzles } from './puzzles.js';

const weirdLetters: string[] = [];
for (let puzzle of puzzles) {
  for (let letter of puzzle.puzzle.toLowerCase()) {
    if (letter == ' ') continue;
    if (weirdLetters.includes(letter)) continue;
    if (!'abcdefghijklmnopqrstuvwxyz'.includes(letter)) {
      console.log(`weird letter: ${letter} (${letter.charCodeAt(0)})`);
      weirdLetters.push(letter);
    }
  }
}
console.log('done scanning');
*/

/*
var links = [
  'http://buyavowel.boards.net/page/compendium30',
  'http://buyavowel.boards.net/page/compendium31',
  'http://buyavowel.boards.net/page/compendium32',
  'http://buyavowel.boards.net/page/compendium33',
  'http://buyavowel.boards.net/page/compendium34',
  'http://buyavowel.boards.net/page/compendium35',
  'http://buyavowel.boards.net/page/compendium36',
  'http://buyavowel.boards.net/page/compendium37',
  'http://buyavowel.boards.net/page/compendium38',
  'http://buyavowel.boards.net/page/compendium39',
  'http://buyavowel.boards.net/page/compendium40',
  'http://buyavowel.boards.net/page/compendiumwii',
]

var parser = new DOMParser()
var puzzles = [];
await 'asdf'

for (var link of links) {
    var resp = await fetch(link);
  var text = await resp.text();
  var dom = parser.parseFromString(text, 'text/html');
  var arr = Array.from(dom.querySelector('#zone_2 table').rows)
    .filter(el => el.style.backgroundColor != 'rgb(59, 185, 255)')
    .slice(1)
    .map(el => { return { category: el.cells[1].innerText, puzzle: el.cells[0].innerText } })
    .filter(puzzle => puzzle.category.length != 0 && puzzle.puzzle.length != 0);
  
  puzzles = puzzles.concat(arr);
}

console.log(JSON.stringify(puzzles))
*/

function printScores(context: WheelContext) {
  let i = 0;
  let str = '';

  for (let player of context.players) {
    let c = player == context.currentPlayer ? chalk.whiteBright.bold : chalk.white;
    c = i == 0 ? c.bgRed : i == 1 ? c.bgYellow : c.bgBlue;
    str += c(`${player.name}: \$${player.score}`)
    str += ' ';
    i++;
  }

  console.log(str);
}

function printBoard(context: WheelContext, fullBoard: boolean = false) {
  let category = context.category;
  let halfPad = 14 - category.length / 2;
  console.log(chalk.bgBlue.whiteBright(' '.repeat(Math.floor(halfPad)) + context.category + ' '.repeat(Math.ceil(halfPad))));
  console.log(Utils.getEmojiBoard(context.puzzle, fullBoard ? undefined : context.guessedLetters));
}

function printUsedLetters(context: WheelContext) {
  function inner(letter: string) {
    return context.guessedLetters.includes(letter) ? chalk.gray(letter) : chalk.whiteBright(letter.toUpperCase());
  }

  let avail = '  ';
  avail += 'abcdefghijklm'.split('').map(inner).join(' ');
  avail += '\n  ';
  avail += 'nopqrstuvwxyz'.split('').map(inner).join(' ');
  console.log(avail);
}

if (wheelMachine.options.delays) {
  wheelMachine.options.delays.PLAYER_IDLE_TIME = Math.pow(2, 32) / 2 - 1;
}

const wheelService = interpret(wheelMachine)
  .onTransition((state: any) => console.log(`New state: ${state.value}`))
  .start();

type WheelCallback = (state: typeof wheelService.initialState) => void;
function sub(stateName: any, cb: WheelCallback) {
  wheelService.subscribe(async state => {
    if (!state.matches(stateName)) return;
    cb(state);
  });
}

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

if (wheelService.getSnapshot().matches('waiting')) {
  wheelService.send('START_GAME');
}

sub('playerTurn', async state => {
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
      if (state.context.canSpin) choices.push({ name: 'Spin the wheel', value: 'SPIN_WHEEL' });
      if (state.context.canBuyVowel) choices.push({ name: 'Buy a vowel', value: 'BUY_VOWEL' });
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

sub('spinWheel', state => {
  if (state.context.spinAmount == 'bankrupt') {
    console.log(chalk.bgRed.whiteBright("BANKRUPT!"));
  } else if (state.context.spinAmount == 'lose-a-turn') {
    console.log(chalk.bgWhiteBright.black("LOSE A TURN!!"));
  } else {
    console.log(`You spun $${state.context.spinAmount}`);
  }
})

sub('guessConsonant', async state => {
  const { currentPlayer, guessedLetters } = state.context;

  const { letter } = await inquirer.prompt({
    type: 'input',
    name: 'letter',
    message: `${currentPlayer?.name}, choose a Consonant:`,
    validate: input => {
      if (input.length != 1) return 'Only one letter at a time!';
      if (guessedLetters.includes(input)) return 'Already guessed letter!';
      if (Utils.letterIsVowel(input)) return "Can't choose a vowel!";
      return true;
    }
  });

  wheelService.send('GUESS_LETTER', { letter });
});

sub('guessVowel', async state => {
  const { currentPlayer, guessedLetters } = state.context;

  const { letter } = await inquirer.prompt({
    type: 'input',
    name: 'letter',
    message: `${currentPlayer?.name}, choose a vowel:`,
    validate: input => {
      if (input.length != 1) return 'Only one letter at a time!';
      if (guessedLetters.includes(input)) return 'Already guessed letter!';
      if (!Utils.letterIsVowel(input)) return "Can't choose a consonant!";

      return true;
    }
  });

  wheelService.send('GUESS_LETTER', { letter });
});

sub('lettersInPuzzle', state => {
  const lastGuess = state.context.guessedLetters.slice(-1)[0];
  const count = Utils.countLettersInPuzzle(state.context.puzzle, lastGuess);
  const amt = typeof state.context.spinAmount != 'number' ? 0 : count * state.context.spinAmount;

  if (Utils.letterIsVowel(lastGuess)) {
    console.log(`There's ${count} ${lastGuess.toUpperCase()}${count > 1 ? 's' : ''}.`);
  } else {
    console.log(`There's ${count} ${lastGuess.toUpperCase()}${count > 1 ? 's' : ''}, you got $${amt}!`);
  }
});

sub('noLettersInPuzzle', state => {
  const lastGuess = state.context.guessedLetters.slice(-1)[0].toUpperCase();
  console.log(`There's no ${lastGuess} in the puzzle.`)
});

sub('puzzleGuessCorrect', state => {
  printScores(state.context);
  console.log();
  printBoard(state.context, true);
  console.log('You got it!');
});

sub('puzzleGuessWrong', state => {
  console.log('Incorrect guess.')
});

sub('gameOver', state => {
  console.log('Game over!');
  process.exit(0);
});