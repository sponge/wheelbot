import { ActionRowBuilder, BaseMessageOptions, ButtonBuilder, EmbedBuilder, StringSelectMenuBuilder } from 'discord.js';

import ButtonPresets from './discord-buttonpresets.js';
import { WheelGame } from './discord-types.js';
import { Utils } from './fsm.js';

class Messages {
  // waiting for players and join/start buttons
  public static JoinMessage(game: WheelGame): BaseMessageOptions {
    // FIXME: show current players signed up with colors, nicer formatting
    const state = game.service.getSnapshot();
    const context = state.context;

    let content = state.matches('waiting') ? 'Join up and get ready to play!\n' : "Starting match, get ready!\n";
    if (state.matches('waiting') || context.players[0]) content += `:red_circle: ${context.players[0]?.name ?? 'Join Now!'}\n`;
    if (state.matches('waiting') || context.players[1]) content += `:yellow_circle: ${context.players[1]?.name ?? 'Join Now!'}\n`;
    if (state.matches('waiting') || context.players[2]) content += `:blue_circle: ${context.players[2]?.name ?? 'Join Now!'}\n`;

    return { content, components: state.matches('waiting') ? ButtonPresets.PreGame(game) : [] }
  }

  // main scoreboard message, action buttons are dynamic based on context
  public static PlayerTurnMessage(game: WheelGame, statusText: string): BaseMessageOptions {
    const state = game.service.getSnapshot();
    const context = state.context;

    const board = Utils.getEmojiBoard(context.puzzle, context.guessedLetters);
    let description = `${statusText}\n\n${board}\n\n`

    for (let letter of 'abcdefghijklmnopqrstuvwxyz') {
      description += context.guessedLetters.includes(letter) ? Utils.darkGray[letter] : Utils.gray[letter];
      if (letter === 'm') description += '\n';
    }

    const color = context.currentPlayerNum == 0 ? 0xCB3F49 : context.currentPlayerNum == 1 ? 0xF5CD6C : 0x6BAAE8;

    const embed = new EmbedBuilder()
      .setTitle(context.category)
      .setColor(color)
      .setDescription(description)

    let num = 0;
    for (let player of context.players) {
      const emoji = num == 0 ? ':red_circle:' : num == 1 ? ':yellow_circle:' : ':blue_circle:';
      embed.addFields({ name: `${emoji} ${player.name}`, value: `$${player.score}`, inline: true });
      num++;
    }

    let components: ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>[] = [];
    if (state.matches('playerTurn')) components = ButtonPresets.PlayerTurn(game);
    else if (state.matches('guessConsonant')) components = ButtonPresets.LettersSelect(game);
    else if (state.matches('guessVowel')) components = ButtonPresets.Vowels(game);

    return { embeds: [embed], components };
  }

}

export default Messages;