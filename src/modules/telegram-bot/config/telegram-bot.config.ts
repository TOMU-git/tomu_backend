import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TelegramBotConfig {
    constructor(private configService: ConfigService) { }

    get botToken(): string {
        return this.configService.get<string>('TELEGRAM_BOT_TOKEN');
    }

    get teachersGroupId(): string {
        return this.configService.get<string>('TELEGRAM_TEACHERS_GROUP_ID');
    }

    get useWebhook(): boolean {
        return this.configService.get<string>('TELEGRAM_USE_WEBHOOK') === 'true';
    }

    get webhookUrl(): string {
        return this.configService.get<string>('TELEGRAM_WEBHOOK_URL');
    }

    // Xabar shablonlari
    getLectureNotificationMessage(lectureTitle: string, startTime: Date, groupName?: string): string {
        const formattedDate = startTime.toLocaleDateString('uz-UZ', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        const formattedTime = startTime.toLocaleTimeString('uz-UZ', {
            hour: '2-digit',
            minute: '2-digit'
        });

        return `🎓 <b>Yangi dars yaratildi!</b>\n\n` +
            `📚 <b>Dars:</b> ${lectureTitle}\n` +
            `📅 <b>Sana:</b> ${formattedDate}\n` +
            `🕐 <b>Vaqt:</b> ${formattedTime}\n` +
            (groupName ? `👥 <b>Guruh:</b> ${groupName}\n` : '') +
            `\n👇 Darsni olish uchun tugmani bosing`;
    }

    getClaimConfirmationMessage(lectureTitle: string, teacherName: string): string {
        return `✅ <b>Dars qabul qilindi!</b>\n\n` +
            `👨‍🏫 <b>Ustoz:</b> ${teacherName}\n` +
            `📚 <b>Dars:</b> ${lectureTitle}\n\n` +
            `Guruh linki muvaffaqiyatli biriktirildi!`;
    }

    getAlreadyClaimedMessage(teacherName: string): string {
        return `⚠️ Bu dars allaqachon ${teacherName} tomonidan olingan.`;
    }

    getNoGroupLinkMessage(): string {
        return `❌ Sizning profilingizda guruh linki topilmadi. Iltimos, avval guruh linkini sozlang.`;
    }
}
