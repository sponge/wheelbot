import { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } from 'discord.js';
import { Interactions, WheelGame } from './discord-types.js';

class ButtonPresets {
  public static PreGame(game: WheelGame) {
    const state = game.service.getSnapshot();

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(Interactions.JoinGame)
        .setLabel('Join')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(Interactions.StartGame)
        .setLabel('Start Game!')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(state.context.players.length == 0),
    );

    return [row];
  }

  public static PlayerTurn(game: WheelGame) {
    const context = game.service.getSnapshot().context;

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

    return [row];
  }

  // public static LettersSelect(game: WheelGame) {
  //   const context = game.service.getSnapshot().context;

  //   const options = [];
  //   for (let letter of 'bcdfghjklmnpqrstvwxyz') {
  //     options.push({ label: letter, value: letter });
  //   }

  //   const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
  //     new StringSelectMenuBuilder()
  //       .setCustomId('guess')
  //       .setPlaceholder('Select a letter!')
  //       .addOptions(options)
  //   );

  //   return [row];
  // }

  public static Letters(game: WheelGame) {
    const context = game.service.getSnapshot().context;

    const buttons = [];
    for (let letter of 'bcdfghjklmnpqrstvwxyz') {
      buttons.push(new ButtonBuilder()
        .setCustomId(letter)
        .setLabel(letter.toUpperCase())
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(context.guessedLetters.includes(letter))
      );
    }

    const components = [
      new ActionRowBuilder<ButtonBuilder>().addComponents(buttons.slice(0, 5)),
      new ActionRowBuilder<ButtonBuilder>().addComponents(buttons.slice(5, 10)),
      new ActionRowBuilder<ButtonBuilder>().addComponents(buttons.slice(10, 15)),
      new ActionRowBuilder<ButtonBuilder>().addComponents(buttons.slice(15, 20)),
      new ActionRowBuilder<ButtonBuilder>().addComponents(buttons.slice(20, 25)),
    ];

    return components;
  }

  public static Vowels(game: WheelGame) {
    const context = game.service.getSnapshot().context;

    const components = new ActionRowBuilder<ButtonBuilder>();
    for (let letter of 'aeiou') {
      components.addComponents(new ButtonBuilder()
        .setCustomId(letter)
        .setLabel(letter.toUpperCase())
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(context.guessedLetters.includes(letter))
      );
    }

    return [components];
  }
}

export default ButtonPresets;