import { SlashCommandBuilder } from '@discordjs/builders';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';
import * as dotenv from 'dotenv';

dotenv.config();

const commands = [
	new SlashCommandBuilder().setName('wheel').setDescription('Starts a game of Wheel of Fortune.'),
	new SlashCommandBuilder().setName('stopwheel').setDescription('Ends the game prematurely.'),
].map(command => command.toJSON());

const rest = new REST({ version: '9' }).setToken(process.env.DISCORD_TOKEN);

await rest.put(
	Routes.applicationCommands(process.env.APPLICATION_ID),
	{ body: commands },
);