import { Injectable } from '@nestjs/common';
import * as TelegramBot from 'node-telegram-bot-api';
import { config } from '../../common/config';

@Injectable()
export class TelegramBotService {
  private bot: TelegramBot;

  constructor() {
    this.bot = new TelegramBot(config.token, { polling: true });
  }
// async showMenu(chatId: number) {
//   await this.bot.sendMessage(chatId, 'Choose an option:', {
//       reply_markup: {
//         keyboard: [
//           [{ text: "Begin registration" }],
//           [{ text: "See your registered mock exam dates" }],
//           [{ text: "Abort ongoing registration" }],
//         ],
//         resize_keyboard: true,
//         one_time_keyboard: true,
//       },
//     });
// }
async init(){
  const menuOptions = {
    reply_markup: {
      keyboard: [
        [{ text: "/" }],
        [{ text: "Abort" }],
      ],
      resize_keyboard: true,
      one_time_keyboard: true,
    },
  }
  async function hasLetter(str: string) {
    const regex = /[a-zA-Z]/;
    return regex.test(str);
  }

  async function hasNumber(str: string) {
    const regex = /\d/;
    return regex.test(str);
  }
    
  const contactButton = {
    reply_markup: {
      keyboard: [
        [
          {
            text: 'Share phone number',
            request_contact: true, 
          },
        ],
      ],
      resize_keyboard: true, 
      one_time_keyboard: true,
    },
  };
  const courseButton = {
    reply_markup: {
      keyboard: [
        [{ text: 'Ingliz tili'}], [{ text: 'Rus tili'}],
        [{ text: 'Arab tili'}], [{ text: 'Nemis tili'}],
      ],
      resize_keyboard: true, 
      one_time_keyboard: true,
      input_field_placeholder: 'Iltimos, kurslardan birini tanlang',
    },
  };
  const timeButton = {
    reply_markup: {
      keyboard: [
        [{ text: '09:00'}], [{ text: '10:00'}],
        [{ text: '13:00'}], [{ text: '14:00'}],
        [{ text: '15:00'}], [{ text: '16:00'}],
        [{ text: '17:00'}], [{ text: '18:00'}],
        [{ text: '19:00'}], [{ text: '20:00'}],
        [{ text: '21:00'}], [{ text: '22:00'}],
      ],
      resize_keyboard: true, 
      one_time_keyboard: true,
      input_field_placeholder: 'Iltimos, to\'g\'ri kealdigan vaqtni tanlang',
    },
  };

  const options = {
    reply_markup: {
      inline_keyboard: [
      [
        { text: '✅ Yes', callback_data: 'Yes' },
        { text: '❌ No', callback_data: 'No' }
      ],
      ]
    }
  };

  const userStates = {};

   const setUserState = (userId: number, state:any ) => {
   userStates[userId] = state;
};

  const getUserState = (userId: number) => {
  return userStates[userId];
};

  this.bot.onText(/\/start/, async (message) => {
    const chatId = message.chat.id;
      await this.bot.sendMessage(chatId, "Salom👋! Jonli uchrashuv uchun registratsiya xizmati. Iltimos Ism va familyangizni kiriting.")
      setUserState(chatId, "ASK_NAME");
})

  this.bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const userState = getUserState(chatId);

  if (userState === 'ASK_NAME') {
    const name = msg.text;
    await this.bot.sendMessage(chatId, `Botga xush kelibsiz, ${name}. Iltimos telefon raqamingizni kiriting. Misol uchun: [+998901234567] yoki pastdagi tugmani bosish orqali raqamingizni ulashing!`, contactButton);
    setUserState(chatId, "ASK_PHONE"); 
  }
});
  this.bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const userState = getUserState(chatId);
  if (userState === 'ASK_PHONE') {
    await this.bot.sendMessage(chatId, `Platformadan kurs sotib olganmisiz.`, options);
    setUserState(chatId, "ASK_PHONE"); 
  }
});


this.bot.on('callback_query', async (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id
  const message = callbackQuery.message;
  const data = callbackQuery.data;
  if (data === 'Yes') {
    await this.bot.sendMessage(chatId, 'Jonli chat qilmoqchi bo\'lgan kursni tanlang 👇 ', courseButton);
    setUserState(chatId, "ASK_COURSE");
  } else if (data === 'No') {
    await this.bot.sendMessage(chatId, 'Platformadagi kurslar ro\'yxati bilan tanishing: ', courseButton);
  }
});
  this.bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const userState = getUserState(chatId);
  if (userState === 'ASK_COURSE') {
    await this.bot.sendMessage(chatId, `Jonli chat vaqtini tanlang 🕑.`, timeButton);
    setUserState(chatId, "ASK_TIME"); 
  }
});

  this.bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const userState = getUserState(chatId);
  if (userState === 'ASK_TIME') {
    await this.bot.sendMessage(chatId, ``, timeButton);
    setUserState(chatId, "ASK_TIME"); 
  }
});

}};

    

