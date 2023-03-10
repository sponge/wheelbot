import { ActionRowBuilder, BaseMessageOptions, ButtonBuilder, EmbedBuilder, StringSelectMenuBuilder } from 'discord.js';

import ButtonPresets from './discord-buttonpresets.js';
import { PlayerColors, PlayerEmoji, WheelGame } from './discord-types.js';
import { Utils } from './fsm.js';

type MessageComponents = ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>[];

class Messages {
  // waiting for players and join/start buttons
  public static JoinMessage(game: WheelGame): BaseMessageOptions {
    const state = game.service.getSnapshot();
    const context = state.context;

    let content = state.matches('waiting') ? 'Join up and get ready to play!\n' : "Starting match, get ready!\n";
    if (state.matches('waiting') || context.players[0]) content += `${PlayerEmoji[0]} ${context.players[0]?.name ?? 'Join Now!'}\n`;
    if (state.matches('waiting') || context.players[1]) content += `${PlayerEmoji[1]} ${context.players[1]?.name ?? 'Join Now!'}\n`;
    if (state.matches('waiting') || context.players[2]) content += `${PlayerEmoji[2]} ${context.players[2]?.name ?? 'Join Now!'}\n`;

    return { content, components: state.matches('waiting') ? ButtonPresets.PreGame(game) : [] }
  }

  public static GameOver(game: WheelGame) {
    const state = game.service.getSnapshot();
    const context = state.context;

    const board = Utils.getEmojiBoard(context.puzzle);
    let description = `${PlayerEmoji[context.currentPlayerNum]} ${context.currentPlayer.name} has won **$${context.currentPlayer.score}**!\n\n`;
    description += '🎆🎇🎆🎇🎆🎇🎆🎇🎆🎇🎆🎇🎆🎇\n';
    description += `${board}\n`;
    description += '🎇🎆🎇🎆🎇🎆🎇🎆🎇🎆🎇🎆🎇🎆\n';

    const color = context.currentPlayerNum == 0 ? 0xCB3F49 : context.currentPlayerNum == 1 ? 0xF5CD6C : 0x6BAAE8;
    const embed = new EmbedBuilder()
      .setTitle(context.category)
      .setColor(color)
      .setDescription(description);

    return { embeds: [embed], components: [] };
  }

  // main scoreboard message
  public static PuzzleBoard(game: WheelGame, statusText: string, components: MessageComponents): BaseMessageOptions {
    const state = game.service.getSnapshot();
    const context = state.context;

    const board = Utils.getEmojiBoard(context.puzzle, context.guessedLetters);
    let description = `${statusText}\n\n${board}\n\n`

    for (let letter of 'abcdefghijklmnopqrstuvwxyz') {
      description += context.guessedLetters.includes(letter) ? Utils.darkGray[letter] : Utils.gray[letter];
      if (letter === 'm') description += '\n';
    }

    const embed = new EmbedBuilder()
      .setTitle(context.category)
      .setColor(PlayerColors[context.currentPlayerNum])
      .setDescription(description)

    let num = 0;
    for (let player of context.players) {
      embed.addFields({ name: `${PlayerEmoji[num++]} ${player.name}`, value: `$${player.score}`, inline: true });
    }

    return { embeds: [embed], components };
  }

}

export default Messages;