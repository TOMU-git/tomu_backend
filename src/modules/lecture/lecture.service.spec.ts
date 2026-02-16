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

  beforeEach(async () => {
    lectureRepositoryVal = {
      create: jest.fn().mockImplementation((dto) => Promise.resolve({ id: 1, ...dto })),
    };
    groupRepositoryVal = {
      findById: jest.fn().mockReturnValue(Promise.resolve({ id: 1, name: 'Test Group' })),
    };
    eventEmitterVal = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LectureService,
        { provide: 'ILectureRepository', useValue: lectureRepositoryVal },
        { provide: 'IGroupRepository', useValue: groupRepositoryVal },
        { provide: 'IGrammarRepository', useValue: {} },
        { provide: ScheduleCalculatorService, useValue: {} },
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

  it('getLectureByUserId should return upcoming lecture', async () => {
    const userId = 1;
    const group = { id: 10 };
    const lecture = { id: 100, title: 'Upcoming Lecture' };

    groupRepositoryVal.findByUserId = jest.fn().mockReturnValue(Promise.resolve(group));
    lectureRepositoryVal.findUpcomingByGroupId = jest.fn().mockReturnValue(Promise.resolve(lecture));

    const result = await service.getLectureByUserId(userId);

    expect(groupRepositoryVal.findByUserId).toHaveBeenCalledWith(userId);
    expect(lectureRepositoryVal.findUpcomingByGroupId).toHaveBeenCalledWith(group.id);
    expect(result.data).toEqual(lecture);
  });
});
