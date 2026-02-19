import { Test, TestingModule } from '@nestjs/testing';
import { TelegramBotListener } from './telegram-bot.listener';
import { TelegramBotService } from '../services/telegram-bot.service';
import { EventProcessingTracker } from '../entities/event-processing-tracker.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

describe('TelegramBotListener', () => {
    let listener: TelegramBotListener;
    let telegramBotService: TelegramBotService;
    let eventTrackerRepository: Repository<EventProcessingTracker>;

    const mockTelegramBotService = {
        sendLectureNotification: jest.fn(),
    };

    const mockEventTrackerRepository = {
        findOne: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
    };

    beforeEach(async () => {
        jest.clearAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TelegramBotListener,
                {
                    provide: TelegramBotService,
                    useValue: mockTelegramBotService,
                },
                {
                    provide: getRepositoryToken(EventProcessingTracker),
                    useValue: mockEventTrackerRepository,
                },
            ],
        }).compile();

        listener = module.get<TelegramBotListener>(TelegramBotListener);
        telegramBotService = module.get<TelegramBotService>(TelegramBotService);
        eventTrackerRepository = module.get<Repository<EventProcessingTracker>>(
            getRepositoryToken(EventProcessingTracker),
        );
    });

    it('should be defined', () => {
        expect(listener).toBeDefined();
    });

    describe('handleLectureCreated', () => {
        const event = {
            lectureId: 1,
            title: 'Test Lecture',
            startTime: new Date(),
            groupName: 'Test Group',
        };

        it('should process new event successfully', async () => {
            // 1. Mock: Event not found (new event)
            mockEventTrackerRepository.findOne.mockResolvedValue(null);
            // Mock: Create tracker entity
            mockEventTrackerRepository.create.mockReturnValue({ eventId: 'lecture-1' });
            // Mock: Save tracker
            mockEventTrackerRepository.save.mockResolvedValue({ id: 1 });

            await listener.handleLectureCreated(event as any);

            // Verify: Service called
            expect(telegramBotService.sendLectureNotification).toHaveBeenCalledWith(event);

            // Verify: Tracker saved
            expect(eventTrackerRepository.create).toHaveBeenCalledWith(expect.objectContaining({
                eventId: 'lecture-1',
                status: 'processed'
            }));
            expect(eventTrackerRepository.save).toHaveBeenCalled();
        });

        it('should skip duplicate event (Idempotency)', async () => {
            // 1. Mock: Event FOUND (already processed)
            mockEventTrackerRepository.findOne.mockResolvedValue({
                eventId: 'lecture-1',
                processedAt: new Date()
            });

            await listener.handleLectureCreated(event as any);

            // Verify: Service NOT called
            expect(telegramBotService.sendLectureNotification).not.toHaveBeenCalled();

            // Verify: Tracker NOT saved (no new entry)
            expect(eventTrackerRepository.save).not.toHaveBeenCalled();
        });

        it('should track error if processing fails', async () => {
            // 1. Mock: New event
            mockEventTrackerRepository.findOne.mockResolvedValue(null);

            // 2. Mock: Service throws error
            mockTelegramBotService.sendLectureNotification.mockRejectedValue(new Error('API Error'));

            await listener.handleLectureCreated(event as any);

            // Verify: Service called
            expect(telegramBotService.sendLectureNotification).toHaveBeenCalled();

            // Verify: Error tracked
            expect(eventTrackerRepository.create).toHaveBeenCalledWith(expect.objectContaining({
                status: 'failed',
                errorMessage: 'API Error'
            }));
            expect(eventTrackerRepository.save).toHaveBeenCalled();
        });
    });
});
