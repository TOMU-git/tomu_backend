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

  const agreement = {
    reply_markup: {
      keyboard: [
        [{ text: "Yes" }],
        [{ text: "No" }],
      ],
      resize_keyboard: true,
      one_time_keyboard: true,
    },
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
        [{ text: 'Ingliz tili'}],
        [{ text: 'Rus tili'}],
        [{ text: 'Arab tili'}],
        [{ text: 'Nemis tili'}],
      ],
      resize_keyboard: true, 
      one_time_keyboard: true,
    },
  };

  this.bot.onText(/\/start/, async (message) => {
    
    const chatId = message.chat.id;
      await this.bot.sendMessage(chatId, "Salom👋! Jonli uchrashuv uchun registratsiya xizmati. Iltimos Ismingizni kiriting.")
      
    this.bot.on('message', async (msg)=>{
      const chatId = msg.chat.id;
        await this.bot.sendMessage(chatId, `Salom, ${msg.text}! Iltimos telefon raqamingizni kiriting. Misol uchun: [+998901234567] yoki pastdagi tugmani bosish orqali telefon raqamingizni ulashing.`, contactButton);
    })

    this.bot.on("contact", async (msg) =>{
      const chatId = msg.chat.id;
        await this.bot.sendMessage(chatId, "Tomu online o'quv platformasidan kurs sotib olganmisiz : ", agreement );
    })

    this.bot.on('message', async (msg) =>{
      const chatId = msg.chat.id;
      await this.bot.sendMessage(chatId, "Qaysi til kursi bo'yicha muloqot qilishni tanlang 👇", courseButton)
    })
})
}};

    

