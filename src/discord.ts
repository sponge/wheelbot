import { ActionRowBuilder, Client, Events, ModalActionRowComponentBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import * as dotenv from 'dotenv';
import { interpret } from 'xstate';
import ButtonPresets from './discord-buttonpresets.js';

import Messages from './discord-messages.js';
import { Interactions, StateHandler, WheelGame } from './discord-types.js';
import { createWheelMachine } from './fsm.js';
import Utils from './util.js';

dotenv.config();

const client = new Client({ intents: [] });
const games: Map<string, WheelGame> = new Map();

client.once(Events.ClientReady, c => {
  console.log(`Ready! Logged in as ${c.user.tag}`);
});

client.login(process.env.DISCORD_TOKEN);

function stopGame(id: string) {
  const game: WheelGame = games.get(id)!;
  game.service.stop();
  games.delete(id);
}

client.on(Events.InteractionCreate, async interaction => {
  // handle wheel up here since it should override commands from a specific state
  if (interaction.isCommand() && interaction.commandName == 'wheel') {
    await interaction.guild?.channels.fetch();

    if (games.has(interaction.channelId)) {
      await interaction.reply({ content: "A game is already active in this channel.", ephemeral: true });
      return;
    }

    if (interaction.channel == null) {
      await interaction.reply({ content: "Can't start a game here, sorry!", ephemeral: true });
      return;
    }

    // we good, setup the game and save it to active games
    const wheelService = interpret(createWheelMachine())
      .start();

    const game: WheelGame = {
      channel: interaction.channel,
      service: wheelService,
      currentMessage: null,
      lastGuess: '',
    }
    games.set(interaction.channelId, game);

    // setup dispatcher for this game's fsm changes
    wheelService.subscribe(async state => {
      if (stateHandlers[state.value as string] ) {
        stateHandlers[state.value as string].onTransition?.(state, game);
      } else {
        interaction.channel?.send({ content: `Unhandled state change: ${state.value}` });
      }
    });

    interaction.reply(Messages.JoinMessage(game));
    return;

  // handle ending the game
  } else if (interaction.isCommand() && interaction.commandName == 'stopwheel') {
    if (!games.has(interaction.channelId)) {
      await interaction.reply({ content: "No game currently active in this channel", ephemeral: true });
      return;
    }
    
    stopGame(interaction.channelId);
    await interaction.reply({ content: "Ending game." });

    return;

  // if game is active in the channel, pass it off to a handler
  } else if (interaction.channelId && games.has(interaction.channelId)) {
    const game: WheelGame = games.get(interaction.channelId)!;
    const state = game.service.getSnapshot();

    if (interaction.isButton()) {
      stateHandlers[state.value as string]?.buttonHandler?.(interaction, game);
    } else if (interaction.isModalSubmit()) {
      stateHandlers[state.value as string]?.modalHandler?.(interaction, game);
    } else if (interaction.isStringSelectMenu()) {
      stateHandlers[state.value as string]?.selectHandler?.(interaction, game);
    } else if (interaction.isCommand()) {
      const handled: boolean = stateHandlers[state.value as string]?.commandHandler?.(interaction, game) ?? false;
      if (!handled) {
        interaction.reply({ content: 'Command not valid', ephemeral: true })
      }
    }
  }
});

const stateHandlers: { [key: string]: StateHandler } = {
  waiting: {
    // waiting onTransition handled in initial creation
    buttonHandler: (interaction, game) => {
      switch (interaction.customId) {
        case Interactions.JoinGame:
          // FIXME: check player uniqueness
          game.service.send('NEW_PLAYER', { playerName: interaction.user });
          break;

        case Interactions.StartGame:
          game.service.send('START_GAME');
          break;
      }

      interaction.update(Messages.JoinMessage(game));
    }
  },

  playerTurn: {
    onTransition: async (state, game) => {
      const context = game.service.getSnapshot().context;
      console.log(context.puzzle);

      if (game.currentMessage) {
        game.currentMessage.edit({ components: [] });
      }

      const status = `${context.currentPlayer.name}, it's your turn!`;
      game.currentMessage = await game.channel.send(Messages.PuzzleBoard(game, status, ButtonPresets.PlayerTurn(game)));
    },

    commandHandler(interaction, game) {
      // FIXME: implement /solve
      return false;
    },

    modalHandler: async (interaction, game) => {
      // FIXME: check if correct player, send ephemeral message to wait their turn

      const guess = interaction.fields.getTextInputValue('solve-input');
      game.lastGuess = guess;
      game.service.send('SOLVE_PUZZLE', { guess })

      let content = game.service.getSnapshot().matches('puzzleGuessCorrect') ? 'You got it!' : "Sorry, that's not correct.";
      await interaction.reply({ content, ephemeral: true });
    },

    buttonHandler: async (interaction, game) => {
      // FIXME: check if correct player, send ephemeral message to wait their turn

      switch (interaction.customId) {
        case Interactions.SpinWheel:
          game.service.send('SPIN_WHEEL');
          interaction.deferUpdate();
          break;

        case Interactions.BuyVowel:
          game.service.send('BUY_VOWEL');
          interaction.deferUpdate();
          break;

        case Interactions.SolvePuzzle:
          const modal = new ModalBuilder()
            .setCustomId('solve-modal')
            .setTitle('Solve Puzzle');

          const context = game.service.getSnapshot().context;
          let placeholder = Array.from(context.puzzle).map(
            letter => !Utils.isAnyLetter(letter) || context.guessedLetters.includes(letter) ? letter : '_'
          ).join('');
          
          const solveInput = new TextInputBuilder()
            .setCustomId('solve-input')
            .setLabel(placeholder)
            .setStyle(TextInputStyle.Short)
            .setMinLength(context.puzzle.length)
            .setMaxLength(context.puzzle.length)
            .setRequired(true);

          const row = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(solveInput);
          modal.addComponents(row);
          await interaction.showModal(modal);
          break;
      }
    }
  },

  spinWheel: {
    onTransition: async (state, game) => {
      const context = game.service.getSnapshot().context;
      let status:string = '';
      if (context.spinAmount == 'bankrupt') {
        status = `:money_with_wings: **BANKRUPT!**`
      } else if (context.spinAmount == 'lose-a-turn') {
        status = `:no_entry_sign: **LOSE A TURN!**`
      } else {
        status = `:dollar: You spun **$${context.spinAmount}**.\n`;
      }

      game.currentMessage?.edit(Messages.PuzzleBoard(game, status, []));
    }
  },

  guessConsonant: {
    onTransition: async (state, game) => {
      const context = game.service.getSnapshot().context;
      let status = `:dollar: You spun **$${context.spinAmount}**.\n`;
      status += `${context.currentPlayer.name}, select a consonant.`;
      game.currentMessage?.edit(Messages.PuzzleBoard(game, status, ButtonPresets.LettersSelect(game)));
    },

    commandHandler(interaction, game) {
      if (interaction.commandName != 'guess') {
        return false;
      }

      // FIXME: check if correct player, send ephemeral message to wait their turn

      // FIXME: why doesn't getString work? stupid typescript?
      const letter: string = interaction.options.get('letter')?.value?.toString() ?? '';
      game.service.send('GUESS_LETTER', { letter });
      interaction.reply({ content: 'Guessed letter.', ephemeral: true });
      return true;
    },

    selectHandler(interaction, game) {
      // FIXME: check if correct player, send ephemeral message to wait their turn
      game.service.send('GUESS_LETTER', { letter: interaction.values[0] })
    }
  },

  guessVowel: {
    onTransition: async (state, game) => {
      const context = game.service.getSnapshot().context;
      const status = `${context.currentPlayer.name}, buy a vowel.`;
      game.currentMessage?.edit(Messages.PuzzleBoard(game, status, ButtonPresets.Vowels(game)));
    },

    commandHandler(interaction, game) {
      if (interaction.commandName != 'guess') {
        return false;
      }

      // FIXME: check if correct player, send ephemeral message to wait their turn

      // FIXME: why doesn't getString work? stupid typescript?
      const letter: string = interaction.options.get('letter')?.value?.toString() ?? '';
      game.service.send('GUESS_LETTER', { letter });
      interaction.reply({ content: 'Guessed letter.', ephemeral: true });
      return true;
    },

    buttonHandler(interaction, game) {
      // FIXME: check if correct player, send ephemeral message to wait their turn
      game.service.send('GUESS_LETTER', { letter: interaction.customId })
    }
  },

  lettersInPuzzle: {
    onTransition: async (state, game) => {
      const context = game.service.getSnapshot().context;
      const letter = context.guessedLetters.slice(-1)[0];

      const count = Utils.countLettersInPuzzle(context.puzzle, letter);
      const cash = count * (context.spinAmount as number);

      let status; 
      if (count == 1) {
        status = `:white_check_mark: There is **${count} ${letter.toUpperCase()}** in there!`;
      } else {
        status = `:white_check_mark: There are **${count} ${letter.toUpperCase()}**s in there!`;
      }

      if (!Utils.letterIsVowel(letter)) {
        status += `\n:dollar: You got **$${cash}**`;
      }
      
      game.currentMessage?.edit(Messages.PuzzleBoard(game, status, []));
    }
  },

  noLettersInPuzzle: {
    onTransition: async (state, game) => {
      const context = game.service.getSnapshot().context;
      const letter = context.guessedLetters.slice(-1)[0].toUpperCase();
      let status = `:x: Sorry, there is no **${letter}**.`;
      game.currentMessage?.edit(Messages.PuzzleBoard(game, status, []));
    }
  },

  gameOver: {
    onTransition: async (state, game) => {
      const context = game.service.getSnapshot().context;
      game.currentMessage?.edit(Messages.GameOver(game));
      stopGame(game.channel.id);
    }    
  },

  puzzleGuessCorrect: {
    // handled by gameover
  },

  puzzleGuessWrong: {
    onTransition: async (state, game) => {
      let status = `:x: Sorry, "**${game.lastGuess}**" is not correct.`;
      game.currentMessage?.edit(Messages.PuzzleBoard(game, status, []));
    }
  },

};