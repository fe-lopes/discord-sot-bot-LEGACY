import 'dotenv/config';
import express from 'express';
import {
  InteractionType,
  InteractionResponseType,
  InteractionResponseFlags,
  MessageComponentTypes,
  ButtonStyleTypes,
} from 'discord-interactions';
import { VerifyDiscordRequest, getRandomEmoji, DiscordRequest } from './utils.js';
import { getShuffledOptions, getResult } from './game.js';

// Create an express app
const app = express();
// Get port, or default to 3000
const PORT = process.env.PORT || 3000;
// Parse request body and verifies incoming requests using discord-interactions package
app.use(express.json({ verify: VerifyDiscordRequest(process.env.PUBLIC_KEY) }));

// Store for in-progress games. In production, you'd want to use a DB
const activeGames = {};

/**
 * Interactions endpoint URL where Discord will send HTTP requests
 */
app.post('/interactions', async function (req, res) {
  // Interaction type and data
  const { type, id, data } = req.body;

  /**
   * Handle verification requests
   */
  if (type === InteractionType.PING) {
    return res.send({ type: InteractionResponseType.PONG });
  }

  /**
   * Handle slash command requests
   * See https://discord.com/developers/docs/interactions/application-commands#slash-commands
   */
  if (type === InteractionType.APPLICATION_COMMAND) {
    const { name } = data;

    if (name === 'test') {
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: 'hello sea of thieves ' + getRandomEmoji(),
        },
      });
    }

    if (name === 'sea') {
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: 'of thieves 🌊',
        },
      });
    }
  }

  /**
   * Handle message commands that start with "!"
   */
  if (type === InteractionType.MESSAGE_COMPONENT && data.custom_id.startsWith('!')) {
    const command = data.custom_id.slice(1); // remove the "!" at the start
    const acceptedCommands = ['timoneiro', 'canhoneiro', 'chefe', 'navegador'];
    // Add your command handlers here

    if (acceptedCommands.includes(command)) {
      // Obtém o cargo correspondente ao comando
      const role = message.guild.roles.cache.find(role => role.name === command);
  
      // Verifica se o usuário já tem o cargo
      if (message.member.roles.cache.has(role.id)) {
        // Se o usuário já tem o cargo, remove-o
        await message.member.roles.remove(role);
        message.reply(`${message.member.displayName} não é mais um ${command}!`);
      } else {
        // Se o usuário não tem o cargo, adiciona-o
        await message.member.roles.add(role);
        message.reply(`${message.member.displayName} agora é um ${command}!`);
      }
    } else {
      // Se o comando não é um dos aceitos, envia uma mensagem de "cargo inválido"
      message.reply(`"${command}" não é um cargo válido.`);
    }
  }
});

app.listen(PORT, () => {
  console.log('Listening on port', PORT);
});
