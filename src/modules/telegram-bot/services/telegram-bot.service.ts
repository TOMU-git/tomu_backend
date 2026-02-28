import { Injectable, Logger, Inject } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import * as TelegramBot from 'node-telegram-bot-api';
import axios from 'axios';
import { TelegramBotConfig } from '../config/telegram-bot.config';
import { LectureCreatedEvent } from '../events/lecture.events';
import { ILectureService } from 'src/modules/lecture/interfaces/lecture.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { User } from 'src/modules/user/entities/user.entity';
import { Lecture } from 'src/modules/lecture/entities/lecture.entity';
import { LectureStatusEnum } from 'src/common/enums/lecture-status.enum';
import { RetryHelper } from '../utils/retry.helper';
import { GroupTelegramMember } from 'src/modules/group/entities/group-telegram-member.entity';

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
        @InjectRepository(Lecture)
        private readonly lectureTypeOrmRepository: Repository<Lecture>,
        @InjectRepository(GroupTelegramMember)
        private readonly groupTelegramMemberRepository: Repository<GroupTelegramMember>,
        private readonly dataSource: DataSource,
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
                // Kutubxonani polling OLMAGAN holda ishga tushiramiz (faqat API metodlari uchun)
                // chat_member eventlari uchun alohida manual polling ishlatamiz
                this.bot = new TelegramBot(token);
                this.logger.log(`Telegram bot initialized (manual polling mode)`);

                // Manual polling: barcha update turlarini qabul qiladi
                setTimeout(() => this.startManualPolling(token), 1000);
            }

            // Callback query handler'ni sozlash
            this.bot.on('callback_query', (callbackQuery) => {
                this.handleCallbackQuery(callbackQuery);
            });

            // Chat member update handler — guruhga a'zo qo'shilishini kuzatish
            // MUHIM: node-telegram-bot-api 'chat_member' eventini emit qilmaydi,
            // shuning uchun barcha updatelarni 'update' orqali qo'lda parse qilamiz
            this.bot.on('update', (update: any) => {
                if (update.chat_member) {
                    this.logger.log(`👥 chat_member update received!`);
                    this.handleChatMemberUpdate(update.chat_member);
                }
                if (update.my_chat_member) {
                    this.logger.log(`🤖 Bot status changed in chat: ${update.my_chat_member.chat?.id}`);
                }
            });

            // Polling xatolarini kuzatish
            this.bot.on('polling_error', (error) => {
                this.logger.error(`❌ Polling error: ${error.message}`);
            });

            this.logger.log('✅ Telegram bot successfully initialized');
        } catch (error) {
            this.logger.error(`Failed to initialize Telegram bot: ${error.message}`);
        }
    }

    /**
     * Lecture yaratilganda ustozlar guruhiga xabarnoma yuborish
     */
    /**
     * Barcha Telegram updatelarini qabul qilish uchun manual polling loop.
     * node-telegram-bot-api kutubxonasi chat_member eventlarini qabul qilmasligi
     * sababli, to'g'ridan-to'g'ri Telegram API ga so'rov yuboramiz.
     */
    private async startManualPolling(token: string): Promise<void> {
        this.logger.log(`🔄 Starting manual polling loop (all update types)...`);
        let offset = 0;

        while (true) {
            try {
                const response: any = await axios.post(
                    `https://api.telegram.org/bot${token}/getUpdates`,
                    {
                        offset,
                        timeout: 30,
                        allowed_updates: ['message', 'callback_query', 'chat_member', 'my_chat_member'],
                    },
                    { timeout: 35000 }
                );

                const updates = response.data?.result || [];
                for (const update of updates) {
                    offset = update.update_id + 1;

                    if (update.callback_query) {
                        this.handleCallbackQuery(update.callback_query);
                    }
                    if (update.chat_member) {
                        this.logger.log(`👥 [Poll] chat_member update received!`);
                        await this.handleChatMemberUpdate(update.chat_member);
                    }
                    if (update.my_chat_member) {
                        this.logger.log(`🤖 [Poll] Bot status changed in chat: ${update.my_chat_member.chat?.id}`);
                    }
                }
            } catch (err) {
                this.logger.error(`❌ Manual polling error: ${err.message}`);
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }
    }

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

            const sentMessage = await RetryHelper.retryTelegramCall(
                () => this.bot.sendMessage(teachersGroupId, message, {
                    parse_mode: 'HTML',
                    reply_markup: keyboard
                }),
                'sendLectureNotification'
            );

            // Telegram message ID'ni saqlash
            // Telegram message ID'ni saqlash
            const lecture = await this.lectureRepository.findById(lectureId);
            if (lecture) {
                lecture.telegramMessageId = sentMessage.message_id.toString();
                await this.lectureRepository.update(lecture);
            }

            this.logger.log(`✅ Lecture notification sent for lecture #${lectureId}`);
        } catch (error) {
            this.logger.error(`❌ Failed to send lecture notification after retries: ${error.message}`);
            throw error; // Re-throw to mark event as failed in tracker
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
     * Darsni qabul qilish logikasi (Transaction + Pessimistic Lock bilan)
     */
    private async handleClaimLecture(
        lectureId: number,
        telegramUserId: number,
        messageId: number,
        chatId: number,
        callbackQuery: TelegramBot.CallbackQuery
    ): Promise<void> {
        // Query runner yaratish
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        let teacher: User | null = null;
        let lecture: Lecture | null = null;
        let transactionSuccess = false;

        try {
            // 1. Ustozni topish (transaction tashqarida, chunki bu o'zgarmaydi)
            teacher = await this.userRepository.findOne({
                where: { telegramChatId: telegramUserId.toString() }
            });

            if (!teacher) {
                await this.bot.answerCallbackQuery(callbackQuery.id, {
                    text: '❌ Sizning profilingiz topilmadi. Iltimos, avval ro\'yxatdan o\'ting.',
                    show_alert: true
                });
                await queryRunner.rollbackTransaction();
                return;
            }

            // 2. Ustoz guruh linkini tekshirish
            if (!teacher.telegramGroupLink) {
                await this.bot.answerCallbackQuery(callbackQuery.id, {
                    text: this.config.getNoGroupLinkMessage(),
                    show_alert: true
                });
                await queryRunner.rollbackTransaction();
                return;
            }

            // 3. Lecture'ni PESSIMISTIC_WRITE lock bilan olish
            // MUHIM: Pessimistic lock LEFT JOIN bilan ishlamaydi, shuning uchun
            // avval faqat lecture'ni lock qilamiz, keyin relation'larni load qilamiz
            lecture = await queryRunner.manager.findOne(Lecture, {
                where: { id: lectureId },
                lock: { mode: 'pessimistic_write' } // Race condition protection
            });

            if (!lecture) {
                this.logger.warn(`Lecture #${lectureId} not found`);
                await this.bot.answerCallbackQuery(callbackQuery.id, {
                    text: '❌ Dars topilmadi',
                    show_alert: true
                });
                await queryRunner.rollbackTransaction();
                return;
            }

            // 4. Relation'larni alohida load qilish (lock'dan keyin)
            const loadedLecture = await queryRunner.manager.getRepository(Lecture)
                .createQueryBuilder('lecture')
                .leftJoinAndSelect('lecture.assignedTeacher', 'assignedTeacher')
                .leftJoinAndSelect('lecture.group', 'group')
                .where('lecture.id = :id', { id: lectureId })
                .getOne();

            if (loadedLecture) {
                lecture.assignedTeacher = loadedLecture.assignedTeacher;
                lecture.group = loadedLecture.group;
            }

            // 5. Lock olingandan KEYIN tekshirish
            // Agar allaqachon olingan bo'lsa, ikkinchi ustoz bu yerda to'xtaladi
            if (lecture.assignedTeacher) {
                const teacherName = `${lecture.assignedTeacher.firstName} ${lecture.assignedTeacher.lastName}`;
                await this.bot.answerCallbackQuery(callbackQuery.id, {
                    text: this.config.getAlreadyClaimedMessage(teacherName),
                    show_alert: true
                });
                await queryRunner.rollbackTransaction();
                return;
            }

            // 6. Darsni yangilash (transaction ichida)
            lecture.assignedTeacher = teacher;
            lecture.inviteLink = teacher.telegramGroupLink;
            lecture.claimedAt = new Date();
            lecture.status = LectureStatusEnum.ASSIGNED;

            await queryRunner.manager.save(lecture);

            // 7. Transaction'ni commit qilish
            await queryRunner.commitTransaction();
            transactionSuccess = true;
            this.logger.log(`✅ Lecture #${lectureId} claimed by teacher #${teacher.id} (with transaction)`);

        } catch (error) {
            // Xatolik bo'lsa, transaction'ni rollback qilish
            if (queryRunner.isTransactionActive) {
                await queryRunner.rollbackTransaction();
            }
            this.logger.error(`Error in handleClaimLecture transaction: ${error.message}`, error.stack);

            await this.bot.answerCallbackQuery(callbackQuery.id, {
                text: '❌ Xatolik yuz berdi. Iltimos, qayta urinib ko\'ring.',
                show_alert: true
            });
            return;
        } finally {
            await queryRunner.release();
        }

        // 8. Transaction muvaffaqiyatli bo'lsa, xabarlarni yuborish
        if (transactionSuccess && teacher && lecture) {
            try {
                // Ustozga tasdiqlash yuborish
                const confirmationMessage = this.config.getClaimConfirmationMessage(
                    lecture.title,
                    `${teacher.firstName} ${teacher.lastName}`,
                    lecture.startTime
                );

                try {
                    await RetryHelper.retryTelegramCall(
                        () => this.bot.sendMessage(telegramUserId, confirmationMessage, {
                            parse_mode: 'HTML'
                        }),
                        'sendConfirmationToTeacher'
                    );
                } catch (error) {
                    // Agar ustoz botni start qilmagan bo'lsa (403 Forbidden), faqat log qilamiz
                    if (error.message && (error.message.includes('403') || error.message.includes('Forbidden'))) {
                        this.logger.warn(`⚠️ Could not send private message to teacher #${teacher.id}: Bot not started by user.`);
                    } else {
                        this.logger.error(`❌ Failed to send confirmation to teacher: ${error.message}`);
                    }
                }

                // Javob yuborish
                try {
                    await RetryHelper.retryTelegramCall(
                        () => this.bot.answerCallbackQuery(callbackQuery.id, {
                            text: '✅ Dars muvaffaqiyatli qabul qilindi!'
                        }),
                        'answerCallbackQuery'
                    );
                } catch (error) {
                    this.logger.warn(`Could not answer callback query: ${error.message}`);
                }

                // Guruh xabarini yangilash (tugmani o'chirish)
                const teacherName = `${teacher.firstName} ${teacher.lastName}`;
                const updatedMessage = this.config.getLectureNotificationMessage(
                    lecture.title,
                    lecture.startTime,
                    lecture.group?.name,
                    true
                ) + `\n\n🎯 <b>Ustoz:</b> ${teacherName} ✅`;

                try {
                    await RetryHelper.retryTelegramCall(
                        () => this.bot.editMessageText(updatedMessage, {
                            chat_id: chatId,
                            message_id: messageId,
                            parse_mode: 'HTML',
                            reply_markup: { inline_keyboard: [] } // Tugmani o'chirish
                        }),
                        'editGroupMessage'
                    );
                } catch (error) {
                    this.logger.warn(`Could not edit message (after retries): ${error.message}`);
                }
            } catch (error) {
                this.logger.error(`Error in post-transaction notifications: ${error.message}`);
            }
        }
    }

    /**
     * Webhook URL'ni sozlash (production uchun)
     */
    async setWebhook(url: string): Promise<boolean> {
        try {
            await this.bot.setWebHook(url, {
                allowed_updates: ["message", "callback_query", "chat_member", "my_chat_member"]
            });
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

    /**
     * Guruhga yangi a'zo qo'shilganda yoki chiqganda kuzatish
     * Bu orqali o'quvchilarning Telegram ID larini saqlaymiz
     */
    private async handleChatMemberUpdate(update: any): Promise<void> {
        try {
            const chatId = update.chat?.id?.toString();
            const newMember = update.new_chat_member;
            const userId = newMember?.user?.id?.toString();

            if (!chatId || !userId) return;

            // Bot o'zini e'tiborsiz qoldirish
            const botInfo = await this.bot.getMe();
            if (userId === botInfo.id.toString()) return;

            if (newMember.status === 'member') {
                // Yangi a'zo qo'shildi — saqlash
                const existing = await this.groupTelegramMemberRepository.findOne({
                    where: { telegramUserId: userId, telegramChatId: chatId }
                });

                if (!existing) {
                    let groupId = null;
                    try {
                        // Guruh ID sini topishga harakat qilamiz
                        // 1. Shu chat egasi (o'qituvchi) ni topamiz
                        const teacher = await this.userRepository.findOne({
                            where: { telegramGroupChatId: chatId }
                        });

                        if (teacher) {
                            // 2. Shu o'qituvchining hozirgi yoki yaqinlashib kelayotgan darsini topamiz
                            // Hozircha oddiy yechim: Eng oxirgi active/scheduled dars guruhi
                            const lecture = await this.lectureTypeOrmRepository.findOne({
                                where: {
                                    assignedTeacher: { id: teacher.id },
                                    status: LectureStatusEnum.ONGOING
                                },
                                relations: ['group'],
                                order: { startTime: 'DESC' }
                            });

                            if (lecture && lecture.group) {
                                groupId = lecture.group.id;
                            }
                        }
                    } catch (err) {
                        this.logger.warn(`Could not determine groupId for chat member: ${err.message}`);
                    }

                    const member = this.groupTelegramMemberRepository.create({
                        telegramUserId: userId,
                        telegramChatId: chatId,
                        groupId: groupId, // Null bo'lishi mumkin
                    });

                    await this.groupTelegramMemberRepository.save(member);
                    this.logger.log(`👤 New member tracked: ${userId} in chat ${chatId} (Group: ${groupId})`);
                }
            } else if (newMember.status === 'left' || newMember.status === 'kicked') {
                // A'zo chiqib ketdi — o'chirish
                await this.groupTelegramMemberRepository.delete({
                    telegramUserId: userId,
                    telegramChatId: chatId,
                });
                this.logger.log(`👤 Member removed from tracking: ${userId} in chat ${chatId}`);
            }
        } catch (error) {
            this.logger.error(`Error handling chat member update: ${error.message}`);
        }
    }

    /**
     * Dars tugagach guruhdagi barcha o'quvchilarni chiqarish
     * ban + unban orqali (a'zoni chiqarish, lekin qayta qo'shilish imkonini berish)
     */
    async removeStudentsFromGroup(chatId: string): Promise<void> {
        try {
            // Saqlangan a'zolar ro'yxatini olish
            const members = await this.groupTelegramMemberRepository.find({
                where: { telegramChatId: chatId }
            });

            if (members.length === 0) {
                this.logger.log(`No tracked members to remove from chat ${chatId}`);
                return;
            }

            this.logger.log(`🧹 Removing ${members.length} students from chat ${chatId}`);

            for (const member of members) {
                try {
                    // Ban qilish (guruhdan chiqarish)
                    await RetryHelper.retryTelegramCall(
                        () => this.bot.banChatMember(chatId, parseInt(member.telegramUserId)),
                        `banChatMember:${member.telegramUserId}`
                    );

                    // Darhol unban qilish (qayta qo'shilish imkonini berish)
                    await RetryHelper.retryTelegramCall(
                        () => this.bot.unbanChatMember(chatId, parseInt(member.telegramUserId)),
                        `unbanChatMember:${member.telegramUserId}`
                    );

                    this.logger.log(`✅ Removed member ${member.telegramUserId} from chat ${chatId}`);
                } catch (error) {
                    this.logger.error(`Failed to remove member ${member.telegramUserId}: ${error.message}`);
                }
            }

            // Tracking jadvaldan tozalash
            await this.groupTelegramMemberRepository.delete({ telegramChatId: chatId });
            this.logger.log(`🧹 Cleanup complete for chat ${chatId}`);
        } catch (error) {
            this.logger.error(`Error in removeStudentsFromGroup: ${error.message}`);
        }
    }

    /**
     * Eski invite linkni bekor qilib, yangi link yaratish
     * Yangi link ustozning profilida saqlanadi
     */
    async rotateInviteLink(chatId: string, oldLink: string): Promise<string | null> {
        try {
            this.logger.log(`🔗 Rotating invite link for chat ${chatId}`);

            // 1. Eski qo'shimcha linkni bekor qilish (agar mavjud bo'lsa)
            if (oldLink) {
                try {
                    await RetryHelper.retryTelegramCall(
                        () => this.bot.revokeChatInviteLink(chatId, oldLink),
                        'revokeChatInviteLink'
                    );
                    this.logger.log(`🔗 Old invite link revoked for chat ${chatId}`);
                } catch (error) {
                    this.logger.warn(`Could not revoke old link: ${error.message}`);
                }
            }

            // 2. Primary linkni yangilash
            const inviteLink = await RetryHelper.retryTelegramCall(
                () => this.bot.exportChatInviteLink(chatId),
                'exportChatInviteLink'
            );
            this.logger.log(`🔗 New primary invite link created for chat ${chatId}`);

            // 3. Ustozning profilidagi linkni yangilash
            const teacher = await this.userRepository.findOne({
                where: { telegramGroupChatId: chatId }
            });

            if (teacher) {
                teacher.telegramGroupLink = inviteLink;
                await this.userRepository.save(teacher);
                this.logger.log(`✅ Teacher #${teacher.id} profile updated with new link`);
            } else {
                this.logger.warn(`No teacher found with telegramGroupChatId=${chatId}`);
            }

            return inviteLink;
        } catch (error) {
            this.logger.error(`Error in rotateInviteLink: ${error.message}`);
            return null;
        }
    }

    /**
     * Dars yakunlanganda cleanup jarayonini boshlash
     * lecture.completed eventini eshitadi
     */
    @OnEvent('lecture.completed')
    async handleLectureCompleted(payload: { lectureId: number, groupId: number, assignedTeacherId: number }): Promise<void> {
        try {
            const { assignedTeacherId } = payload;

            if (!assignedTeacherId) {
                this.logger.warn(`No assigned teacher for completed lecture #${payload.lectureId}`);
                return;
            }

            // Ustozni topish
            const teacher = await this.userRepository.findOne({
                where: { id: assignedTeacherId }
            });

            if (!teacher?.telegramGroupChatId) {
                this.logger.warn(`Teacher #${assignedTeacherId} has no telegramGroupChatId`);
                return;
            }

            const chatId = teacher.telegramGroupChatId;
            const oldLink = teacher.telegramGroupLink;

            // 1. O'quvchilarni chiqarish
            await this.removeStudentsFromGroup(chatId);

            // 2. Invite linkni yangilash
            await this.rotateInviteLink(chatId, oldLink);

            this.logger.log(`✅ Cleanup completed for lecture #${payload.lectureId}`);
        } catch (error) {
            this.logger.error(`❌ Cleanup failed for lecture #${payload.lectureId}: ${error.message}`);
        }
    }
}
