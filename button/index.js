const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');
const NodeCache = require('node-cache');
const { loadJSON, saveJSON, ensureDir, runtime } = require('./helper/function');
const { validatePhoneNumber, formatPairingCode } = require('./helper/generate');
const { logTelegram, logBanner, logSystem } = require('./helper/logger');
const config = require('./settings');

const bot = new TelegramBot(config.telegramToken, { polling: true });
const pairingCodes = new NodeCache({ stdTTL: 3600, checkperiod: 600 });

ensureDir('./database');
ensureDir('./database/sessions');

const premiumUsers = loadJSON('./database/premium.json', []);
const pairingSessions = loadJSON('./database/paired.json', []);
const settings = loadJSON('./database/settings.json', { 
  premiumOnly: false,
  publicMode: true,
  selfMode: false
});

const saveData = () => {
  saveJSON('./database/premium.json', premiumUsers);
  saveJSON('./database/paired.json', pairingSessions);
  saveJSON('./database/settings.json', settings);
};

const isOwner = (userId) => userId === config.telegramOwner;
const isPremium = (userId) => premiumUsers.includes(userId) || isOwner(userId);

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  
  const welcomeText = `
═══ 🌟 神奇女侠 🌟 ═══

<b>Bot Name:</b> ${config.botName}
<b>Owner:</b> @${config.owner}
<b>Version:</b> 1.0.0

<i>Welcome to Shénqí Nǚxiá Bot!</i>

<b>Available Commands:</b>
/pair - Pair WhatsApp device
/delpair - Delete paired session
/myid - Show your info
/premium - Premium info
/owner - Owner commands
/help - Command list

═══════════════════
  `;
  
  const keyboard = {
    reply_markup: {
      keyboard: [
        [{ text: '📱 Pair Device' }, { text: '🗑️ Delete Pair' }],
        [{ text: '👤 My Info' }, { text: '💎 Premium' }],
        [{ text: '⚙️ Owner Menu' }, { text: '📋 Help' }],
        [{ text: '📡 Channel' }, { text: '💬 Owner Contact' }]
      ],
      resize_keyboard: true
    }
  };
  
  try {
    const { getBuffer } = require('./helper/function');
    const imageBuffer = await getBuffer(config.connectionImage);
    
    if (imageBuffer) {
      bot.sendPhoto(chatId, imageBuffer, {
        caption: welcomeText,
        parse_mode: 'HTML',
        ...keyboard
      });
    } else {
      bot.sendMessage(chatId, welcomeText, { parse_mode: 'HTML', ...keyboard });
    }
  } catch (error) {
    console.error('Error loading start image:', error.message);
    bot.sendMessage(chatId, welcomeText, { parse_mode: 'HTML', ...keyboard });
  }
});

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text = msg.text;
  
  // Log telegram message with beautiful console
  if (text) {
    logTelegram({
      userId: userId,
      username: msg.from.username,
      firstName: msg.from.first_name || 'Unknown',
      action: msg.chat.type === 'private' ? 'Direct Message' : `Group: ${msg.chat.title || 'Unknown'}`,
      message: text,
      messageType: 'text'
    });
  }
  
  if (!text || text.startsWith('/')) return;
  
  if (text === '📱 Pair Device') {
    if (settings.premiumOnly && !isPremium(userId)) {
      return bot.sendMessage(chatId, '❌ Pairing is currently available for premium users only!');
    }
    bot.sendMessage(chatId, '📱 <b>Enter phone number:</b>\n\n<i>Format: /pair 254785016388</i>', { parse_mode: 'HTML' });
  }
  
  else if (text === '🗑️ Delete Pair') {
    bot.sendMessage(chatId, '🗑️ <b>Enter phone number to delete:</b>\n\n<i>Format: /delpair 254785016388</i>', { parse_mode: 'HTML' });
  }
  
  else if (text === '👤 My Info') {
    const username = msg.from.username || 'No username';
    const firstName = msg.from.first_name || 'Unknown';
    
    const infoText = `
═══ 👤 Your Info ═══

<b>User ID:</b> <code>${userId}</code>
<b>Username:</b> @${username}
<b>Name:</b> ${firstName}
<b>Premium:</b> ${isPremium(userId) ? '✅ Yes' : '❌ No'}
<b>Owner:</b> ${isOwner(userId) ? '✅ Yes' : '❌ No'}

═══════════════════
    `;
    
    bot.sendMessage(chatId, infoText, { parse_mode: 'HTML' });
  }
  
  else if (text === '💎 Premium') {
    const premText = `
═══ 💎 Premium Info ═══

<b>Your Status:</b> ${isPremium(userId) ? '✅ Premium' : '❌ Free'}
<b>Premium Mode:</b> ${settings.premiumOnly ? '🔒 ON' : '🔓 OFF'}

<b>Premium Benefits:</b>
• Pair multiple devices
• Priority support
• Advanced features

<b>To get premium, contact:</b>
@${config.owner}

═══════════════════
    `;
    
    bot.sendMessage(chatId, premText, { parse_mode: 'HTML' });
  }
  
  else if (text === '⚙️ Owner Menu') {
    if (!isOwner(userId)) {
      return bot.sendMessage(chatId, '❌ This menu is owner only!');
    }
    
    // Reload data to show current counts
    const currentPremium = loadJSON('./database/premium.json', []);
    const currentSessions = loadJSON('./database/paired.json', []);
    const currentSettings = loadJSON('./database/settings.json', { premiumOnly: false });
    
    const ownerText = `
═══ ⚙️ Owner Menu ═══

<b>Premium Users:</b> ${currentPremium.length}
<b>Paired Sessions:</b> ${currentSessions.length}
<b>Premium Mode:</b> ${currentSettings.premiumOnly ? '🔒 ON' : '🔓 OFF'}

<b>Commands:</b>
/addprem [id] - Add premium
/delprem [id] - Remove premium
/premium on/off - Toggle mode
/listpaired - All sessions
/listsessions - My sessions

═══════════════════
    `;
    
    bot.sendMessage(chatId, ownerText, { parse_mode: 'HTML' });
  }
  
  else if (text === '📋 Help') {
    const helpText = `
═══ 📋 Command List ═══

<b>General:</b>
/start - Start bot
/myid - Your info
/help - This message

<b>Pairing:</b>
/pair [number] - Pair device
/delpair [number] - Delete pair
/listsessions - Your sessions

<b>Premium:</b>
/premium - Premium info

<b>Owner Only:</b>
/addprem [id] - Add premium
/delprem [id] - Remove premium
/premium on/off - Toggle mode
/listpaired - All sessions

═══════════════════
    `;
    
    bot.sendMessage(chatId, helpText, { parse_mode: 'HTML' });
  }
  
  else if (text === '📡 Channel') {
    bot.sendMessage(chatId, '📡 Join our channel: https://t.me/shenxidev');
  }
  
  else if (text === '💬 Owner Contact') {
    bot.sendMessage(chatId, `💬 Contact owner: @${config.owner}`);
  }
});

bot.onText(/\/myid/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const username = msg.from.username || 'No username';
  const firstName = msg.from.first_name || 'Unknown';
  
  const text = `
═══ 👤 Your Info ═══

<b>User ID:</b> <code>${userId}</code>
<b>Username:</b> @${username}
<b>Name:</b> ${firstName}
<b>Premium:</b> ${isPremium(userId) ? '✅ Yes' : '❌ No'}
<b>Owner:</b> ${isOwner(userId) ? '✅ Yes' : '❌ No'}

═══════════════════
  `;
  
  bot.sendMessage(chatId, text, { parse_mode: 'HTML' });
});

bot.onText(/\/pair (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const phoneNumber = match[1];
  
  if (settings.premiumOnly && !isPremium(userId)) {
    return bot.sendMessage(chatId, '❌ Pairing is currently available for premium users only!');
  }
  
  const validNumber = validatePhoneNumber(phoneNumber);
  if (!validNumber) {
    return bot.sendMessage(chatId, '❌ Invalid phone number!\n\n<b>Usage:</b> /pair 254785016388', { parse_mode: 'HTML' });
  }
  
  // Reload sessions from file to check
  const currentSessions = loadJSON('./database/paired.json', []);
  const existingSession = currentSessions.find(s => s.number === validNumber);
  
  if (existingSession) {
    return bot.sendMessage(chatId, '⚠️ This number is already paired!');
  }
  
  bot.sendMessage(chatId, '⏳ Generating pairing code...');
  
  try {
    const WAConnection = require('./whatsapp');
    const code = await WAConnection.requestPairingCode(validNumber, userId);
    
    if (code) {
      const formattedCode = formatPairingCode(code);
      pairingCodes.set(formattedCode, { count: 0, phoneNumber: validNumber, userId });
      
      const text = `
═══ 📱 Pairing Code ═══

<b>Number:</b> <code>${validNumber}</code>
<b>Code:</b> <code>${formattedCode}</code>

<i>Tap the code to copy!</i>
<i>Expires in 1 hour</i>

═══════════════════
      `;
      
      bot.sendMessage(chatId, text, { parse_mode: 'HTML' });
    }
  } catch (error) {
    console.error('Pairing error:', error);
    bot.sendMessage(chatId, '❌ Failed to generate code. Try again later.');
  }
});

bot.onText(/\/delpair (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const phoneNumber = match[1];
  
  const validNumber = validatePhoneNumber(phoneNumber);
  if (!validNumber) {
    return bot.sendMessage(chatId, '❌ Invalid phone number!');
  }
  
  // Reload sessions from file
  let currentSessions = loadJSON('./database/paired.json', []);
  const sessionIndex = currentSessions.findIndex(s => s.number === validNumber && (s.userId === userId || isOwner(userId)));
  
  if (sessionIndex === -1) {
    return bot.sendMessage(chatId, '❌ Session not found or no permission!');
  }
  
  // Delete session folder
  const sessionPath = `./database/sessions/${validNumber}`;
  if (fs.existsSync(sessionPath)) {
    fs.rmSync(sessionPath, { recursive: true, force: true });
    console.log(`🗑️ Deleted session folder: ${sessionPath}`);
  }
  
  // Remove from database
  currentSessions.splice(sessionIndex, 1);
  saveJSON('./database/paired.json', currentSessions);
  
  bot.sendMessage(chatId, `✅ Session deleted: <code>${validNumber}</code>`, { parse_mode: 'HTML' });
});

bot.onText(/\/listpaired/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  if (!isOwner(userId)) {
    return bot.sendMessage(chatId, '❌ Owner only!');
  }
  
  // Reload sessions from file to get latest data
  const currentSessions = loadJSON('./database/paired.json', []);
  
  if (currentSessions.length === 0) {
    return bot.sendMessage(chatId, '📭 No paired sessions!');
  }
  
  let text = '═══ 📱 All Sessions ═══\n\n';
  currentSessions.forEach((session, i) => {
    text += `<b>${i + 1}.</b> <code>${session.number}</code>\n`;
    text += `   User: <code>${session.userId}</code>\n`;
    text += `   Status: ${session.active ? '🟢 Active' : '🔴 Inactive'}\n\n`;
  });
  text += `<b>Total:</b> ${currentSessions.length}\n═══════════════════`;
  
  bot.sendMessage(chatId, text, { parse_mode: 'HTML' });
});

bot.onText(/\/listsessions/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  // Reload sessions from file to get latest data
  const currentSessions = loadJSON('./database/paired.json', []);
  const userSessions = currentSessions.filter(s => s.userId === userId);
  
  if (userSessions.length === 0) {
    return bot.sendMessage(chatId, '📭 No sessions found!');
  }
  
  let text = '═══ 📱 Your Sessions ═══\n\n';
  userSessions.forEach((session, i) => {
    text += `<b>${i + 1}.</b> <code>${session.number}</code>\n`;
    text += `   Status: ${session.active ? '🟢 Active' : '🔴 Inactive'}\n\n`;
  });
  text += `<b>Total:</b> ${userSessions.length}\n═══════════════════`;
  
  bot.sendMessage(chatId, text, { parse_mode: 'HTML' });
});

bot.onText(/\/addprem (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  if (!isOwner(userId)) {
    return bot.sendMessage(chatId, '❌ Owner only!');
  }
  
  const targetId = parseInt(match[1]);
  
  if (isNaN(targetId)) {
    return bot.sendMessage(chatId, '❌ Invalid user ID!\n\n<b>Usage:</b> /addprem 123456789', { parse_mode: 'HTML' });
  }
  
  if (premiumUsers.includes(targetId)) {
    return bot.sendMessage(chatId, '⚠️ User already premium!');
  }
  
  premiumUsers.push(targetId);
  saveData();
  
  bot.sendMessage(chatId, `✅ Added to premium: <code>${targetId}</code>`, { parse_mode: 'HTML' });
});

bot.onText(/\/delprem (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  if (!isOwner(userId)) {
    return bot.sendMessage(chatId, '❌ Owner only!');
  }
  
  const targetId = parseInt(match[1]);
  
  if (isNaN(targetId)) {
    return bot.sendMessage(chatId, '❌ Invalid user ID!');
  }
  
  const index = premiumUsers.indexOf(targetId);
  if (index === -1) {
    return bot.sendMessage(chatId, '❌ User not premium!');
  }
  
  premiumUsers.splice(index, 1);
  saveData();
  
  bot.sendMessage(chatId, `✅ Removed from premium: <code>${targetId}</code>`, { parse_mode: 'HTML' });
});

bot.onText(/\/premium (on|off)/, (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  if (!isOwner(userId)) {
    return bot.sendMessage(chatId, '❌ Owner only!');
  }
  
  const mode = match[1];
  settings.premiumOnly = mode === 'on';
  saveData();
  
  const status = mode === 'on' ? '🔒 ON' : '🔓 OFF';
  logSystem(`Premium Mode: ${status}`, 'success');
  bot.sendMessage(chatId, `✅ Premium mode: ${status}`);
});

bot.onText(/\/public (on|off)/, (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  if (!isOwner(userId)) {
    return bot.sendMessage(chatId, '❌ Owner only!');
  }
  
  const mode = match[1];
  settings.publicMode = mode === 'on';
  settings.selfMode = false;
  saveData();
  
  const status = mode === 'on' ? '🌍 PUBLIC' : '🔒 PRIVATE';
  logSystem(`Public Mode: ${status}`, 'success');
  bot.sendMessage(chatId, `✅ Bot mode: ${status}\n\n${mode === 'on' ? 'Bot will respond to all groups and DMs' : 'Bot will only respond to owner'}`);
});

bot.onText(/\/self (on|off)/, (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  if (!isOwner(userId)) {
    return bot.sendMessage(chatId, '❌ Owner only!');
  }
  
  const mode = match[1];
  settings.selfMode = mode === 'on';
  if (mode === 'on') {
    settings.publicMode = false;
  }
  saveData();
  
  const status = mode === 'on' ? '👤 SELF ONLY' : '🌍 PUBLIC';
  logSystem(`Self Mode: ${status}`, 'success');
  bot.sendMessage(chatId, `✅ Bot mode: ${status}\n\n${mode === 'on' ? 'Bot will only respond to owner' : 'Bot will respond to all'}`);
});

bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  
  const helpText = `
═══ 📋 Command List ═══

<b>General:</b>
/start - Start bot
/myid - Your info
/help - This message

<b>Pairing:</b>
/pair [number] - Pair device
/delpair [number] - Delete pair
/listsessions - Your sessions

<b>Premium:</b>
/premium - Premium info

<b>Owner Only:</b>
/addprem [id] - Add premium
/delprem [id] - Remove premium
/premium on/off - Toggle mode
/listpaired - All sessions

═══════════════════
  `;
  
  bot.sendMessage(chatId, helpText, { parse_mode: 'HTML' });
});

logBanner();
logSystem('Telegram Bot Online', 'success');

setTimeout(async () => {
  logSystem('Loading existing WhatsApp sessions...', 'info');
  const WAConnection = require('./whatsapp');
  await WAConnection.loadExistingSessions();
}, 3000);

module.exports = bot;
