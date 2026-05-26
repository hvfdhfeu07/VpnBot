const { getMainMenuKeyboard } = require('./keyboards');
const { getWelcomeText } = require('./middleware/welcomeManager');
const { t } = require('./middleware/language');

function handleCommand(bot, msg, command) {
  const chatId = msg.chat.id;
  const userId = String(msg.from.id);
  const userName = msg.from.first_name || 'User';

  switch (command) {
    case 'start':
      bot.sendMessage(chatId,
        getWelcomeText(userName),
        { parse_mode: 'Markdown', reply_markup: getMainMenuKeyboard(userId) }
      );
      break;

    case 'help':
      bot.sendMessage(chatId,
        `📖 *VPN Key Bot - Help*\n\n` +
        `*Commands:*\n` +
        `/start - Bot စတင်ရန်\n` +
        `/trial - Trial Key ထုတ်ယူရန်\n` +
        `/mykey - ကိုယ့် Key ကြည့်ရန်\n` +
        `/account - ကိုယ့်အကောင့် ကြည့်ရန်\n` +
        `/id - ကိုယ့် info အပြည့်အစုံ ကြည့်ရန်\n` +
        `/menu - Menu ပြရန်`,
        { parse_mode: 'Markdown' }
      );
      break;

    case 'menu':
      bot.sendMessage(chatId, getWelcomeText(userName), {
        parse_mode: 'Markdown',
        reply_markup: getMainMenuKeyboard(userId),
      });
      break;

    default:
      bot.sendMessage(chatId, 'Unknown command. Type /help for available commands.');
  }
}

module.exports = { handleCommand };
