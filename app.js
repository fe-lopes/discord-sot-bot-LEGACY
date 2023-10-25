import 'dotenv/config';
import fs from 'fs';
import express from 'express';
import {
  InteractionType,
  InteractionResponseType,
  InteractionResponseFlags,
  MessageComponentTypes,
  ButtonStyleTypes,
} from 'discord-interactions';
import { VerifyDiscordRequest, getRandomEmoji, DiscordRequest } from './utils.js';
import { Client, GatewayIntentBits, AttachmentBuilder } from 'discord.js'

import { createCanvas, loadImage, registerFont } from 'canvas';
registerFont('heyjack.ttf', { family: 'HeyJack' });

const d20Background = await loadImage('./assets/d20.png');
const configFile = 'config.json';
const configData = await fs.promises.readFile(configFile, 'utf8');
const config = JSON.parse(configData);
const channels = config.channels;
const welcomeMessages = config.welcomeMessages;
const acceptedRoles = config.acceptedRoles;

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json({ verify: VerifyDiscordRequest(process.env.PUBLIC_KEY) }));

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildScheduledEvents,
    GatewayIntentBits.MessageContent,
  ],
});

client.login(process.env.BOT_TOKEN);

client.on('guildMemberAdd', (member) => {
  const channel = member.guild.channels.cache.find((channel) => welcomeChannelIDs.includes(channel.id));
  if (channel) {
    const randomMessage = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];
    channel.send(`<@${member.user.id}> ${randomMessage}! ${getRandomEmoji()}`);
  }
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  const member = message.guild.members.cache.get(message.author.id);

  if (channels.autoRole.includes(message.channel.id)) {
    message.delete().catch(console.error);
    if (message.content.startsWith('!')) {
      const command = message.content.slice(1);
      const role = acceptedRoles.find(acceptedRole => acceptedRole.toLowerCase() === command.toLowerCase());
      const roleObject = role ? message.guild.roles.cache.find(r => r.name.toLowerCase() === role.toLowerCase()) : undefined;

      if (roleObject) {
        if (member.roles.cache.has(roleObject.id)) {
          member.roles.remove(roleObject).then(() => {
            message.channel.send(`<@${message.author.id}> deixou de ser ${command}`)
              .then((responseMessage) => {
                setTimeout(() => {
                  responseMessage.delete().catch(console.error);
                }, 8000);
              })
              .catch(console.error);
          });
        } else {
          member.roles.add(roleObject).then(() => {
            message.channel.send(`<@${message.author.id}> agora é ${command}`)
              .then((responseMessage) => {
                setTimeout(() => {
                  responseMessage.delete().catch(console.error);
                }, 8000);
              })
              .catch(console.error);
          });
        }
      } else {
        message.channel.send(`<@${message.author.id}> 🚫➡️ o cargo mencionado não existe.\n**Insira um cargo válido!**`)
          .then((responseMessage) => {
            setTimeout(() => {
              responseMessage.delete().catch(console.error);
            }, 10000);
          })
          .catch(console.error);
      }
    } else {
      message.channel.send(`<@${message.author.id}> 🚫➡️ sua mensagem não corresponde ao formato permitido neste canal.\n**Utilize os comandos corretos!**`)
        .then((responseMessage) => {
          setTimeout(() => {
            responseMessage.delete().catch(console.error);
          }, 10000);
        })
        .catch(console.error);
    }
  } else {
    if (message.content.startsWith(`!d20`)) {
      const result = Math.floor(Math.random() * 20) + 1;
  
      const canvas = createCanvas(200, 200);
      const context = canvas.getContext('2d');
      context.drawImage(d20Background, 0, 0, 200, 200);
      context.save();
      context.translate(100, 100);
      context.rotate(-35 * (Math.PI / 180));
      context.font = '38px heyjack';
      context.textAlign = 'center';
      context.fillStyle = 'black';
      context.fillText(result.toString(), 10, 26);
      context.restore();
      const buffer = canvas.toBuffer('image/png');

      async function sendImage(channel, text, buffer) {
        let attachment = new AttachmentBuilder(buffer, 'd20_result.png');
        await message.reply(text);
        await channel.send({ files: [attachment] });
      }
      
      sendImage(message.channel, `Seu resultado é ${result}`, buffer);
    }
  }
});

app.post('/interactions', async function (req, res) {
  const { type, id, data } = req.body;

  if (type === InteractionType.PING) {
    return res.send({ type: InteractionResponseType.PONG });
  }

  if (type === InteractionType.APPLICATION_COMMAND) {
    const { name } = data;
  }

  if (type === InteractionType.MESSAGE_COMPONENT) {
    const componentId = data.custom_id;
  }
});

app.listen(PORT, () => {
  console.log('Listening on port', PORT);
});
