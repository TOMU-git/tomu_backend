import { Injectable, Logger, Inject } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import * as TelegramBot from 'node-telegram-bot-api';
import { TelegramBotConfig } from '../config/telegram-bot.config';
import { LectureCreatedEvent } from '../events/lecture.events';
import { ILectureService } from 'src/modules/lecture/interfaces/lecture.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/modules/user/entities/user.entity';
import { Lecture } from 'src/modules/lecture/entities/lecture.entity';
import { LectureStatusEnum } from 'src/common/enums/lecture-status.enum';

@Injectable()
export class TelegramBotService {
    private readonly logger = new Logger(TelegramBotService.name);
    private bot: TelegramBot;

    constructor(
        private readonly config: TelegramBotConfig,
        @Inject('ILectureRepository')
        private readonly lectureRepository: any,
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
    ) {
        this.initializeBot();
    }

    private initializeBot() {
        const token = this.config.botToken;
        if (!token) {
            this.logger.error('TELEGRAM_BOT_TOKEN not configured!');
            return;
        }

        try {
            if (this.config.useWebhook) {
                this.bot = new TelegramBot(token);
                this.logger.log(`Telegram bot initialized in WEBHOOK mode`);
            } else {
                this.bot = new TelegramBot(token, { polling: true });
                this.logger.log(`Telegram bot initialized in POLLING mode`);
            }

            // Callback query handler'ni sozlash
            this.bot.on('callback_query', (callbackQuery) => {
                this.handleCallbackQuery(callbackQuery);
            });

            this.logger.log('✅ Telegram bot successfully initialized');
        } catch (error) {
            this.logger.error(`Failed to initialize Telegram bot: ${error.message}`);
        }
    }

    /**
     * Lecture yaratilganda ustozlar guruhiga xabarnoma yuborish
     */
    async sendLectureNotification(event: LectureCreatedEvent): Promise<void> {
        const { lectureId, title, startTime, groupName } = event;

        try {
            const teachersGroupId = this.config.teachersGroupId;
            if (!teachersGroupId) {
                this.logger.error('TELEGRAM_TEACHERS_GROUP_ID not configured!');
                return;
            }

            const message = this.config.getLectureNotificationMessage(title, startTime, groupName);

            // Inline keyboard yaratish
            const keyboard = {
                inline_keyboard: [
                    [
                        {
                            text: '✅ Darsni qabul qilish',
                            callback_data: `claim_lecture:${lectureId}`
                        }
                    ]
                ]
            };

            const sentMessage = await this.bot.sendMessage(teachersGroupId, message, {
                parse_mode: 'HTML',
                reply_markup: keyboard
            });

            // Telegram message ID'ni saqlash
            await this.lectureRepository.update(
                { id: lectureId },
                { telegramMessageId: sentMessage.message_id.toString() }
            );

            this.logger.log(`Lecture notification sent for lecture #${lectureId}`);
        } catch (error) {
            this.logger.error(`Failed to send lecture notification: ${error.message}`);
        }
    }

    /**
     * Callback query'ni boshqarish (darsni qabul qilish)
     */
    private async handleCallbackQuery(callbackQuery: TelegramBot.CallbackQuery): Promise<void> {
        const data = callbackQuery.data;
        const userId = callbackQuery.from.id;
        const messageId = callbackQuery.message?.message_id;
        const chatId = callbackQuery.message?.chat.id;

        this.logger.log(`Received callback: ${data} from user ${userId}`);

        try {
            if (data?.startsWith('claim_lecture:')) {
                const lectureId = parseInt(data.split(':')[1]);
                await this.handleClaimLecture(lectureId, userId, messageId, chatId, callbackQuery);
            }
        } catch (error) {
            this.logger.error(`Error handling callback query: ${error.message}`);
            await this.bot.answerCallbackQuery(callbackQuery.id, {
                text: "❌ Xatolik yuz berdi. Iltimos, qayta urinib ko'ring.",
                show_alert: true
            });
        }
    }

    /**
     * Darsni qabul qilish logikasi
     */
    private async handleClaimLecture(
        lectureId: number,
        telegramUserId: number,
        messageId: number,
        chatId: number,
        callbackQuery: TelegramBot.CallbackQuery
    ): Promise<void> {
        // Lecture'ni olish
        const lecture = await this.lectureRepository.findOne({
            where: { id: lectureId },
            relations: ['assignedTeacher', 'group']
        });

        if (!lecture) {
            await this.bot.answerCallbackQuery(callbackQuery.id, {
                text: '❌ Dars topilmadi',
                show_alert: true
            });
            return;
        }

        // Allaqachon olingan bo'lsa
        if (lecture.assignedTeacher) {
            const teacherName = `${lecture.assignedTeacher.firstName} ${lecture.assignedTeacher.lastName}`;
            await this.bot.answerCallbackQuery(callbackQuery.id, {
                text: this.config.getAlreadyClaimedMessage(teacherName),
                show_alert: true
            });
            return;
        }

        // Ustozni topish (telegram_chat_id bo'yicha)
        const teacher = await this.userRepository.findOne({
            where: { telegramChatId: telegramUserId.toString() }
        });

        if (!teacher) {
            await this.bot.answerCallbackQuery(callbackQuery.id, {
                text: '❌ Sizning profilingiz topilmadi. Iltimos, avval ro\'yxatdan o\'ting.',
                show_alert: true
            });
            return;
        }

        // Ustoz guruh linkini tekshirish
        if (!teacher.telegramGroupLink) {
            await this.bot.answerCallbackQuery(callbackQuery.id, {
                text: this.config.getNoGroupLinkMessage(),
                show_alert: true
            });
            return;
        }

        // Darsni yangilash
        lecture.assignedTeacher = teacher;
        lecture.inviteLink = teacher.telegramGroupLink;
        lecture.claimedAt = new Date();
        lecture.status = LectureStatusEnum.COMPLETED;

        await this.lectureRepository.save(lecture);

        // Ustozga tasdiqlash yuborish
        const confirmationMessage = this.config.getClaimConfirmationMessage(
            lecture.title,
            `${teacher.firstName} ${teacher.lastName}`
        );

        await this.bot.sendMessage(telegramUserId, confirmationMessage, {
            parse_mode: 'HTML'
        });

        // Javob yuborish
        await this.bot.answerCallbackQuery(callbackQuery.id, {
            text: '✅ Dars muvaffaqiyatli qabul qilindi!'
        });

        // Guruh xabarini yangilash (tugmani o'chirish)
        const teacherName = `${teacher.firstName} ${teacher.lastName}`;
        const updatedMessage = this.config.getLectureNotificationMessage(
            lecture.title,
            lecture.startTime,
            lecture.group?.name
        ) + `\n\n🎯 <b>Ustoz:</b> ${teacherName} ✅`;

        try {
            await this.bot.editMessageText(updatedMessage, {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'HTML',
                reply_markup: { inline_keyboard: [] } // Tugmani o'chirish
            });
        } catch (error) {
            this.logger.warn(`Could not edit message: ${error.message}`);
        }

        this.logger.log(`Lecture #${lectureId} claimed by teacher #${teacher.id}`);
    }

    /**
     * Webhook URL'ni sozlash (production uchun)
     */
    async setWebhook(url: string): Promise<boolean> {
        try {
            await this.bot.setWebHook(url);
            this.logger.log(`Webhook set to: ${url}`);
            return true;
        } catch (error) {
            this.logger.error(`Failed to set webhook: ${error.message}`);
            return false;
        }
    }

    /**
     * Webhook'ni o'chirish
     */
    async deleteWebhook(): Promise<boolean> {
        try {
            await this.bot.deleteWebHook();
            this.logger.log('Webhook deleted');
            return true;
        } catch (error) {
            this.logger.error(`Failed to delete webhook: ${error.message}`);
            return false;
        }
    }

    /**
     * Webhook data'sini qayta ishlash
     */
    async processUpdate(update: any): Promise<void> {
        this.bot.processUpdate(update);
    }
}
