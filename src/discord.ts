import { ActionRowBuilder, Client, Events, ModalActionRowComponentBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import * as dotenv from 'dotenv';
import { interpret } from 'xstate';

import Messages from './discord-messages.js';
import { Interactions, StateHandler, WheelGame } from './discord-types.js';
import { createWheelMachine } from './fsm.js';

dotenv.config();

const client = new Client({ intents: [] });
const games: Map<string, WheelGame> = new Map();

client.once(Events.ClientReady, c => {
  console.log(`Ready! Logged in as ${c.user.tag}`);
});

// handle the /wheel interaction and setup a new game
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isCommand()) return;

  if (interaction.commandName == 'stopwheel') {
    if (!games.has(interaction.channelId)) {
      await interaction.reply({ content: "No game currently active in this channel", ephemeral: true });
      return;
    }
    const game: WheelGame = games.get(interaction.channelId)!;
    game.service.stop();
    games.delete(interaction.channelId);

    await interaction.reply({ content: "Ending game." });
    return;
  }
  
  if (interaction.commandName != 'wheel') return;

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
    .onTransition(state => interaction.channel?.send({ content: `New state: ${state.value}` }))
    .start();

  const game: WheelGame = {
    channel: interaction.channel,
    service: wheelService,
    currentMessage: null
  }
  games.set(interaction.channelId, game);

  // setup dispatcher for this game's fsm changes
  wheelService.subscribe(async state => {
    stateHandlers[state.value as string]?.onTransition?.(state, game);
  });

  interaction.reply(Messages.JoinMessage(game));
});

// setup discord button handler dispatcher
client.on(Events.InteractionCreate, interaction => {
  if (!interaction || !interaction.channelId) return;
  if (!games.has(interaction.channelId)) return;

  const game: WheelGame = games.get(interaction.channelId)!;
  const state = game.service.getSnapshot();

  if (interaction.isButton()) {
    stateHandlers[state.value as string]?.buttonHandler?.(interaction, game);
  } else if (interaction.isModalSubmit()) {
    stateHandlers[state.value as string]?.modalHandler?.(interaction, game);
  } else if (interaction.isStringSelectMenu()) {
    stateHandlers[state.value as string]?.selectHandler?.(interaction, game);
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

      if (game.currentMessage) {
        game.currentMessage.edit({ embeds: game.currentMessage.embeds, components: [] });
      }

      game.currentMessage = await game.channel.send(Messages.PlayerTurnMessage(game, `${context.currentPlayer.name}, it's your turn!`));
    },

    modalHandler: async (interaction, game) => {
      // FIXME: check if correct player, send ephemeral message to wait their turn

      const guess = interaction.fields.getTextInputValue('solve-input')
      game.service.send('SOLVE_PUZZLE', { guess })
      await interaction.reply({ content: 'Your submission was received successfully!' });
    },

    buttonHandler: async (interaction, game) => {
      // FIXME: check if correct player, send ephemeral message to wait their turn

      switch (interaction.customId) {
        case Interactions.SpinWheel:
          game.service.send('SPIN_WHEEL');
          interaction.update(Messages.PlayerTurnMessage(game, 'FIXME'));
          break;

        case Interactions.BuyVowel:
          game.service.send('BUY_VOWEL');
          interaction.update(Messages.PlayerTurnMessage(game, 'FIXME'));
          break;

        case Interactions.SolvePuzzle:
          // Create the modal
          const modal = new ModalBuilder()
            .setCustomId('solve-modal')
            .setTitle('Solve Puzzle');

          const solveInput = new TextInputBuilder()
            .setCustomId('solve-input')
            .setLabel("What's the answer?")
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

          const row = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(solveInput);
          modal.addComponents(row);
          await interaction.showModal(modal);
          break;
      }
    }
  },

  guessConsonant: {
    onTransition: async (state, game) => {
      const context = game.service.getSnapshot().context;
      game.currentMessage?.edit(Messages.PlayerTurnMessage(game, `${context.currentPlayer.name}, select a letter.`));
    },

    selectHandler(interaction, game) {
      // FIXME: check if correct player, send ephemeral message to wait their turn
      game.service.send('GUESS_LETTER', { letter: interaction.values[0] })
      interaction.update(Messages.PlayerTurnMessage(game, 'FIXME'));
    }
  },

  guessVowel: {
    onTransition: async (state, game) => {
      const context = game.service.getSnapshot().context;
      game.currentMessage?.edit(Messages.PlayerTurnMessage(game, `${context.currentPlayer.name}, buy a vowel.`));
    },

    buttonHandler(interaction, game) {
      // FIXME: check if correct player, send ephemeral message to wait their turn
      game.service.send('GUESS_LETTER', { letter: interaction.customId })
      interaction.update(Messages.PlayerTurnMessage(game, 'FIXME'));
    }
  },

};

client.login(process.env.DISCORD_TOKEN);