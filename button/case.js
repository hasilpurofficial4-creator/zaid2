const fs = require("fs");
const { loadJSON, saveJSON, runtime, formatBytes } = require("./helper/function");
const { logWhatsApp, logSystem } = require("./helper/logger");
const config = require("./settings");
const os = require("os");

const paidUsers = loadJSON('./database/paid.json', []);
const settings = loadJSON('./database/settings.json', { publicMode: true, selfMode: false });

const savePaidData = () => {
  saveJSON('./database/paid.json', paidUsers);
};

module.exports = async (WaSocket, m) => {
  try {
    if (!m.message) return;
    
    const message = m.message;
    const type = Object.keys(message)[0];
    
    let body = '';
    
    if (type === 'conversation') {
      body = message.conversation;
    } else if (type === 'extendedTextMessage') {
      body = message.extendedTextMessage.text;
    } else if (type === 'imageMessage') {
      body = message.imageMessage.caption || '';
    } else if (type === 'videoMessage') {
      body = message.videoMessage.caption || '';
    } else if (type === 'interactiveResponseMessage') {
      const interactiveResponse = message.interactiveResponseMessage;
      if (interactiveResponse.nativeFlowResponseMessage) {
        body = JSON.parse(interactiveResponse.nativeFlowResponseMessage.paramsJson).id;
      } else {
        body = interactiveResponse.body || '';
      }
    } else if (type === 'templateButtonReplyMessage') {
      body = message.templateButtonReplyMessage.selectedId;
    } else if (type === 'buttonsResponseMessage') {
      body = message.buttonsResponseMessage.selectedButtonId;
    }
    
    const budy = (typeof body === 'string') ? body : '';
    const prefix = config.prefix.test(budy) ? budy.match(config.prefix)[0] : '.';
    const isCmd = budy.startsWith(prefix);
    const command = isCmd ? budy.slice(prefix.length).trim().split(/ +/).shift().toLowerCase() : budy.toLowerCase();
    const args = budy.trim().split(/ +/).slice(1);
    const text = args.join(" ");
    
    const sender = m.key.remoteJid;
    const botNumber = WaSocket.user.id.split(':')[0] + '@s.whatsapp.net';
    const isGroup = sender.endsWith('@g.us');
    const groupMetadata = isGroup ? await WaSocket.groupMetadata(sender).catch(() => ({})) : {};
    const groupName = isGroup ? groupMetadata.subject : '';
    const participants = isGroup ? groupMetadata.participants || [] : [];
    const groupAdmins = isGroup ? participants.filter(p => p.admin !== null).map(p => p.id) : [];
    const isBotAdmin = isGroup ? groupAdmins.includes(botNumber) : false;
    const isAdmin = isGroup ? groupAdmins.includes(m.key.participant || sender) : false;
    
    const isOwner = [botNumber]

			.map(v => v.replace(/[^0-9]/g, "") + "@s.whatsapp.net")

			.includes(m.sender);
    const isCreator = isOwner;
    const isPaid = paidUsers.includes(sender) || isOwner;
    
    // Load settings for public/self mode
    const currentSettings = loadJSON('./database/settings.json', { publicMode: true, selfMode: false });
    
    // Check mode permissions
    if (currentSettings.selfMode && !isOwner) {
      return; // Self mode: only owner
    }
    
    if (!currentSettings.publicMode && !currentSettings.selfMode && !isOwner) {
      return; // Private mode: only owner
    }
    
    // Get sender name
    let senderName = sender.split('@')[0];
    try {
      const contact = await WaSocket.onWhatsApp(sender);
      if (contact && contact[0]) {
        senderName = contact[0].notify || senderName;
      }
    } catch (e) {
      // Ignore error
    }
    
    // Log WhatsApp message with beautiful console
    logWhatsApp({
      sender: sender,
      senderName: senderName,
      chatType: isGroup ? 'group' : 'private',
      chatName: isGroup ? groupName : 'DM',
      command: isCmd ? prefix + command : null,
      message: budy,
      isGroup: isGroup,
      isOwner: isOwner,
      isPaid: isPaid
    });
    
    const reply = async (text) => {
      return WaSocket.sendMessage(sender, { text: text }, { quoted: m });
    };
    
    const sendImage = async (image, caption = '') => {
      return WaSocket.sendMessage(sender, { 
        image: image, 
        caption: caption 
      }, { quoted: m });
    };
    
    const {
      generateWAMessageFromContent,
      proto,
      prepareWAMessageMedia
    } = require("@whiskeysockets/baileys");
    
    // Allow all commands through - no filtering
    if (!isCmd && !body) return; // Only return if no command and no message
    
    const startTime = Date.now();
    
    switch (command) {
      case "menu": {
        const teks = `[¶!  神奇女侠 ! ¶]
`;
        
        try {
          let imageSource;
          if (fs.existsSync('./media/menu.jpg')) {
            imageSource = fs.readFileSync('./media/menu.jpg');
          } else {
            const { getBuffer } = require('./helper/function');
            imageSource = await getBuffer(config.connectionImage);
          }
          
          const msg = generateWAMessageFromContent(sender, {
            viewOnceMessage: {
              message: {
                interactiveMessage: {
                  header: {
                    title: teks,
                    hasMediaAttachment: true,
                    imageMessage: (await prepareWAMessageMedia({ 
                      image: imageSource
                    }, { upload: WaSocket.waUploadToServer })).imageMessage
                  },
                  body: {
                    text: "fuck you"
                  },
                  nativeFlowMessage: {
                    messageParamsJson: JSON.stringify({
                      limited_time_offer: {
                        text: "神气雨下",
                        url: "t.me/shenxidev",
                        copy_code: "妇产科油",
                        expiration_time: Date.now() * 999
                      },
                      bottom_sheet: {
                        in_thread_buttons_limit: 2,
                        divider_indices: [1, 2, 3, 4, 5, 999],
                        list_title: "Shénqí Nǚxiá mënû",
                        button_title: "打开 菜单"
                      }
                    }),
                    buttons: [
                      {
                        name: "cta_url",
                        buttonParamsJson: JSON.stringify({
                          display_text: "Telegram Channel",
                          url: "https://t.me/shenxidev"
                        })
                      },
                      {
                        name: "cta_url",
                        buttonParamsJson: JSON.stringify({
                          display_text: "Telegram Owner",
                          url: "https://t.me/shenxidev"
                        })
                      },
                      {
                        name: "quick_reply",
                        buttonParamsJson: JSON.stringify({
                          display_text: "Bug Menu",
                          id: prefix + "attack"
                        })
                      },
                      {
                        name: "quick_reply",
                        buttonParamsJson: JSON.stringify({
                          display_text: "System Info",
                          id: prefix + "systeminfo"
                        })
                      },
                      {
                        name: "quick_reply",
                        buttonParamsJson: JSON.stringify({
                          display_text: "Ping",
                          id: prefix + "ping"
                        })
                      },
                      {
                        name: "quick_reply",
                        buttonParamsJson: JSON.stringify({
                          display_text: "Thanks To",
                          id: prefix + "tqto"
                        })
                      },
                      {
                        name: "address_message",
                        buttonParamsJson: "{}"
                      }
                    ]
                  }
                }
              }
            }
          }, { quoted: m });
          
          await WaSocket.relayMessage(sender, msg.message, {});
        } catch (error) {
          console.error('Menu error:', error);
          reply('❌ Error loading menu. Try again.');
        }
      }
      break;
      
      case "ping": {
        const endTime = Date.now();
        const latency = endTime - startTime;
        
        const text = `
┏━━━━━━━━━━━━━━
┃ 🏓 𝗣𝗢𝗡𝗚!
┃
┃ 𝗦𝗽𝗲𝗲𝗱: ${latency}ms
┃ 𝗦𝘁𝗮𝘁𝘂𝘀: ✅ 𝗔𝗰𝘁𝗶𝘃𝗲
┗━━━━━━━━━━━━━━
        `;
        
        reply(text.trim());
      }
      break;
      
      case "uptime": {
        const uptime = process.uptime();
        const uptimeStr = runtime(uptime);
        
        const text = `
┏━━━━━━━━━━━━━━
┃ ⏰ 𝗨𝗣𝗧𝗜𝗠𝗘
┃
┃ ${uptimeStr}
┗━━━━━━━━━━━━━━
        `;
        
        reply(text.trim());
      }
      break;
      
      case "systeminfo": {
        const totalMem = formatBytes(os.totalmem());
        const freeMem = formatBytes(os.freemem());
        const usedMem = formatBytes(os.totalmem() - os.freemem());
        const cpuModel = os.cpus()[0].model;
        const cpuCores = os.cpus().length;
        const platform = os.platform();
        const arch = os.arch();
        
        const text = `
┏━━━━━━━━━━━━━━
┃ 📊 𝗦𝗬𝗦𝗧𝗘𝗠 𝗜𝗡𝗙𝗢
┃
┃ 𝗣𝗹𝗮𝘁𝗳𝗼𝗿𝗺: ${platform}
┃ 𝗔𝗿𝗰𝗵: ${arch}
┃ 𝗖𝗣𝗨: ${cpuModel}
┃ 𝗖𝗼𝗿𝗲𝘀: ${cpuCores}
┃ 𝗧𝗼𝘁𝗮𝗹 𝗥𝗔𝗠: ${totalMem}
┃ 𝗨𝘀𝗲𝗱 𝗥𝗔𝗠: ${usedMem}
┃ 𝗙𝗿𝗲𝗲 𝗥𝗔𝗠: ${freeMem}
┃ 𝗨𝗽𝘁𝗶𝗺𝗲: ${runtime(process.uptime())}
┗━━━━━━━━━━━━━━
        `;
        
        reply(text.trim());
      }
      break;
      
      
      case "addpaid": {
        if (!isOwner) {
          return reply("❌ 𝗢𝘄𝗻𝗲𝗿 𝗼𝗻𝗹𝘆!");
        }
        
        if (!m.message.extendedTextMessage || !m.message.extendedTextMessage.contextInfo.mentionedJid) {
          return reply(`𝗨𝘀𝗮𝗴𝗲: ${prefix}addpaid @user`);
        }
        
        const user = m.message.extendedTextMessage.contextInfo.mentionedJid[0];
        
        if (paidUsers.includes(user)) {
          return reply("⚠️ 𝗨𝘀𝗲𝗿 𝗶𝘀 𝗮𝗹𝗿𝗲𝗮𝗱𝘆 𝗽𝗮𝗶𝗱!");
        }
        
        paidUsers.push(user);
        savePaidData();
        
        reply(`✅ 𝗨𝘀𝗲𝗿 @${user.split('@')[0]} 𝗮𝗱𝗱𝗲𝗱 𝘁𝗼 𝗽𝗮𝗶𝗱 𝘂𝘀𝗲𝗿𝘀!`);
      }
      break;
      
      case "delpaid": {
        if (!isOwner) {
          return reply("❌ 𝗢𝘄𝗻𝗲𝗿 𝗼𝗻𝗹𝘆!");
        }
        
        if (!m.message.extendedTextMessage || !m.message.extendedTextMessage.contextInfo.mentionedJid) {
          return reply(`𝗨𝘀𝗮𝗴𝗲: ${prefix}delpaid @user`);
        }
        
        const user = m.message.extendedTextMessage.contextInfo.mentionedJid[0];
        
        const index = paidUsers.indexOf(user);
        if (index === -1) {
          return reply("❌ 𝗨𝘀𝗲𝗿 𝗶𝘀 𝗻𝗼𝘁 𝗽𝗮𝗶𝗱!");
        }
        
        paidUsers.splice(index, 1);
        savePaidData();
        
        reply(`✅ 𝗨𝘀𝗲𝗿 @${user.split('@')[0]} 𝗿𝗲𝗺𝗼𝘃𝗲𝗱 𝗳𝗿𝗼𝗺 𝗽𝗮𝗶𝗱 𝘂𝘀𝗲𝗿𝘀!`);
      }
      break;
      
      case "listpaid": {
        if (!isOwner) {
          return reply("❌ 𝗢𝘄𝗻𝗲𝗿 𝗼𝗻𝗹𝘆!");
        }
        
        if (paidUsers.length === 0) {
          return reply("📭 𝗡𝗼 𝗽𝗮𝗶𝗱 𝘂𝘀𝗲𝗿𝘀 𝗳𝗼𝘂𝗻𝗱!");
        }
        
        let text = `
┏━━━━━━━━━━━━━━
┃ 💎 𝗣𝗔𝗜𝗗 𝗨𝗦𝗘𝗥𝗦
┃
`;
        
        paidUsers.forEach((user, i) => {
          text += `┃ ${i + 1}. @${user.split('@')[0]}\n`;
        });
        
        text += `┃\n┃ 𝗧𝗼𝘁𝗮𝗹: ${paidUsers.length}\n┗━━━━━━━━━━━━━━`;
        
        WaSocket.sendMessage(sender, {
          text: text.trim(),
          mentions: paidUsers
        }, { quoted: m });
      }
      break;
      
      case "tqto": {
        const text = `
┏━━━━━━━━━━━━━━
┃ 🙏 𝗧𝗛𝗔𝗡𝗞𝗦 𝗧𝗢
┃
┃ • 𝗔𝗹𝗹𝗮𝗵 𝗦𝗪𝗧
┃ • shenxidev (𝗗𝗲𝘃𝗲𝗹𝗼𝗽𝗲𝗿)
┃ • james (𝗣𝗮𝘁𝗻𝗲𝗿)
┃ • 𝗕𝗮𝗶𝗹𝗲𝘆𝘀
┃ • 𝗔𝗹𝗹 𝗦𝘂𝗽𝗽𝗼𝗿𝘁𝗲𝗿𝘀
┗━━━━━━━━━━━━━━
        `;
        
        reply(text.trim());
      }
      break;
      
      case "public": {
        if (!isOwner) {
          return reply("❌ 𝗢𝘄𝗻𝗲𝗿 𝗼𝗻𝗹𝘆!");
        }
        
        if (!text || (text !== 'on' && text !== 'off')) {
          return reply(`𝗨𝘀𝗮𝗴𝗲: ${prefix}public on/off`);
        }
        
        const mode = text === 'on';
        const currentSettings = loadJSON('./database/settings.json', {});
        currentSettings.publicMode = mode;
        currentSettings.selfMode = false;
        saveJSON('./database/settings.json', currentSettings);
        
        reply(`✅ 𝗣𝘂𝗯𝗹𝗶𝗰 𝗠𝗼𝗱𝗲: ${mode ? '🌍 𝗢𝗡' : '🔒 𝗢𝗙𝗙'}\n\n${mode ? 'Bot responds to all groups & DMs' : 'Bot only responds to owner'}`);
      }
      break;
      
      case "self": {
        if (!isOwner) {
          return reply("❌ 𝗢𝘄𝗻𝗲𝗿 𝗼𝗻𝗹𝘆!");
        }
        
        if (!text || (text !== 'on' && text !== 'off')) {
          return reply(`𝗨𝘀𝗮𝗴𝗲: ${prefix}self on/off`);
        }
        
        const mode = text === 'on';
        const currentSettings = loadJSON('./database/settings.json', {});
        currentSettings.selfMode = mode;
        if (mode) currentSettings.publicMode = false;
        saveJSON('./database/settings.json', currentSettings);
        
        reply(`✅ 𝗦𝗲𝗹𝗳 𝗠𝗼𝗱𝗲: ${mode ? '👤 𝗢𝗡' : '🌍 𝗢𝗙𝗙'}\n\n${mode ? 'Bot only responds to owner' : 'Bot responds to all'}`);
      }
      break;
      
      case "addprem": {
        if (!isOwner) {
          return reply("❌ 𝗢𝘄𝗻𝗲𝗿 𝗼𝗻𝗹𝘆!");
        }
        
        if (!m.message.extendedTextMessage || !m.message.extendedTextMessage.contextInfo.mentionedJid) {
          return reply(`𝗨𝘀𝗮𝗴𝗲: ${prefix}addprem @user`);
        }
        
        const user = m.message.extendedTextMessage.contextInfo.mentionedJid[0];
        const premiumUsers = loadJSON('./database/premium.json', []);
        
        if (premiumUsers.includes(user)) {
          return reply("⚠️ 𝗨𝘀𝗲𝗿 𝗶𝘀 𝗮𝗹𝗿𝗲𝗮𝗱𝘆 𝗽𝗿𝗲𝗺𝗶𝘂𝗺!");
        }
        
        premiumUsers.push(user);
        saveJSON('./database/premium.json', premiumUsers);
        
        reply(`✅ @${user.split('@')[0]} 𝗮𝗱𝗱𝗲𝗱 𝘁𝗼 𝗽𝗿𝗲𝗺𝗶𝘂𝗺!`);
      }
      break;
            
      case "delprem": {
        if (!isOwner) {
          return reply("❌ 𝗢𝘄𝗻𝗲𝗿 𝗼𝗻𝗹𝘆!");
        }
        
        if (!m.message.extendedTextMessage || !m.message.extendedTextMessage.contextInfo.mentionedJid) {
          return reply(`𝗨𝘀𝗮𝗴𝗲: ${prefix}delprem @user`);
        }
        
        const user = m.message.extendedTextMessage.contextInfo.mentionedJid[0];
        const premiumUsers = loadJSON('./database/premium.json', []);
        
        const index = premiumUsers.indexOf(user);
        if (index === -1) {
          return reply("❌ 𝗨𝘀𝗲𝗿 𝗶𝘀 𝗻𝗼𝘁 𝗽𝗿𝗲𝗺𝗶𝘂𝗺!");
        }
        
        premiumUsers.splice(index, 1);
        saveJSON('./database/premium.json', premiumUsers);
        
        reply(`✅ @${user.split('@')[0]} 𝗿𝗲𝗺𝗼𝘃𝗲𝗱 𝗳𝗿𝗼𝗺 𝗽𝗿𝗲𝗺𝗶𝘂𝗺!`);
      }
      break;
      
      default:
        break;
    }
    
  } catch (error) {
    console.error('WhatsApp message handler error:', error);
  }
};
