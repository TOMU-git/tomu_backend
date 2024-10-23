import { BadRequestException, Injectable } from '@nestjs/common';
import * as TelegramBot from 'node-telegram-bot-api';
import { config } from '../../common/config';
import { LiveChatEntity } from '../live-chat/entities/live-chat.entity';
import { MeetingStatusEnum } from 'src/common/enums/enum';

@Injectable()
export class TelegramBotService {
  private bot: TelegramBot;

  constructor() {
    this.bot = new TelegramBot(config.token, {
      polling: false,
    });
  }
  hasNumberOrSign(str: string) {
    const regex = /[\d+-]/;
    return regex.test(str);
  }

  validateFutureDate(inputDate: string): boolean {
    const [day, month, year] = inputDate.split('/').map(Number);
    const enteredDate = new Date(year, month - 1, day);

    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    return enteredDate >= currentDate;
  }

  async init() {
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
          [{ text: 'Ingliz tili' }],
          [{ text: 'Rus tili' }],
          [{ text: 'Arab tili' }],
          [{ text: 'Nemis tili' }],
        ],
        resize_keyboard: true,
        one_time_keyboard: true,
        input_field_placeholder: 'Iltimos, kurslardan birini tanlang',
      },
    };
    const timeButton = {
      reply_markup: {
        keyboard: [
          [{ text: '09:00' }],
          [{ text: '10:00' }],
          [{ text: '13:00' }],
          [{ text: '14:00' }],
          [{ text: '15:00' }],
          [{ text: '16:00' }],
          [{ text: '17:00' }],
          [{ text: '18:00' }],
          [{ text: '19:00' }],
          [{ text: '20:00' }],
          [{ text: '21:00' }],
          [{ text: '22:00' }],
        ],
        resize_keyboard: true,
        one_time_keyboard: true,
        input_field_placeholder: "Iltimos, to'g'ri kealdigan vaqtni tanlang",
      },
    };

    const options = {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '✅ Yes', callback_data: 'Yes' },
            { text: '❌ No', callback_data: 'No' },
          ],
        ],
      },
    };

    const gender = {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '👱‍♂️ Erkak', callback_data: 'Erkak' },
            { text: '👩‍🦰 Ayol', callback_data: 'Ayol' },
          ],
        ],
      },
    };

    const userStates = {};
    const created = new LiveChatEntity();

    const setUserState = (userId: number, state: any) => {
      userStates[userId] = state;
    };

    const getUserState = (userId: number) => {
      return userStates[userId];
    };

    this.bot.onText(/\/start/, async (message) => {
      const chatId = message.chat.id;
      await this.bot.sendMessage(
        chatId,
        "Salom👋! Jonli uchrashuv uchun registratsiya xizmati. Iltimos Ism va familyangizni kiriting. Misol uchun: ['Ilyosxon Isaqov']",
      );
      setUserState(chatId, 'ASK_NAME');
    });

    this.bot.on('message', async (msg) => {
      const chatId = msg.chat.id;
      const userState = getUserState(chatId);

      if (userState === 'ASK_NAME') {
        const name = msg.text;
        const foundSign = this.hasNumberOrSign(msg.text);
        if (foundSign) {
          await this.bot.sendMessage(
            chatId,
            'Iltimos raqam va belgilardan foydalanmang',
          );
          return;
        }
        created.fullname = name;
        await this.bot.sendMessage(
          chatId,
          `Botga xush kelibsiz, ${name} 🙋‍♂️. Jinsingizni tanlang`,
          gender,
        );
        setUserState(chatId, 'ASK_GENDER');
      } else if (userState === 'ASK_PHONE') {
        created.phoneNumber = msg.contact.phone_number;
        await this.bot.sendMessage(
          chatId,
          `Platformadan kurs sotib olganmisiz❓.`,
          options,
        );
      } else if (userState === 'ASK_COURSE') {
        created.selectedMeetingCourse = msg.text;
        await this.bot.sendMessage(
          chatId,
          `Jonli chat kunini kiriting 📅. Misol uchun: [' day/month/year ']`,
        );
        setUserState(chatId, 'ASK_DAY');
      } else if (userState === 'ASK_DAY') {
        const inputDate = msg.text;
        if (!this.validateFutureDate(inputDate)) {
          await this.bot.sendMessage(chatId, 'Invalid date');
          return;
        }
        created.selectedDay = msg.text;
        await this.bot.sendMessage(
          chatId,
          `Jonli chat vaqtini tanlang 🕑.`,
          timeButton,
        );
        setUserState(chatId, 'ASK_TIME');
      } else if (userState === 'ASK_TIME') {
        created.selectedTime = msg.text;
        created.status = MeetingStatusEnum.PAID;
        await this.bot.sendMessage(
          chatId,
          `Ism-familya: ${created.fullname},\nGender: ${created.gender},\nPhone Number: ${created.phoneNumber},\nIs_Course_Purchased: ${created.coursePurchased},\nSelected Meeting Course: ${created.selectedMeetingCourse},\nSelected Day: ${created.selectedDay},\nSelected Time: ${created.selectedTime}`,
        );
      }
    });


    this.bot.on('callback_query', async (callbackQuery) => {
      const chatId = callbackQuery.message.chat.id;
      const msgId = callbackQuery.message.message_id;
      const data = callbackQuery.data;

      if (data === 'Erkak' || data === 'Ayol') {
        created.gender = data;
        await this.bot.sendMessage(
          chatId,
          'Iltimos telefon raqamingizni pastdagi tugmani bosish orqali ulashing ‼️.',
          contactButton,
        );
        await this.bot.deleteMessage(chatId, msgId);
        setUserState(chatId, 'ASK_PHONE');
      } else if (data === 'Yes') {
        created.coursePurchased = data;
        await this.bot.sendMessage(
          chatId,
          "Jonli chat qilmoqchi bo'lgan kursni tanlang 👇 ",
          courseButton,
        );
        await this.bot.deleteMessage(chatId, msgId);
        setUserState(chatId, 'ASK_COURSE');
      } else if (data === 'No') {
        created.coursePurchased = data;
        await this.bot.sendMessage(
          chatId,
          "Platformadagi kurslar ro'yxati bilan tanishing: ",
          courseButton,
        );
        await this.bot.deleteMessage(chatId, msgId);
        setUserState(chatId, 'ASK_COURSE');
      }
    });
  }
}
