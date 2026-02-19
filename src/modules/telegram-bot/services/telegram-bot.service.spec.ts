import { Test, TestingModule } from '@nestjs/testing';
import { TelegramBotService } from './telegram-bot.service';
import { ConfigService } from '@nestjs/config';
import { TelegramBotConfig } from '../config/telegram-bot.config';
import { DataSource, QueryRunner, Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../../user/entities/user.entity';
import { Lecture } from '../../lecture/entities/lecture.entity';
import { EventProcessingTracker } from '../entities/event-processing-tracker.entity';
import * as TelegramBot from 'node-telegram-bot-api';
import { Logger } from '@nestjs/common';

// Mock node-telegram-bot-api
jest.mock('node-telegram-bot-api');

describe('TelegramBotService', () => {
    let service: TelegramBotService;
    let dataSource: DataSource;
    let queryRunner: QueryRunner;
    let userRepository: Repository<User>;
    let lectureRepository: Repository<Lecture>;
    let eventTrackerRepository: Repository<EventProcessingTracker>;
    let botMock: any;

    const mockUser = {
        id: 1,
        firstName: 'Test',
        lastName: 'Teacher',
        telegramChatId: '12345',
        telegramGroupLink: 'https://t.me/group',
    } as User;

    const mockLecture = {
        id: 1,
        title: 'Test Lecture',
        startTime: new Date(),
        status: 'scheduled',
        group: { name: 'Test Group' },
        assignedTeacher: null,
    } as unknown as Lecture;

    const mockLectureRepository = {
        findOne: jest.fn(),
        update: jest.fn(),
        findById: jest.fn().mockResolvedValue(mockLecture),
    };

    const mockConfigService = {
        get: jest.fn((key) => {
            if (key === 'TELEGRAM_BOT_TOKEN') return 'test_token';
            if (key === 'TELEGRAM_TEACHERS_GROUP_ID') return '-100123456789';
            if (key === 'TELEGRAM_USE_WEBHOOK') return 'false';
            return null;
        }),
    };

    const mockTelegramBotConfig = {
        teachersGroupId: '-100123456789',
        getLectureNotificationMessage: jest.fn().mockReturnValue('Lecture Message'),
        getClaimConfirmationMessage: jest.fn().mockReturnValue('Confirmation Message'),
        getNoGroupLinkMessage: jest.fn().mockReturnValue('No Link Message'),
        getAlreadyClaimedMessage: jest.fn().mockReturnValue('Already Claimed Message'),
    };

    beforeEach(async () => {
        // Reset mocks
        jest.clearAllMocks();

        // Mock QueryRunner
        queryRunner = {
            connect: jest.fn(),
            startTransaction: jest.fn(),
            commitTransaction: jest.fn(),
            rollbackTransaction: jest.fn(),
            release: jest.fn(),
            isTransactionActive: false, // Default
            manager: {
                findOne: jest.fn(),
                save: jest.fn(),
                getRepository: jest.fn().mockReturnValue({
                    createQueryBuilder: jest.fn().mockReturnValue({
                        leftJoinAndSelect: jest.fn().mockReturnThis(),
                        where: jest.fn().mockReturnThis(),
                        getOne: jest.fn().mockResolvedValue(mockLecture), // Default validation
                    }),
                }),
            },
        } as unknown as QueryRunner;

        // Mock DataSource
        const mockDataSource = {
            createQueryRunner: jest.fn().mockReturnValue(queryRunner),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TelegramBotService,
                { provide: ConfigService, useValue: mockConfigService },
                { provide: TelegramBotConfig, useValue: mockTelegramBotConfig },
                { provide: DataSource, useValue: mockDataSource },
                {
                    provide: getRepositoryToken(User),
                    useValue: {
                        findOne: jest.fn(),
                    },
                },
                {
                    provide: 'ILectureRepository', // String token for Custom Repository
                    useValue: mockLectureRepository,
                },
                {
                    provide: getRepositoryToken(EventProcessingTracker), // String token not needed if using standard DI, but lets check service
                    useValue: {
                        findOne: jest.fn(),
                        create: jest.fn(),
                        save: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<TelegramBotService>(TelegramBotService);
        dataSource = module.get<DataSource>(DataSource);
        userRepository = module.get<Repository<User>>(getRepositoryToken(User));
        // lectureRepository = module.get<Repository<Lecture>>('ILectureRepository'); // This might need clearer typing or just any
        eventTrackerRepository = module.get<Repository<EventProcessingTracker>>(getRepositoryToken(EventProcessingTracker));

        // Access the mocked TelegramBot instance
        botMock = (TelegramBot as unknown as jest.Mock).mock.instances[0];
        // Re-mock bot methods for each test to ensure clean state
        service['bot'] = {
            on: jest.fn(),
            sendMessage: jest.fn().mockResolvedValue({ message_id: 999 }),
            editMessageText: jest.fn().mockResolvedValue(true),
            answerCallbackQuery: jest.fn().mockResolvedValue(true),
            setWebHook: jest.fn().mockResolvedValue(true),
            deleteWebHook: jest.fn().mockResolvedValue(true),
            processUpdate: jest.fn(),
        } as any;
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('sendLectureNotification', () => {
        it('should send notification and update lecture', async () => {
            const event = {
                lectureId: 1,
                title: 'Test',
                startTime: new Date(),
                groupName: 'Group A'
            };

            await service.sendLectureNotification(event as any);

            expect(service['bot'].sendMessage).toHaveBeenCalled();
            expect(mockLectureRepository.findById).toHaveBeenCalledWith(1);
            expect(mockLectureRepository.update).toHaveBeenCalledWith(
                expect.objectContaining({ telegramMessageId: '999' })
            );
        });
    });

    describe('handleClaimLecture (Transaction Flow)', () => {
        const callbackQuery = {
            id: 'cb_id',
            from: { id: 12345, first_name: 'Test' },
            message: { message_id: 111, chat: { id: -100 } },
        } as any;

        it('should successfully claim a lecture', async () => {
            // Mock User found
            (userRepository.findOne as jest.Mock).mockResolvedValue(mockUser);

            // Mock Lecture found (with lock)
            (queryRunner.manager.findOne as jest.Mock).mockResolvedValue({ ...mockLecture });

            // Mock Relations loaded
            const qbMock = {
                leftJoinAndSelect: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                getOne: jest.fn().mockResolvedValue({ ...mockLecture, assignedTeacher: null }),
            };
            (queryRunner.manager.getRepository as jest.Mock).mockReturnValue({
                createQueryBuilder: jest.fn().mockReturnValue(qbMock)
            });

            // Execute private method via cast or direct call if public
            await service['handleClaimLecture'](1, 12345, 111, -100, callbackQuery);

            // Verify Transaction Steps
            expect(queryRunner.connect).toHaveBeenCalled();
            expect(queryRunner.startTransaction).toHaveBeenCalled();
            expect(queryRunner.manager.save).toHaveBeenCalled();
            expect(queryRunner.commitTransaction).toHaveBeenCalled();
            expect(queryRunner.release).toHaveBeenCalled();

            // Verify Notifications
            expect(service['bot'].sendMessage).toHaveBeenCalled(); // Confirmation
            expect(service['bot'].editMessageText).toHaveBeenCalled(); // Group update
        });

        it('should handle "already claimed" race condition', async () => {
            // Mock User found
            (userRepository.findOne as jest.Mock).mockResolvedValue(mockUser);

            // Mock Lecture found (Lock)
            (queryRunner.manager.findOne as jest.Mock).mockResolvedValue({ ...mockLecture });

            // Mock Relations loaded -> ALREADY CLAIMED
            const alreadyClaimedLecture = { ...mockLecture, assignedTeacher: { firstName: 'Other', lastName: 'Teacher' } };
            const qbMock = {
                leftJoinAndSelect: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                getOne: jest.fn().mockResolvedValue(alreadyClaimedLecture),
            };
            (queryRunner.manager.getRepository as jest.Mock).mockReturnValue({
                createQueryBuilder: jest.fn().mockReturnValue(qbMock)
            });

            await service['handleClaimLecture'](1, 12345, 111, -100, callbackQuery);

            // Verify Rollback and Alert
            expect(service['bot'].answerCallbackQuery).toHaveBeenCalledWith(
                'cb_id',
                expect.objectContaining({ show_alert: true, text: 'Already Claimed Message' })
            );
            expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
            expect(queryRunner.commitTransaction).not.toHaveBeenCalled();
        });

        it('should handle transaction error gracefully', async () => {
            // Mock User found
            (userRepository.findOne as jest.Mock).mockResolvedValue(mockUser);

            // Mock Error during save
            (queryRunner.manager.findOne as jest.Mock).mockResolvedValue(mockLecture);
            (queryRunner.manager.save as jest.Mock).mockRejectedValue(new Error('DB Error'));

            // Mock active transaction for rollback check
            Object.defineProperty(queryRunner, 'isTransactionActive', { get: () => true });

            await service['handleClaimLecture'](1, 12345, 111, -100, callbackQuery);

            expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
            expect(service['bot'].answerCallbackQuery).toHaveBeenCalledWith(
                'cb_id',
                expect.objectContaining({ text: expect.stringContaining('Xatolik') })
            );
        });
        it('should handle 403 Forbidden gracefully without rollback', async () => {
            // Mock User found
            (userRepository.findOne as jest.Mock).mockResolvedValue(mockUser);

            // Mock Lecture found (with lock)
            (queryRunner.manager.findOne as jest.Mock).mockResolvedValue({ ...mockLecture });

            // Mock Relations loaded
            const qbMock = {
                leftJoinAndSelect: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                getOne: jest.fn().mockResolvedValue({ ...mockLecture, assignedTeacher: null }),
            };
            (queryRunner.manager.getRepository as jest.Mock).mockReturnValue({
                createQueryBuilder: jest.fn().mockReturnValue(qbMock)
            });

            // Mock Telegram 403 Error
            (service['bot'].sendMessage as jest.Mock).mockRejectedValue(new Error('ETELEGRAM: 403 Forbidden: bot can\'t initiate conversation'));

            await service['handleClaimLecture'](1, 12345, 111, -100, callbackQuery);

            // Verification: Transaction SHOULD commit
            expect(queryRunner.commitTransaction).toHaveBeenCalled();
            expect(queryRunner.rollbackTransaction).not.toHaveBeenCalled();

            // Verification: Process continued (e.g. group message updated)
            expect(service['bot'].editMessageText).toHaveBeenCalled();
        });
    });
});
