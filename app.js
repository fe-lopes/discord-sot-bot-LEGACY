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
  const channel = member.guild.channels.cache.get(channels.welcome);
  if (channel) {
    const randomMessage = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];
    channel.send(`<@${member.user.id}> ${randomMessage}! ${getRandomEmoji()}`);
  }
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  const member = message.guild.members.cache.get(message.author.id);

  if (message.channel.id == channels.autoRole) {
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
    // custom_id set in payload when sending message component
    const componentId = data.custom_id;
    const selectedOption = data.values[0];

    if (componentId === 'role_select') {
      const selectedOption = data.values[0];
      const userId = req.body.member.user.id;
      const guildId = req.body.channel.guild_id;
      const guild = client.guilds.cache.get(guildId);

      if (acceptedRoles.includes(selectedOption)) {
        guild.members.fetch(userId)
          .then(member => {
            const role = guild.roles.cache.find((r) => r.name === selectedOption);
            if (role) {
              if (member.roles.cache.has(role.id)) {
                console.log('possui')
                member.roles.remove(role).then(() => {
                  return res.send({
                    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                    data: { content: `<@${userId}> deixou de ser ${selectedOption}`, ephemeral: true },
                  });
                }).catch((error) => {
                  console.error(error);
                  return res.status(500).send("Erro ao remover cargo.");
                });
              } else {
                console.log('não possui')
                member.roles.add(role).then(() => {
                  return res.send({
                    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                    data: { content: `<@${userId}> agora é ${selectedOption}`, ephemeral: true },
                  });
                }).catch((error) => {
                  console.error(error);
                  return res.status(500).send("Erro ao adicionar cargo.");
                });
              }
            }
          })
          .catch(error => {
            console.log(`Erro ao buscar o membro: ${error}`);
          });
      } else {
        console.log("Cargo não aceito.");
      }
    }
  }
});

app.listen(PORT, () => {
  console.log('Listening on port', PORT);
});
