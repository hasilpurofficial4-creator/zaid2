const chalk = require('chalk');
const moment = require('moment-timezone');

const colors = {
  telegram: chalk.hex('#0088cc'),
  whatsapp: chalk.hex('#25D366'),
  system: chalk.hex('#FFA500'),
  error: chalk.hex('#FF0000'),
  success: chalk.hex('#00FF00'),
  user: chalk.hex('#FFD700'),
  command: chalk.hex('#FF00FF'),
  group: chalk.hex('#00CED1'),
  dm: chalk.hex('#FF69B4')
};

const getTime = () => {
  return moment.tz('Africa/Nairobi').format('HH:mm:ss');
};

const logTelegram = (data) => {
  const { userId, username, firstName, action, message, messageType = 'text' } = data;
  
  console.log('\n' + colors.telegram('╔═══════════════════════════════════════════════════════════╗'));
  console.log(colors.telegram('║') + '  ' + chalk.bold.white('TELEGRAM MESSAGE') + '                                       ' + colors.telegram('║'));
  console.log(colors.telegram('╠═══════════════════════════════════════════════════════════╣'));
  console.log(colors.telegram('║') + '  ' + chalk.bold('Time: ') + chalk.cyan(getTime()) + '                                              ' + colors.telegram('║'));
  console.log(colors.telegram('║') + '  ' + chalk.bold('User: ') + colors.user(`${firstName} (@${username || 'none'})`) + `${' '.repeat(Math.max(0, 35 - (firstName.length + (username?.length || 4))))}` + colors.telegram('║'));
  console.log(colors.telegram('║') + '  ' + chalk.bold('User ID: ') + chalk.yellow(userId) + `${' '.repeat(Math.max(0, 48 - userId.toString().length))}` + colors.telegram('║'));
  console.log(colors.telegram('║') + '  ' + chalk.bold('Action: ') + (action.toLowerCase().includes('group') ? colors.group(action) : colors.dm(action)) + `${' '.repeat(Math.max(0, 49 - action.length))}` + colors.telegram('║'));
  console.log(colors.telegram('║') + '  ' + chalk.bold('Type: ') + chalk.magenta(messageType) + `${' '.repeat(Math.max(0, 51 - messageType.length))}` + colors.telegram('║'));
  console.log(colors.telegram('╠═══════════════════════════════════════════════════════════╣'));
  
  if (message) {
    const msgLines = message.match(/.{1,55}/g) || [message];
    msgLines.forEach((line, i) => {
      if (i === 0) {
        console.log(colors.telegram('║') + '  ' + chalk.bold('Message: ') + chalk.white(line) + `${' '.repeat(Math.max(0, 48 - line.length))}` + colors.telegram('║'));
      } else {
        console.log(colors.telegram('║') + '           ' + chalk.white(line) + `${' '.repeat(Math.max(0, 48 - line.length))}` + colors.telegram('║'));
      }
    });
  }
  
  console.log(colors.telegram('╚═══════════════════════════════════════════════════════════╝') + '\n');
};

const logWhatsApp = (data) => {
  const { sender, senderName, chatType, chatName, command, message, isGroup, isOwner, isPaid } = data;
  
  console.log('\n' + colors.whatsapp('╔═══════════════════════════════════════════════════════════╗'));
  console.log(colors.whatsapp('║') + '  ' + chalk.bold.white('WHATSAPP MESSAGE') + '                                      ' + colors.whatsapp('║'));
  console.log(colors.whatsapp('╠═══════════════════════════════════════════════════════════╣'));
  console.log(colors.whatsapp('║') + '  ' + chalk.bold('Time: ') + chalk.cyan(getTime()) + '                                              ' + colors.whatsapp('║'));
  console.log(colors.whatsapp('║') + '  ' + chalk.bold('User: ') + colors.user(senderName || sender.split('@')[0]) + `${' '.repeat(Math.max(0, 49 - (senderName?.length || sender.split('@')[0].length)))}` + colors.whatsapp('║'));
  console.log(colors.whatsapp('║') + '  ' + chalk.bold('From: ') + (isGroup ? colors.group(chatName) : colors.dm('Direct Message')) + `${' '.repeat(Math.max(0, 49 - (isGroup ? chatName.length : 14)))}` + colors.whatsapp('║'));
  console.log(colors.whatsapp('║') + '  ' + chalk.bold('Type: ') + chalk.magenta(chatType) + `${' '.repeat(Math.max(0, 51 - chatType.length))}` + colors.whatsapp('║'));
  console.log(colors.whatsapp('║') + '  ' + chalk.bold('Command: ') + (command ? colors.command(command) : chalk.gray('none')) + `${' '.repeat(Math.max(0, 47 - (command?.length || 4)))}` + colors.whatsapp('║'));
  console.log(colors.whatsapp('║') + '  ' + chalk.bold('Role: ') + (isOwner ? chalk.red('Owner') : isPaid ? chalk.yellow('Paid') : chalk.white('User')) + `${' '.repeat(Math.max(0, 51 - (isOwner ? 5 : isPaid ? 4 : 4)))}` + colors.whatsapp('║'));
  console.log(colors.whatsapp('╠═══════════════════════════════════════════════════════════╣'));
  
  if (message) {
    const msgLines = message.match(/.{1,55}/g) || [message];
    msgLines.forEach((line, i) => {
      if (i === 0) {
        console.log(colors.whatsapp('║') + '  ' + chalk.bold('Message: ') + chalk.white(line) + `${' '.repeat(Math.max(0, 48 - line.length))}` + colors.whatsapp('║'));
      } else {
        console.log(colors.whatsapp('║') + '           ' + chalk.white(line) + `${' '.repeat(Math.max(0, 48 - line.length))}` + colors.whatsapp('║'));
      }
    });
  }
  
  console.log(colors.whatsapp('╚═══════════════════════════════════════════════════════════╝') + '\n');
};

const logSystem = (message, type = 'info') => {
  const color = type === 'error' ? colors.error : type === 'success' ? colors.success : colors.system;
  const icon = type === 'error' ? '❌' : type === 'success' ? '✅' : '📡';
  
  console.log(color(`${icon} [${getTime()}] ${message}`));
};

const logBanner = () => {
  console.clear();
  console.log(chalk.hex('#FF00FF').bold('\n╔════════════════════════════════════════════════════════════════╗'));
  console.log(chalk.hex('#FF00FF').bold('║') + '              ' + chalk.hex('#00FFFF').bold('神奇女侠 - Shénqí Nǚxiá Bot') + '                      ' + chalk.hex('#FF00FF').bold('║'));
  console.log(chalk.hex('#FF00FF').bold('╠════════════════════════════════════════════════════════════════╣'));
  console.log(chalk.hex('#FF00FF').bold('║') + '  ' + chalk.bold('Owner:') + ' ' + chalk.hex('#FFD700')('shenxidev') + '                                              ' + chalk.hex('#FF00FF').bold('║'));
  console.log(chalk.hex('#FF00FF').bold('║') + '  ' + chalk.bold('Version:') + ' ' + chalk.cyan('1.0.0') + '                                                ' + chalk.hex('#FF00FF').bold('║'));
  console.log(chalk.hex('#FF00FF').bold('║') + '  ' + chalk.bold('Status:') + ' ' + colors.success('Online & Running') + '                                    ' + chalk.hex('#FF00FF').bold('║'));
  console.log(chalk.hex('#FF00FF').bold('╚════════════════════════════════════════════════════════════════╝\n'));
};

module.exports = {
  logTelegram,
  logWhatsApp,
  logSystem,
  logBanner,
  colors
};
