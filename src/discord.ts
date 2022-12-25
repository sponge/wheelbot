import { Action, interpret, State } from 'xstate';
import { ActionRowBuilder, Awaitable, BaseMessageOptions, ButtonBuilder, ButtonInteraction, ButtonStyle, CacheType, Client, Collection, EmbedBuilder, Events, Interaction, Message, MessageCreateOptions, ModalActionRowComponentBuilder, ModalBuilder, ModalSubmitInteraction, SlashCommandBuilder, TextBasedChannel, TextInputBuilder, TextInputStyle } from 'discord.js';
import * as dotenv from 'dotenv';

import { Utils, wheelMachine } from './fsm.js';

dotenv.config();

// FIXME: dumb type hack
const hackWheelService = interpret(wheelMachine);

interface WheelGame {
  channel: TextBasedChannel;
  service: typeof hackWheelService;
  currentMessage: Message | null,
}

interface StateHandler {
  onTransition?: (state: typeof hackWheelService.initialState, game: WheelGame) => void;
  interactionHandler?: (interaction: ButtonInteraction<CacheType>, game: WheelGame) => Awaitable<void>;
  modalHandler?: (interaction: ModalSubmitInteraction<CacheType>, game: WheelGame) => Awaitable<void>;

}

enum Interactions {
  JoinGame = 'join-game',
  StartGame = 'start-game',
  SpinWheel = 'spin-wheel',
  BuyVowel = 'buy-vowel',
  SolvePuzzle = 'solve-puzzle',
}

function simpleEmbed(title: string, description: string, color?: number) {
  return new EmbedBuilder()
    .setTitle(title)
    .setColor(color ?? 0x000d8b)
    .setDescription(description);
}

class Messages {
  public static joinMessage(game: WheelGame): BaseMessageOptions {
    const components: ActionRowBuilder<ButtonBuilder>[] = [];

    if (!game.service.getSnapshot().matches('waiting')) {
      return { content: "Let's get ready to play!", components: [] };
    }

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(Interactions.JoinGame)
        .setLabel('Join')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(Interactions.StartGame)
        .setLabel('Start Game!')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(game.service.getSnapshot().context.players.length == 0),
    );

    return { content: 'Join up and get ready to play!', components: [row] }
  }

  public static PlayerTurnMessage(game: WheelGame, statusText: string): BaseMessageOptions {
    const context = game.service.getSnapshot().context;

    const board = Utils.getEmojiBoard(context.puzzle, context.guessedLetters);
    const description = `${board}\n\n${statusText}`

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(Interactions.SpinWheel)
        .setLabel('Spin')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(!context.canSpin),
      new ButtonBuilder()
        .setCustomId(Interactions.BuyVowel)
        .setLabel('Buy a Vowel')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(!context.canBuyVowel),
      new ButtonBuilder()
        .setCustomId(Interactions.SolvePuzzle)
        .setLabel('Solve')
        .setStyle(ButtonStyle.Secondary),
    );

    const color = context.currentPlayerNum == 0 ? 0xCB3F49 : context.currentPlayerNum == 1 ? 0xF5CD6C : 0x6BAAE8;

    const embed = new EmbedBuilder()
      .setTitle(context.category)
      .setColor(color)
      .setDescription(description)

    for (let player of context.players) {
      const emoji = context.currentPlayerNum == 0 ? ':red_circle:' : context.currentPlayerNum == 1 ? ':yellow_circle:' : ':blue_circle:';
      embed.addFields({ name: `${emoji} ${player.name}`, value: `$${player.score}`, inline: true });
    }

    return { embeds: [embed], components: [row] };
  }

}

// main
const client = new Client({ intents: [] });
const games: Map<string, WheelGame> = new Map();

client.once(Events.ClientReady, c => {
  console.log(`Ready! Logged in as ${c.user.tag}`);
});

// handle the /wheel interaction and setup a new game
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isCommand()) return;
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
  const wheelService = interpret(wheelMachine)
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

  interaction.reply(Messages.joinMessage(game));
});

// setup discord button handler dispatcher
client.on(Events.InteractionCreate, interaction => {
  if (!interaction || !interaction.channelId) return;
  if (!games.has(interaction.channelId)) return;

  const game: WheelGame = games.get(interaction.channelId)!;
  const state = game.service.getSnapshot();

  if (interaction.isButton()) {
    stateHandlers[state.value as string]?.interactionHandler?.(interaction, game);
  } else if (interaction.isModalSubmit()) {
    stateHandlers[state.value as string]?.modalHandler?.(interaction, game);
  }
});

const stateHandlers: { [key: string]: StateHandler } = {
  waiting: {
    // waiting onTransition handled in initial creation
    interactionHandler: (interaction, game) => {
      switch (interaction.customId) {
        case Interactions.JoinGame:
          // FIXME: check player uniqueness
          game.service.send('NEW_PLAYER', { playerName: interaction.user });
          break;

        case Interactions.StartGame:
          game.service.send('START_GAME');
          break;
      }

      interaction.update(Messages.joinMessage(game));
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
      game.service.send('SOLVE_PUZZLE', {guess})
      await interaction.reply({ content: 'Your submission was received successfully!' });
    },

    interactionHandler: async (interaction, game) => {
      // FIXME: check if correct player, send ephemeral message to wait their turn

      switch (interaction.customId) {
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
      }
    }
  }

};

client.login(process.env.DISCORD_TOKEN);