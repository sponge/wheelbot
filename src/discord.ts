import { ActionRowBuilder, ButtonInteraction, ButtonStyle, Client, CommandInteraction, Events, GatewayIntentBits, GuildChannel, ModalActionRowComponentBuilder, ModalBuilder, ModalSubmitInteraction, StringSelectMenuInteraction, TextChannel, TextInputBuilder, TextInputStyle } from 'discord.js';
import * as dotenv from 'dotenv';
import { interpret } from 'xstate';
import ButtonPresets from './discord-buttonpresets.js';

import Messages from './discord-messages.js';
import * as Stats from './discord-stats.js';
import { Interactions, StateHandler, WheelGame } from './discord-types.js';
import { createWheelMachine } from './fsm.js';
import Utils from './util.js';

dotenv.config();

const client = new Client({ intents: [GatewayIntentBits.GuildMembers, GatewayIntentBits.Guilds] });
const games: Map<string, WheelGame> = new Map();
await Stats.loadStats();

// FIXME: exception handling kills the process, should just end the game instead

client.once(Events.ClientReady, c => {
  console.log(`Ready! Logged in as ${c.user.tag}`);
});

client.login(process.env.DISCORD_TOKEN);

function stopGame(id: string) {
  const game: WheelGame = games.get(id)!;
  game.service.stop();
  games.delete(id);
}

function isCurrentPlayerInteracting(interaction: ModalSubmitInteraction | ButtonInteraction | CommandInteraction | StringSelectMenuInteraction, game: WheelGame) {
  const context = game.service.getSnapshot().context;

  if (interaction.user.id != context.currentPlayer.id) {
    interaction.reply({ content: "Chill out, it's not your turn", ephemeral: true })
    return false;
  }

  return true;
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
      if (stateHandlers[state.value as string]) {
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

  } else if (interaction.isCommand() && interaction.commandName == 'wheelstats') {
    // FIXME: dumb typescript hack, why?
    const members = (interaction.channel as GuildChannel).members;
    await interaction.reply( { embeds: [await Stats.statsMessage(client, members)] });

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
          if (process.env.ENVIRONMENT != 'development') {
            const context = game.service.getSnapshot().context;
            if (context.players.some(player => interaction.user.id == player.id)) {
              interaction.reply({ content: "You're already signed up to play!", ephemeral: true });
              return;
            }
          }
          game.service.send('NEW_PLAYER', { playerName: interaction.user.username, id: interaction.user.id });
          break;

        case Interactions.StartGame:
          game.service.send('START_GAME');
          break;
      }

      interaction.update(Messages.JoinMessage(game));
    }
  },

  nextPlayerTurn: {
    onTransition(state, game) {
      // detect idle timeout
      // FIXME: currentPlayer is already changed, so the border color updates incorrectly
      if (state.history?.value == 'playerTurn') {
        const status = `🪦 ${state.context.currentPlayer.name} was AFK, skipping turn.\n`;
        game.currentMessage?.edit(Messages.PuzzleBoard(game, status, []));
      }

      // new player, new message
      game.currentMessage?.edit({ components: [] });
      game.currentMessage = null;
    },
  },

  playerTurn: {
    onTransition: async (state, game) => {
      const context = game.service.getSnapshot().context;

      if (process.env.ENVIRONMENT == 'development') {
        // sneaky lil cheatsy
        console.log(context.puzzle);
      }

      const status = `⏳ ${context.currentPlayer.name}, it's your turn!\n`;
      const msg = Messages.PuzzleBoard(game, status, ButtonPresets.PlayerTurn(game));
      msg.content = `${client.users.cache.get(context.currentPlayer.id)}`;

      if (game.currentMessage) {
        game.currentMessage = await game.currentMessage.edit(msg);
      } else {
        game.currentMessage = await game.channel.send(msg);
      }
    },

    commandHandler(interaction, game) {
      if (interaction.commandName != 'solve') {
        return false;
      }

      if (!isCurrentPlayerInteracting(interaction, game)) {
        return true;
      }

      // FIXME: why doesn't getString work? stupid typescript?
      const guess: string = interaction.options.get('guess')?.value?.toString() ?? '';
      game.lastGuess = guess;
      game.service.send('SOLVE_PUZZLE', { guess });
      interaction.reply({ content: 'Puzzle solution sent.', ephemeral: true });
      return true;
    },

    modalHandler: async (interaction, game) => {
      if (!isCurrentPlayerInteracting(interaction, game)) {
        return;
      }

      const guess = interaction.fields.getTextInputValue('solve-input');
      game.lastGuess = guess;
      game.service.send('SOLVE_PUZZLE', { guess })

      let content = game.service.getSnapshot().matches('puzzleGuessCorrect') ? 'You got it!' : "Sorry, that's not correct.";
      await interaction.reply({ content, ephemeral: true });
    },

    buttonHandler: async (interaction, game) => {
      const context = game.service.getSnapshot().context;

      if (!isCurrentPlayerInteracting(interaction, game)) {
        return;
      }

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
      let status: string, buttonStatus: string;
      let buttonStyle: ButtonStyle;
      if (context.spinAmount == 'bankrupt') {
        status = `💸 **BANKRUPT!**\n`;
        buttonStatus = `💸 BANKRUPT!`;
        buttonStyle = ButtonStyle.Danger;
      } else if (context.spinAmount == 'lose-a-turn') {
        status = `🚫 **LOSE A TURN!**\n`;
        buttonStatus = `🚫 LOSE A TURN!`;
        buttonStyle = ButtonStyle.Danger;
      } else {
        status = `💵 You spun **$${context.spinAmount}**.\n`;
        buttonStatus = `💵 You spun $${context.spinAmount}.\n`;
        buttonStyle = ButtonStyle.Success;
      }

      game.currentMessage?.edit(Messages.PuzzleBoard(game, status, ButtonPresets.DisabledButton(buttonStatus, buttonStyle)));
    }
  },

  guessConsonant: {
    onTransition: async (state, game) => {
      const context = game.service.getSnapshot().context;
      let status = `:dollar: You spun **$${context.spinAmount}**.\n`;
      status += `⏳ ${context.currentPlayer.name}, select a consonant.`;
      game.currentMessage?.edit(Messages.PuzzleBoard(game, status, ButtonPresets.LettersSelect(game)));
    },

    commandHandler(interaction, game) {
      if (interaction.commandName != 'guess') {
        return false;
      }

      if (!isCurrentPlayerInteracting(interaction, game)) {
        return true;
      }

      // FIXME: why doesn't getString work? stupid typescript?
      const letter: string = interaction.options.get('letter')?.value?.toString() ?? '';
      game.service.send('GUESS_LETTER', { letter });
      interaction.reply({ content: 'Guessed letter.', ephemeral: true });
      return true;
    },

    selectHandler(interaction, game) {
      if (!isCurrentPlayerInteracting(interaction, game)) {
        return;
      }

      game.service.send('GUESS_LETTER', { letter: interaction.values[0] })
      interaction.deferUpdate();
    }
  },

  guessVowel: {
    onTransition: async (state, game) => {
      const context = game.service.getSnapshot().context;
      const status = `⏳ ${context.currentPlayer.name}, buy a vowel.\n`;
      game.currentMessage?.edit(Messages.PuzzleBoard(game, status, ButtonPresets.Vowels(game)));
    },

    commandHandler(interaction, game) {
      if (interaction.commandName != 'guess') {
        return false;
      }

      if (!isCurrentPlayerInteracting(interaction, game)) {
        return true;
      }

      // FIXME: why doesn't getString work? stupid typescript?
      const letter: string = interaction.options.get('letter')?.value?.toString() ?? '';
      game.service.send('GUESS_LETTER', { letter });
      interaction.reply({ content: 'Guessed letter.', ephemeral: true });
      return true;
    },

    buttonHandler(interaction, game) {
      if (!isCurrentPlayerInteracting(interaction, game)) {
        return;
      }

      game.service.send('GUESS_LETTER', { letter: interaction.customId })
      interaction.deferUpdate();
    }
  },

  lettersInPuzzle: {
    onTransition: async (state, game) => {
      const context = game.service.getSnapshot().context;
      const letter = context.guessedLetters.slice(-1)[0];

      const count = Utils.countLettersInPuzzle(context.puzzle, letter);
      const cash = count * (context.spinAmount as number);

      let status: string, buttonStatus: string;
      if (count == 1) {
        status = `✅ There is **${count} ${letter.toUpperCase()}** in there!\n`;
        buttonStatus = `✅ There is ${count} ${letter.toUpperCase()} in there!`;
      } else {
        status = `✅ There are **${count} ${letter.toUpperCase()}**s in there!\n`;
        buttonStatus = `✅ There are ${count} ${letter.toUpperCase()}s in there!`;
      }

      if (!Utils.letterIsVowel(letter)) {
        status += `:dollar: You got **$${cash}**`;
      }

      Stats.updateLetterGuessStats(context.currentPlayer.id, true);

      game.currentMessage?.edit(Messages.PuzzleBoard(game, status, ButtonPresets.DisabledButton(buttonStatus, ButtonStyle.Success)));
    }
  },

  noLettersInPuzzle: {
    onTransition: async (state, game) => {
      const context = game.service.getSnapshot().context;
      const letter = context.guessedLetters.slice(-1)[0].toUpperCase();
      let status = `❌ Sorry, there is no **${letter}**.\n`;
      let ButtonStatus = `❌ Sorry, there is no ${letter}.`;

      Stats.updateLetterGuessStats(context.currentPlayer.id, false);

      game.currentMessage?.edit(Messages.PuzzleBoard(game, status, ButtonPresets.DisabledButton(ButtonStatus, ButtonStyle.Danger)));
    }
  },

  gameOver: {
    onTransition: async (state, game) => {
      const context = game.service.getSnapshot().context;
      game.currentMessage?.edit(Messages.GameOver(game));
      stopGame(game.channel.id);
      Stats.endGameStats(context);
    }
  },

  puzzleGuessCorrect: {
    // handled by gameover
  },

  puzzleGuessWrong: {
    onTransition: async (state, game) => {
      let status = `:x: Sorry, "**${game.lastGuess}**" is not correct.\n`;
      game.currentMessage?.edit(Messages.PuzzleBoard(game, status, []));
    }
  },

};