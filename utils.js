import 'dotenv/config';
import fs from 'fs';
import fetch from 'node-fetch';
import { verifyKey } from 'discord-interactions';

const configFile = 'config.json';
const configData = await fs.promises.readFile(configFile, 'utf8');
const config = JSON.parse(configData);
const channels = config.channels;
const islands = config.islands;
const acceptedRoles = config.acceptedRoles;

export function VerifyDiscordRequest(clientKey) {
  return function (req, res, buf, encoding) {
    const signature = req.get('X-Signature-Ed25519');
    const timestamp = req.get('X-Signature-Timestamp');

    const isValidRequest = verifyKey(buf, signature, timestamp, clientKey);
    if (!isValidRequest) {
      res.status(401).send('Bad request signature');
      throw new Error('Bad request signature');
    }
  };
};

export async function DiscordRequest(endpoint, options) {
  const url = 'https://discord.com/api/v10/' + endpoint;
  if (options.body) options.body = JSON.stringify(options.body);
  const res = await fetch(url, {
    headers: {
      Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
      'Content-Type': 'application/json; charset=UTF-8',
      'User-Agent': 'Papagaio Pirata (https://github.com/fe-lopes/discord-sot-bot, 1.0.0)',
    },
    ...options
  });
  if (!res.ok) {
    const data = await res.json();
    console.log(res.status);
    throw new Error(JSON.stringify(data));
  }
  return res;
};

export async function InstallGlobalCommands(appId, commands) {
  const endpoint = `applications/${appId}/commands`;

  try {
    await DiscordRequest(endpoint, { method: 'PUT', body: commands });
  } catch (err) {
    console.error(err);
  }
};

export function getChannels() {
  return config.channels;
}

export function getAcceptedRoles() {
  return config.acceptedRoles;
}

export function getRandomEmoji() {
  const emojiList = ['😀','😄','😁','😉','😎','🫡','🤗','😛','🥸','🤖','👾','👽','🎃','👻','💀','🦄','🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐻‍❄️','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🐺'];
  return emojiList[Math.floor(Math.random() * emojiList.length)];
};

export function getCookie() {
  return config.cookie;
}

export function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

export function getRandomWelcomeMessage() {
  return config.welcomeMessages[Math.floor(Math.random() * config.welcomeMessages.length)];
};

export function findIsland(str) {
  return config.islands.filter(island => island.name.toLowerCase().includes(str.toLowerCase()));
};

export function getRegion(id) {
  const region = config.regions.find((r) => r.id === id);
  return region ? region : null;
};

export function generateIslandResponse(island, guild) {
  let animals = "";
  if (island.animals.chicken) { animals += "🐔" };
  if (island.animals.pig) { animals += "🐷" };
  if (island.animals.snake) { animals += "🐍" };

  const region = getRegion(island.region);
  let emoji = guild.emojis.cache.find((emoji) => emoji.name === region.emoji);
  emoji = (emoji) ? emoji : '';

  return `${emoji} ${region.name}: **${island.name}** (${island.grid}) ${animals}`;
};
