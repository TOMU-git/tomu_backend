import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { TelegramBotService } from '../services/telegram-bot.service';
import { LectureCreatedEvent } from '../events/lecture.events';

@Injectable()
export class TelegramBotListener {
    private readonly logger = new Logger(TelegramBotListener.name);

    constructor(private readonly telegramBotService: TelegramBotService) { }

    /**
     * Lecture yaratilganda xabarnoma yuborish
     */
    @OnEvent('lecture.created')
    async handleLectureCreated(event: LectureCreatedEvent) {
        this.logger.log(`Handling lecture.created event for lecture #${event.lectureId}`);

        try {
            await this.telegramBotService.sendLectureNotification(event);
        } catch (error) {
            this.logger.error(`Error handling lecture.created event: ${error.message}`);
        }
    }
}
