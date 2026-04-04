import { Test, TestingModule } from '@nestjs/testing';
import { LectureService } from './lecture.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ScheduleCalculatorService } from './schedule-calculator.service';
import { NotificationService } from '../notification/services/notification.service';

describe('LectureService', () => {
  let service: LectureService;
  let lectureRepositoryVal: any;
  let groupRepositoryVal: any;
  let eventEmitterVal: any;
  let scheduleCalculatorVal: any;

  beforeEach(async () => {
    lectureRepositoryVal = {
      create: jest.fn().mockImplementation((dto) => Promise.resolve({ id: 1, ...dto })),
      createBulk: jest.fn().mockImplementation((dtos) => Promise.resolve(dtos)), // Mock createBulk
      findUpcomingByGroupId: jest.fn(),
      findLatestByGroupId: jest.fn(),
    };
    groupRepositoryVal = {
      findById: jest.fn().mockReturnValue(Promise.resolve({ id: 1, name: 'Test Group' })),
      findByUserId: jest.fn(),
    };
    eventEmitterVal = {
      emit: jest.fn(),
    };
    scheduleCalculatorVal = {
      generateLecturesForGroup: jest.fn().mockReturnValue(Promise.resolve([
        { title: 'Lecture 1', order: 1, group: { id: 1 } }
      ])),
      calculateNextLectureTime: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LectureService,
        { provide: 'ILectureRepository', useValue: lectureRepositoryVal },
        { provide: 'IGroupRepository', useValue: groupRepositoryVal },
        {
          provide: 'IGrammarRepository', useValue: {
            findGrammarsByCourseId: jest.fn().mockReturnValue(Promise.resolve([{ id: 1, title: 'Grammar 1' }])),
            findOneByOrder: jest.fn(),
          }
        },
        { provide: ScheduleCalculatorService, useValue: scheduleCalculatorVal },
        { provide: NotificationService, useValue: {} },
        { provide: EventEmitter2, useValue: eventEmitterVal },
      ],
    }).compile();

    service = module.get<LectureService>(LectureService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('create should calculate endTime and assign group', async () => {
    const dto = {
      title: 'Test',
      startTime: new Date('2024-01-01T10:00:00Z'),
      duration: 60,
      groupId: 1,
    } as any;

    const result = await service.create(dto);

    expect(groupRepositoryVal.findById).toHaveBeenCalledWith(1);
    expect(lectureRepositoryVal.create).toHaveBeenCalledWith(expect.objectContaining({
      group: expect.objectContaining({ id: 1 }),
      endTime: new Date('2024-01-01T11:00:00Z'),
    }));
    expect(eventEmitterVal.emit).toHaveBeenCalled();
  });

  it('scheduleNextLecture should create next lecture', async () => {
    const group = { id: 1, courseId: 100 };
    const lastLecture = {
      id: 10,
      order: 1,
      startTime: new Date('2024-01-01T15:00:00Z'),
      endTime: new Date('2024-01-01T16:00:00Z'),
      group: { id: 1 }
    };
    const nextGrammar = { title: 'Next Topic' };

    groupRepositoryVal.findById = jest.fn().mockReturnValue(Promise.resolve(group));
    lectureRepositoryVal.findLatestByGroupId = jest.fn().mockReturnValue(Promise.resolve(lastLecture));
    // @ts-ignore
    service['grammarRepository'].findOneByOrder.mockReturnValue(Promise.resolve(nextGrammar));

    scheduleCalculatorVal.calculateNextLectureTime.mockReturnValue({ date: new Date('2024-01-08T15:00:00Z'), nextStep: 3 });

    await service.scheduleNextLecture(1);

    expect(lectureRepositoryVal.findLatestByGroupId).toHaveBeenCalledWith(1);
    expect(service['grammarRepository'].findOneByOrder).toHaveBeenCalledWith(2, 100);
    expect(lectureRepositoryVal.create).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Next Topic',
      order: 2,
      startTime: new Date('2024-01-08T15:00:00Z'),
    }));
  });

  it('createLecturesForGroup should create 1 lecture', async () => {
    const group = { id: 1, courseId: 100 };

    groupRepositoryVal.findById = jest.fn().mockReturnValue(Promise.resolve(group));

    await service.createLecturesForGroup(1); // Create 1 lecture, start order default logic inside service

    // Verify that generateLecturesForGroup was called with limit 1
    expect(scheduleCalculatorVal.generateLecturesForGroup).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1 }), // group
      expect.arrayContaining(['Grammar 1']), // grammarTitles
      null, // lastLecture/startDate
      1, // limit
      1 // startOrder
    );

    expect(lectureRepositoryVal.createBulk).toHaveBeenCalledTimes(1);
    expect(eventEmitterVal.emit).toHaveBeenCalledWith('lecture.created', expect.any(Object));
  });

  it('getLectureByUserId should return upcoming lecture in array', async () => {
    const userId = 1;
    const group = { id: 10 };
    const lecture = { id: 100, title: 'Upcoming Lecture', group: null };

    groupRepositoryVal.findByUserId = jest.fn().mockReturnValue(Promise.resolve(group));
    lectureRepositoryVal.findUpcomingByGroupId = jest.fn().mockReturnValue(Promise.resolve(lecture));

    const result = await service.getLectureByUserId(userId);

    expect(groupRepositoryVal.findByUserId).toHaveBeenCalledWith(userId);
    expect(lectureRepositoryVal.findUpcomingByGroupId).toHaveBeenCalledWith(group.id);
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.data).toHaveLength(1);
    expect(result.statusCode).toBe(200);
  });

  it('getLectureByUserId should return empty array when user has no group', async () => {
    groupRepositoryVal.findByUserId = jest.fn().mockReturnValue(Promise.resolve(null));

    const result = await service.getLectureByUserId(99);

    expect(Array.isArray(result.data)).toBe(true);
    expect(result.data).toHaveLength(0);
    expect(result.statusCode).toBe(200);
  });

  it('getLectureByUserId should return empty array when no upcoming lecture', async () => {
    const group = { id: 10 };
    groupRepositoryVal.findByUserId = jest.fn().mockReturnValue(Promise.resolve(group));
    lectureRepositoryVal.findUpcomingByGroupId = jest.fn().mockReturnValue(Promise.resolve(null));

    const result = await service.getLectureByUserId(1);

    expect(Array.isArray(result.data)).toBe(true);
    expect(result.data).toHaveLength(0);
    expect(result.statusCode).toBe(200);
  });
});
