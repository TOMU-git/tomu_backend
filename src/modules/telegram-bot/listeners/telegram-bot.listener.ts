import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TelegramBotService } from '../services/telegram-bot.service';
import { LectureCreatedEvent } from '../events/lecture.events';
import { EventProcessingTracker } from '../entities/event-processing-tracker.entity';

@Injectable()
export class TelegramBotListener {
    private readonly logger = new Logger(TelegramBotListener.name);

    constructor(
        private readonly telegramBotService: TelegramBotService,
        @InjectRepository(EventProcessingTracker)
        private readonly eventTrackerRepository: Repository<EventProcessingTracker>,
    ) { }

    /**
     * Lecture yaratilganda xabarnoma yuborish (IDEMPOTENT)
     */
    @OnEvent('lecture.created')
    async handleLectureCreated(event: LectureCreatedEvent) {
        const eventType = 'lecture.created';
        const eventId = `lecture-${event.lectureId}`;

        this.logger.log(`Handling ${eventType} event for lecture #${event.lectureId}`);

        try {
            // 1. Event allaqachon qayta ishlangan bo'lsa, skip qilish
            const existingEvent = await this.eventTrackerRepository.findOne({
                where: { eventType, eventId }
            });

            if (existingEvent) {
                this.logger.warn(
                    `⚠️ Event ${eventType}:${eventId} already processed at ${existingEvent.processedAt}. Skipping.`
                );
                return;
            }

            // 2. Xabarnoma yuborish
            await this.telegramBotService.sendLectureNotification(event);

            // 3. Muvaffaqiyatli bo'lganini tracker'ga yozish
            const tracker = this.eventTrackerRepository.create({
                eventType,
                eventId,
                processedAt: new Date(),
                status: 'processed',
            });

            await this.eventTrackerRepository.save(tracker);

            this.logger.log(`✅ Event ${eventType}:${eventId} processed and tracked successfully`);

        } catch (error) {
            this.logger.error(`❌ Error handling ${eventType} event: ${error.message}`, error.stack);

            // Xatolikni ham track qilish (debugging uchun)
            try {
                const tracker = this.eventTrackerRepository.create({
                    eventType,
                    eventId,
                    processedAt: new Date(),
                    status: 'failed',
                    errorMessage: error.message,
                });
                await this.eventTrackerRepository.save(tracker);
            } catch (trackError) {
                this.logger.error(`Failed to track error: ${trackError.message}`);
            }
        }
    }
}
