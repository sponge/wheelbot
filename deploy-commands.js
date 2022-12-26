import { SlashCommandBuilder } from '@discordjs/builders';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';
import * as dotenv from 'dotenv';

dotenv.config();

const commands = [
  new SlashCommandBuilder().setName('wheel').setDescription('Starts a game of Wheel of Fortune.'),
  new SlashCommandBuilder().setName('stopwheel').setDescription('Ends the game prematurely.'),
  new SlashCommandBuilder().setName('guess').setDescription('Guess a letter on your turn.')
    .addStringOption(option =>
      option.setName('letter')
        .setMinLength(1)
        .setMaxLength(1)
        .setRequired(true)
        .setDescription('Letter to select')
    ),
  new SlashCommandBuilder().setName('solve').setDescription('Solve the puzzle on your turn.')
    .addStringOption(option =>
      option.setName('guess')
        .setRequired(true)
        .setDescription('The puzzle solution, including punctuation.')
    ),

].map(command => command.toJSON());

const rest = new REST({ version: '9' }).setToken(process.env.DISCORD_TOKEN);

await rest.put(
  Routes.applicationCommands(process.env.APPLICATION_ID),
  { body: commands },
);