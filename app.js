import 'dotenv/config';
import express from 'express';
import axios from 'axios';
import {
  InteractionType,
  InteractionResponseType,
  InteractionResponseFlags,
  MessageComponentTypes,
  ButtonStyleTypes,
} from 'discord-interactions';
import { VerifyDiscordRequest, getChannels, getAcceptedRoles, getCookie, getRandomEmoji, getRandomWelcomeMessage, getRegion, findIsland, generateIslandResponse, DiscordRequest } from './utils.js';
import { Client, GatewayIntentBits, AttachmentBuilder, EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder } from 'discord.js'
import { createCanvas, loadImage, registerFont } from 'canvas';
registerFont('windlass.ttf', { family: 'Windlass' });

const d20Background = await loadImage('./assets/d20.png');

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
  const channel = member.guild.channels.cache.find((channel) => getChannels().welcome.includes(channel.id));
  if (channel) {
    channel.send(`<@${member.user.id}> ${getRandomWelcomeMessage()}! ${getRandomEmoji()}`);
  }
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  const member = message.guild.members.cache.get(message.author.id);

  // !<nome_do_cargo>
  if (getChannels().autoRole.includes(message.channel.id)) {
    message.delete().catch(console.error);
    if (message.content.startsWith('!')) {
      const command = message.content.slice(1);
      const role = getAcceptedRoles().find(acceptedRole => acceptedRole.toLowerCase() === command.toLowerCase());
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

  // !d20
  } else if (message.content.startsWith(`!d20`)) {
    const result = Math.floor(Math.random() * 20) + 1;
    const canvas = createCanvas(200, 200);
    const context = canvas.getContext('2d');
    context.drawImage(d20Background, 0, 0, 200, 200);
    context.save();
    context.translate(100, 100);
    context.rotate(-35 * (Math.PI / 180));
    context.font = '21px windlass';
    context.textAlign = 'center';
    context.fillStyle = 'black';
    context.fillText(result.toString(), 10, 25);
    context.restore();
    const buffer = canvas.toBuffer('image/png');

    async function sendImage(channel, text, buffer) {
      let attachment = new AttachmentBuilder(buffer, 'd20_result.png');
      await message.reply(text);
      await channel.send({ files: [attachment] });
    }
    sendImage(message.channel, `Seu resultado é ${result}`, buffer);

  // !ilha <nome_da_ilha>
  } else if (message.content.startsWith(`!ilha`)) {
    const island = message.content.slice(6);
    const result = findIsland(island);
    if (result.length === 1) {
      const island = result[0];
      const replyMessage = generateIslandResponse(island, message.guild);
      message.reply(replyMessage);
    } else if (result.length > 1 && result.length < 5) {
      const selectMenuOptions = result.map((island, index) => ({
        label: island.name,
        value: island.name,
      }));

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('island_select')
        .setPlaceholder('Escolha uma ilha')
        .addOptions(selectMenuOptions);

      const row = new ActionRowBuilder().addComponents(selectMenu);

      await message.reply({
        content: 'Várias ilhas encontradas, escolha uma:',
        components: [row],
      });
    } else if (result.length > 4) {
      message.reply("Muitas ilhas correspondem ao nome informado, seja mais específico!");
    } else {
      message.reply("Nenhuma ilha encontrada, verifique o nome informado e tente novamente.");
    }

    // !guilda
  } else if (message.content.startsWith(`!guilda`)) {
    const processingMessage = await message.reply('Processando... Este é um recurso experimental e pode apresentar falhas.');
    const apiUrl = 'https://www.seaofthieves.com/pt-br/api/profilev2/guilds-summary';

    try {
      const response = await axios.get(apiUrl, {
        headers: {
          'accept-language': 'pt-BR,pt;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6',
          'referer': 'https://www.seaofthieves.com/pt-br/profile/guilds/de1873a2-87ac-472d-84c6-7617e72bf637',
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36 Edg/118.0.2088.61',
          'cookie': getCookie(),
        },
      });

      const guildData = response.data[0];
      const {
        Branding: { GuildName, Motto, Icon },
        Reputation: { Level, DistinctionLevel, NextCompanyLevel, Xp },
        NumberOfMembers,
        NumberOfShips,
      } = guildData;

      // const guildIconUrl = `https://athwsue2-prd-webscript-cdn-endpoint.azureedge.net/84a9067544a326cef4421544e40176b5/assets/icons/guild-${Icon.IconId}.svg`;
      const guildColor = 0xCC3F29;
      const xpRequiredToAttain = NextCompanyLevel.XpRequiredToAttain;
      const xpPercentage = ((Xp / xpRequiredToAttain) * 100).toFixed(2);

      const guildOwnerId = message.guild.ownerId;
      const guildOwner = await message.guild.members.fetch(guildOwnerId);

      const nickname = guildOwner.nickname
      const authorIconUrl = guildOwner.user.displayAvatarURL({ dynamic: false, format: 'png', size: 128 });
      const embed = new EmbedBuilder()
        .setColor(guildColor)
        .setAuthor({ name: nickname, iconURL: authorIconUrl })
        .setTitle(GuildName)
        .setDescription(Motto)
        .setThumbnail('https://lh3.googleusercontent.com/u/0/drive-viewer/AK7aPaD7-W3f7hw6FKyJ_h4qH5-LA_ZEIfSFhd5dbWVbfr2I0PIUC7zli12nXxXno2o3VLxvxr2sh1UQKTJKipggrI32Gdqb=w537-h927')
        .addFields(
          { name: '\u200B', value: '\u200B' },
          { name: 'Nível', value: `${Level.toString()} (${xpPercentage}%)`, inline: false },
          { name: 'Distinção', value: DistinctionLevel.toString(), inline: true },
          { name: 'Membros', value: `${NumberOfMembers.toString()}/24`, inline: true },
          { name: 'Navios', value: `${NumberOfShips.toString()}/42`, inline: true },
        )
        .setImage('https://static.wikia.nocookie.net/seaofthieves_gamepedia/images/2/29/Lord_Guardian_Sails_promo.jpg/revision/latest/scale-to-width-down/1000?cb=20200713051417')
        .setTimestamp()
        .setFooter({ text: 'Nossa bandeira sempre será vermelha' });

      message.channel.send({ embeds: [embed] });
      await processingMessage.delete();
    } catch (error) {
      await processingMessage.delete();
      console.error('Erro ao buscar informações da guilda:', error);
      message.reply('Ocorreu um erro ao buscar informações da guilda.');
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
    const guild = client.guilds.cache.get(req.body.message.message_reference.guild_id);

    if (componentId === 'island_select') {
      const selectedOption = data.values[0];
      const selectedIsland = findIsland(selectedOption).find(island => island.name === selectedOption);

      const originalMessage = await guild.channels.cache.get(req.body.message.channel_id).messages.fetch(req.body.message.message_reference.message_id);
      const selectMenuMessage = await guild.channels.cache.get(req.body.message.channel_id).messages.fetch(req.body.message.id);
      selectMenuMessage.delete().catch(console.error);

      if (selectedIsland) {
        originalMessage.reply(generateIslandResponse(selectedIsland, guild));
        return res.send({ type: InteractionResponseType.DEFERRED_UPDATE_MESSAGE });
      }
    }
  }
});

app.listen(PORT, () => {
  console.log('Listening on port', PORT);
});
