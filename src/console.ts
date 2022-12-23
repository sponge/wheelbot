import { interpret } from 'xstate';
import inquirer from 'inquirer';
import chalk from 'chalk';

import { wheelMachine, WheelContext } from './fsm.js'

function printScores(context: WheelContext) {
  let i = 0;
  for (let player of context.players) {
    const c = i == 0 ? chalk.white.bgRed : i == 1 ? chalk.white.bgYellow : chalk.white.bgBlue;
    console.log(c(`${player.name}: \$${player.score}`))
    i++;
  }
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

  const currentPlayer = state.context.players[state.context.currentPlayer];

  printScores(state.context);

  const { action } = await inquirer.prompt({
    type: 'list',
    name: 'action',
    message: `${currentPlayer.name}, it's your turn:`,
    choices: [
      { name: 'Spin the wheel', value: 'SPIN_WHEEL' },
      { name: 'Buy a vowel', value: 'BUY_VOWEL' },
      { name: 'Solve the puzzle', value: 'SOLVE_PUZZLE' },
    ],
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
