import { Client, Collection, EmbedBuilder, GuildMember } from 'discord.js';
import { readFile, writeFile } from 'node:fs/promises'
import { WheelGame } from './discord-types';
import { WheelContext } from './fsm';

interface WheelPlayerStats {
  earnings: number,
  correctLetters: number,
  wrongLetters: number,
  lettersAccuracy: number,
  roundsLost: number,
  roundsWon: number
  roundWinPct: number,
}

const filename = './stats.json';

let stats: { [key: string]: WheelPlayerStats } = {};

function getPlayer(id: string): WheelPlayerStats {
  if (id in stats == false) {
    stats[id] = {
      earnings: 0,
      correctLetters: 0,
      wrongLetters: 0,
      lettersAccuracy: 0,
      roundsLost: 0,
      roundsWon: 0,
      roundWinPct: 0
    };
  }

  return stats[id];
}

async function loadStats() {
  try {
    const contents = await readFile(filename, { encoding: 'utf-8' });
    stats = JSON.parse(contents);
  } catch (e) {
    console.log("No stats.json found, starting new stats");
  }
}

function saveStats() {
  writeFile(filename, JSON.stringify(stats, null, 2));
}

function updateLetterGuessStats(id: string, correct: boolean) {
  const player = getPlayer(id);
  player.correctLetters += correct ? 1 : 0;
  player.wrongLetters += correct ? 0 : 1;
  player.lettersAccuracy = player.correctLetters / (player.correctLetters + player.wrongLetters) * 100;

  saveStats();
}

function endGameStats(context: WheelContext) {
  for (let player of context.players) {
    const playerStats = getPlayer(player.id);
    playerStats.roundsLost += player.id != context.currentPlayer.id ? 1 : 0;
    playerStats.roundsWon += player.id == context.currentPlayer.id ? 1 : 0;
    playerStats.roundWinPct = playerStats.roundsWon / (playerStats.roundsWon + playerStats.roundsLost) * 100;

    if (player.id == context.currentPlayer.id) {
      playerStats.earnings += player.score;
    }
  }

  saveStats();
}

type BoardName = string;
type Leaderboard = [string, string][];
type LeaderboardList = [BoardName, Leaderboard];

async function statsMessage(games: Map<string, WheelGame>, client: Client<boolean>, members: Collection<string, GuildMember>): Promise<EmbedBuilder> {
  const earnings: Leaderboard = Object.entries(stats)
    .map(o => <[string, number]>[o[0], o[1].earnings])
    .sort((a, b) => b[1] - a[1])
    .map(o => <[string, string]>[o[0], '$'+ o[1]]);

  const accuracy: Leaderboard = Object.entries(stats)
    .filter(o => o[1].correctLetters + o[1].wrongLetters >= 20)
    .map(o => <[string, number]>[o[0], o[1].lettersAccuracy])
    .sort((a, b) => b[1] - a[1])
    .map(o => [o[0], o[1].toFixed(1) + '%']);

  const wins: Leaderboard = Object.entries(stats)
    .filter(o => o[1].roundsWon + o[1].roundsLost >= 10)
    .map(o => <[string, number]>[o[0], o[1].roundWinPct])
    .sort((a, b) => b[1] - a[1])
    .map(o => [o[0], o[1].toFixed(1) + '%']);

  let totalRounds = Object.entries(stats).reduce((prev, player, i) => prev += player[1].roundsWon, 0);
  let totalLetters = Object.entries(stats).reduce((prev, player, i) => prev += player[1].correctLetters + player[1].wrongLetters, 0);
  let description = `${games.size} active games on ${client.guilds.cache.size} servers.\n`;
  description += `Lifetime ${totalRounds} rounds played, ${totalLetters} letters guessed.`

  const embed = new EmbedBuilder()
    .setTitle("Hall of Fame")
    .setColor(0x000d8b)
    .setDescription(description);

  const boards: LeaderboardList[] = [['Earnings', earnings], ['Letter Accuracy', accuracy], ['Win Percent', wins]];

  for (const [boardName, board] of boards) {
    let boardStr = '';
    const filteredBoard = board.filter(score => members.get(score[0]) !== undefined).slice(0, 10);
    for (const score of filteredBoard) {
      const user = await client.users.fetch(score[0]);
      boardStr += `${user}: ${score[1]}\n`;
    }
    embed.addFields({ name: `Local ${boardName}`, value: boardStr.length ? boardStr : 'No players above threshold', inline: true});
  }

  for (const board of boards) {
    let boardStr = '';
    const filteredBoard = board[1].slice(0, 5);
    for (const score of filteredBoard) {
      const user = await client.users.fetch(score[0]);
      boardStr += `${user.tag}: ${score[1]}\n`;
    }
    embed.addFields({ name: 'Global ' + board[0], value: boardStr.length ? boardStr : 'No players above threshold', inline: true});
  } 

  return embed;
}


export { loadStats, saveStats, updateLetterGuessStats, endGameStats, statsMessage }