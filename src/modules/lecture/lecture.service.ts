import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotificationService } from '../notification/services/notification.service';
import { CreateLectureDto } from './dto/create-lecture.dto';
import { UpdateLectureDto } from './dto/update-lecture.dto';
import { ILectureService } from './interfaces/lecture.service';
import { ILectureRepository } from './interfaces/lecture.repository';
import { IGroupRepository } from '../group/interfaces/group.repository';
import { IGrammarRepository } from '../grammar/interfaces/grammar.repository';
import { ResData } from 'src/lib/resData';
import { Lecture } from './entities/lecture.entity';
import { ID } from 'src/common/types/type';
import { ScheduleCalculatorService } from './schedule-calculator.service';
import { LectureStatusEnum } from 'src/common/enums/lecture-status.enum';
import { LectureCreatedEvent } from '../telegram-bot/events/lecture.events';
import { LectureCompletedEvent } from './events/lecture-completed.event';

@Injectable()
export class LectureService implements ILectureService {
  private readonly logger = new Logger(LectureService.name);

  constructor(
    @Inject('ILectureRepository')
    private readonly lectureRepository: ILectureRepository,
    @Inject('IGroupRepository')
    private readonly groupRepository: IGroupRepository,
    @Inject('IGrammarRepository')
    private readonly grammarRepository: IGrammarRepository,
    private readonly scheduleCalculator: ScheduleCalculatorService,
    private readonly notificationService: NotificationService,
    private readonly eventEmitter: EventEmitter2,
  ) { }
  async create(createLectureDto: CreateLectureDto): Promise<ResData<Lecture>> {
    const newLecture = new Lecture();
    Object.assign(newLecture, createLectureDto);

    if (createLectureDto.groupId) {
      const group = await this.groupRepository.findById(createLectureDto.groupId);
      if (!group) throw new NotFoundException('Group not found');
      newLecture.group = group;
    }

    if (newLecture.startTime && newLecture.duration) {
      const endTime = new Date(newLecture.startTime);
      endTime.setMinutes(endTime.getMinutes() + newLecture.duration);
      newLecture.endTime = endTime;
    }

    const created = await this.lectureRepository.create(newLecture);

    // Telegram botga xabarnoma yuborish uchun event emit qilish
    this.eventEmitter.emit('lecture.created', new LectureCreatedEvent(
      created.id,
      created.title,
      created.startTime,
      created.duration,
      created.group?.id,
      created.group?.name,
    ));

    return new ResData<Lecture>('Lecture created successfully', 201, created);
  }

  async findAll(): Promise<ResData<Array<Lecture>>> {
    const data = await this.lectureRepository.findAll();
    return new ResData<Array<Lecture>>('All lectures', 200, data);
  }

  async findOne(id: ID): Promise<ResData<Lecture>> {
    const foundData = await this.lectureRepository.findById(id);
    if (!foundData) {
      throw new NotFoundException('Lecture not found');
    }
    return new ResData<Lecture>('Lecture found', 200, foundData);
  }

  async update(id: ID, updateLectureDto: UpdateLectureDto): Promise<ResData<Lecture>> {
    const foundData = await this.lectureRepository.findById(id);
    if (!foundData) {
      throw new NotFoundException('Lecture not found');
    }
    Object.assign(foundData, updateLectureDto);
    const updated = await this.lectureRepository.update(foundData);
    return new ResData<Lecture>('Lecture updated successfully', 200, updated);
  }

  async remove(id: ID): Promise<ResData<Lecture>> {
    const foundData = await this.lectureRepository.findById(id);
    if (!foundData) {
      throw new NotFoundException('Lecture not found');
    }
    const deleted = await this.lectureRepository.delete(foundData);
    return new ResData<Lecture>('Lecture deleted successfully', 200, deleted);
  }

  async createLecturesForGroup(groupId: ID): Promise<ResData<Lecture[]>> {
    const group = await this.groupRepository.findById(groupId);
    if (!group) throw new NotFoundException('Group not found');

    // Kurs bo'yicha grammar titlelarni olamiz
    const grammars = await this.grammarRepository.findGrammarsByCourseId(group.courseId);
    const grammarTitles = grammars.map(g => g.title);

    // Darslarni generatsiya qilamiz (Faqat 1 ta dars oldindan)
    const lectureData = await this.scheduleCalculator.generateLecturesForGroup(
      group,
      grammarTitles,
      null,
      1, // Limit: faqat 1 tasini yaratish
      1  // Boshlanish tartib raqami
    );

    // Database ga saqlaymiz
    const lectures = lectureData.map(data => {
      const lecture = new Lecture();
      Object.assign(lecture, data);
      lecture.group = group;
      return lecture;
    });

    const created = await this.lectureRepository.createBulk(lectures);

    // Har bir lecture uchun event emit qilish
    for (const lecture of created) {
      this.eventEmitter.emit('lecture.created', new LectureCreatedEvent(
        lecture.id,
        lecture.title,
        lecture.startTime,
        lecture.duration,
        lecture.group?.id,
        lecture.group?.name,
      ));
    }

    return new ResData<Lecture[]>('Lectures created successfully', 201, created);
  }

  async updateInviteLink(lectureId: ID, inviteLink: string): Promise<ResData<Lecture>> {
    const lecture = await this.lectureRepository.findById(lectureId);
    if (!lecture) throw new NotFoundException('Lecture not found');

    lecture.inviteLink = inviteLink;
    lecture.status = LectureStatusEnum.COMPLETED;

    const updated = await this.lectureRepository.update(lecture);

    // Cleanup va keyingi darsni rejalashtirish uchun event emit qilish
    this.eventEmitter.emit('lecture.completed', new LectureCompletedEvent(
      updated.id,
      Number(updated.group?.id),
      Number(updated.assignedTeacher?.id),
    ));

    // O'quvchilarga bildirishnoma yuborish
    if (updated.group && updated.group.users) {
      this.logger.log(`Sending notifications to ${updated.group.users.length} students for lecture ${lectureId}`);
      for (const student of updated.group.users) {
        try {
          await this.notificationService.sendNotification({
            userId: Number(student.id),
            title: 'Dars linki tayyor!',
            body: `${updated.title} darsi uchun Telegram link.`,
          });
        } catch (error) {
          this.logger.error(`Notification error for user ${student.id}: ${error.message}`);
        }
      }
    }

    return new ResData<Lecture>('Invite link updated', 200, updated);
  }

  async scheduleNextLecture(groupId: ID): Promise<void> {
    const group = await this.groupRepository.findById(groupId);
    if (!group) {
      this.logger.warn(`Group not found for scheduling next lecture. GroupID: ${groupId}`);
      return;
    }

    // 1. Oxirgi rejalashtirilgan darsni topamiz
    const lastLecture = await this.lectureRepository.findLatestByGroupId(groupId);

    if (!lastLecture) {
      this.logger.warn(`No lectures found for group ${groupId}. Cannot schedule next.`);
      return;
    }

    // 2. Keyingi dars ma'lumotlarini aniqlaymiz
    const nextOrder = lastLecture.order + 1;
    const nextGrammar = await this.grammarRepository.findOneByOrder(nextOrder, group.courseId);

    if (!nextGrammar) {
      this.logger.log(`No more grammar topics for group ${groupId}. Course finished.`);
      return;
    }

    // 3. Keyingi dars vaqtini hisoblaymiz
    const currentStep = [9, 11, 13, 15, 17, 19, 10, 12, 14, 16, 18, 20].indexOf(lastLecture.startTime.getHours());
    const stepIndex = currentStep !== -1 ? currentStep : 3;
    let nextTimeData = this.scheduleCalculator.calculateNextLectureTime(lastLecture.startTime, stepIndex);

    // Agar hisoblangan vaqt o'tmishda bo'lsa, kelajakdagi birinchi mos vaqtni topamiz
    const now = new Date();
    let loopCount = 0;
    while (nextTimeData.date < now) {
      nextTimeData = this.scheduleCalculator.calculateNextLectureTime(nextTimeData.date, nextTimeData.nextStep);
      loopCount++;
      if (loopCount > 1000) {
        this.logger.error(`Infinite loop detected in scheduleNextLecture for group ${groupId}`);
        return;
      }
    }

    const nextStartTime = nextTimeData.date;
    const nextEndTime = new Date(nextStartTime);
    nextEndTime.setHours(nextEndTime.getHours() + 1);

    // 4. Yangi darsni yaratamiz
    const newLecture = new Lecture();
    newLecture.title = nextGrammar.title;
    newLecture.startTime = nextStartTime;
    newLecture.endTime = nextEndTime;
    newLecture.duration = 60;
    newLecture.order = nextOrder;
    newLecture.group = group;
    newLecture.status = LectureStatusEnum.SCHEDULED;

    const created = await this.lectureRepository.create(newLecture);

    this.logger.log(`Scheduled next lecture #${created.id} (Order: ${nextOrder}) for group ${groupId}`);

    // Event emit (notification uchun)
    this.eventEmitter.emit('lecture.created', new LectureCreatedEvent(
      created.id,
      created.title,
      created.startTime,
      created.duration,
      created.group?.id,
      created.group?.name,
    ));

  }

  async findByGroupId(groupId: ID): Promise<ResData<Lecture[]>> {
    const lectures = await this.lectureRepository.findByGroupId(groupId);
    return new ResData<Lecture[]>('Lectures found', 200, lectures);
  }

  async getLectureByUserId(userId: ID): Promise<ResData<Lecture[]>> {
    const group = await this.groupRepository.findByUserId(userId);
    if (!group) {
      return new ResData<Lecture[]>('User is not assigned to any group', 200, []);
    }

    const lecture = await this.lectureRepository.findUpcomingByGroupId(group.id);
    if (!lecture) {
      return new ResData<Lecture[]>('No upcoming lectures at the moment', 200, []);
    }

    const result = {
      ...lecture,
      courseImage: lecture.group?.course?.imageUrl || null,
    } as unknown as Lecture;

    return new ResData<Lecture[]>('Upcoming lecture found', 200, [result]);
  }

  /**
   * Darsni qo'lda boshlash (Admin manual override)
   * ASSIGNED → ONGOING
   */
  async startLecture(id: ID): Promise<ResData<Lecture>> {
    const lecture = await this.lectureRepository.findById(id);
    if (!lecture) throw new NotFoundException('Lecture not found');

    if (lecture.status !== LectureStatusEnum.ASSIGNED) {
      throw new BadRequestException(
        `Darsni boshlash uchun status ASSIGNED bo'lishi kerak. Hozirgi status: ${lecture.status}`
      );
    }

    lecture.status = LectureStatusEnum.ONGOING;
    const updated = await this.lectureRepository.update(lecture);
    this.logger.log(`Lecture #${id} manually started (ASSIGNED → ONGOING)`);

    return new ResData<Lecture>('Lecture started successfully', 200, updated);
  }

  /**
   * Darsni qo'lda tugatish (Admin manual override)
   * ONGOING → COMPLETED + cleanup triggerlanadi
   */
  async completeLecture(id: ID): Promise<ResData<Lecture>> {
    const lecture = await this.lectureRepository.findById(id);
    if (!lecture) throw new NotFoundException('Lecture not found');

    if (lecture.status !== LectureStatusEnum.ONGOING) {
      throw new BadRequestException(
        `Darsni tugatish uchun status ONGOING bo'lishi kerak. Hozirgi status: ${lecture.status}`
      );
    }

    lecture.status = LectureStatusEnum.COMPLETED;
    await this.lectureRepository.update(lecture);
    this.logger.log(`Lecture #${id} manually completed (ONGOING → COMPLETED)`);

    // Cleanup uchun relation'lar bilan qayta yuklash kerak
    // (update() relation'larni qaytarmaydi)
    const completedLecture = await this.lectureRepository.findById(id);

    // Cleanup uchun event emit qilish
    this.eventEmitter.emit('lecture.completed', {
      lectureId: completedLecture.id,
      groupId: (completedLecture as any).group?.id ?? (completedLecture as any).groupId,
      assignedTeacherId: (completedLecture as any).assignedTeacher?.id ?? (completedLecture as any).assignedTeacherId,
    });

    return new ResData<Lecture>('Lecture completed successfully', 200, completedLecture);
  }

  /**
   * Darsni bekor qilish (Admin manual override)
   * Har qanday statusdan → CANCELLED
   */
  async cancelLecture(id: ID): Promise<ResData<Lecture>> {
    const lecture = await this.lectureRepository.findById(id);
    if (!lecture) throw new NotFoundException('Lecture not found');

    if (lecture.status === LectureStatusEnum.COMPLETED || lecture.status === LectureStatusEnum.CANCELLED) {
      throw new BadRequestException(
        `Bu darsni bekor qilib bo'lmaydi. Hozirgi status: ${lecture.status}`
      );
    }

    lecture.status = LectureStatusEnum.CANCELLED;
    const updated = await this.lectureRepository.update(lecture);
    this.logger.log(`Lecture #${id} cancelled`);

    return new ResData<Lecture>('Lecture cancelled successfully', 200, updated);
  }

  /**
   * O'qituvchining yakunlangan darslari hisoboti
   */
  async getTeacherReport(teacherId: ID): Promise<ResData<Lecture[]>> {
    const lectures = await this.lectureRepository.findCompletedByTeacherId(teacherId);
    return new ResData<Lecture[]>('Teacher report', 200, lectures);
  }

  /**
   * Guruhning barcha darslari hisoboti
   */
  async getGroupReport(groupId: ID): Promise<ResData<Lecture[]>> {
    const lectures = await this.lectureRepository.findAllByGroupIdWithStats(groupId);
    return new ResData<Lecture[]>('Group report', 200, lectures);
  }
}

