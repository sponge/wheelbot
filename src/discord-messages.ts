import { ActionRowBuilder, BaseMessageOptions, ButtonBuilder, EmbedBuilder, StringSelectMenuBuilder } from 'discord.js';

import ButtonPresets from './discord-buttonpresets.js';
import { WheelGame } from './discord-types.js';
import { Utils } from './fsm.js';

class Messages {
  // waiting for players and join/start buttons
  public static JoinMessage(game: WheelGame): BaseMessageOptions {
    // FIXME: show current players signed up with colors, nicer formatting
    const state = game.service.getSnapshot();

    if (!state.matches('waiting')) {
      return { content: "Let's get ready to play!", components: [] };
    }

    return { content: 'Join up and get ready to play!', components: ButtonPresets.PreGame(game) }
  }

  // main scoreboard message, action buttons are dynamic based on context
  public static PlayerTurnMessage(game: WheelGame, statusText: string): BaseMessageOptions {
    const state = game.service.getSnapshot();
    const context = state.context;

    const board = Utils.getEmojiBoard(context.puzzle, context.guessedLetters);
    const description = `\`\`\`${board}\`\`\`\n\n${statusText}`

    const color = context.currentPlayerNum == 0 ? 0xCB3F49 : context.currentPlayerNum == 1 ? 0xF5CD6C : 0x6BAAE8;

    const embed = new EmbedBuilder()
      .setTitle(context.category)
      .setColor(color)
      .setDescription(description)

    for (let player of context.players) {
      const emoji = context.currentPlayerNum == 0 ? ':red_circle:' : context.currentPlayerNum == 1 ? ':yellow_circle:' : ':blue_circle:';
      embed.addFields({ name: `${emoji} ${player.name}`, value: `$${player.score}`, inline: true });
    }

    let components: ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>[] = [];
    if (state.matches('playerTurn')) components = ButtonPresets.PlayerTurn(game);
    else if (state.matches('guessConsonant')) components = ButtonPresets.Letters(game);
    else if (state.matches('guessVowel')) components = ButtonPresets.Vowels(game);

    return { embeds: [embed], components };
  }

}

export default Messages;