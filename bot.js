const TelegramBot = require('node-telegram-bot-api');
const token = '7646074398:AAGez_Zz5BYSr-mAglweKe6vy0GJQuBHR2I';
const bot = new TelegramBot(token, { polling: true });

// In-memory store for user states
const userStates = {};

// Function to set user state
const setUserState = (userId, state) => {
  userStates[userId] = state;
};

// Function to get user state
const getUserState = (userId) => {
  return userStates[userId];
};

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, "Welcome! What is your name?");
  setUserState(chatId, 'ASK_NAME'); // Set the state to 'ASK_NAME'
});

bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const userState = getUserState(chatId);

  if (userState === 'ASK_NAME') {
    const name = msg.text;
    bot.sendMessage(chatId, `Nice to meet you, ${name}!`);
    setUserState(chatId, null); // Clear the state
  }
});
