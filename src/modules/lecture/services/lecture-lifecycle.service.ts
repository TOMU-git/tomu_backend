import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ILectureRepository } from '../interfaces/lecture.repository';
import { LectureStatusEnum } from 'src/common/enums/lecture-status.enum';

/**
 * Dars statuslarini avtomatik yangilash uchun cron job
 * Har minutda ishlaydi:
 * - ASSIGNED → ONGOING (startTime <= now)
 * - ONGOING → COMPLETED (endTime <= now) + cleanup event
 */
@Injectable()
export class LectureLifecycleService {
    private readonly logger = new Logger(LectureLifecycleService.name);

    constructor(
        @Inject('ILectureRepository')
        private readonly lectureRepository: ILectureRepository,
        private readonly eventEmitter: EventEmitter2,
    ) { }

    /**
     * Har minutda darslarni tekshirib, statuslarni yangilash
     */
    @Cron(CronExpression.EVERY_MINUTE)
    async handleLectureLifecycle(): Promise<void> {
        await this.startDueLectures();
        await this.completeDueLectures();
    }

    /**
     * ASSIGNED → ONGOING: Dars vaqti kirganda
     */
    private async startDueLectures(): Promise<void> {
        try {
            const lectures = await this.lectureRepository.findDueToStart();

            for (const lecture of lectures) {
                try {
                    lecture.status = LectureStatusEnum.ONGOING;
                    await this.lectureRepository.update(lecture);
                    this.logger.log(`📚 Lecture #${lecture.id} started (ASSIGNED → ONGOING): ${lecture.title}`);
                } catch (error) {
                    this.logger.error(`Failed to start lecture #${lecture.id}: ${error.message}`);
                }
            }

            if (lectures.length > 0) {
                this.logger.log(`✅ Started ${lectures.length} lecture(s)`);
            }
        } catch (error) {
            this.logger.error(`Error in startDueLectures: ${error.message}`);
        }
    }

    /**
     * ONGOING → COMPLETED: Dars vaqti tugaganda + cleanup
     */
    private async completeDueLectures(): Promise<void> {
        try {
            const lectures = await this.lectureRepository.findDueToEnd();

            for (const lecture of lectures) {
                try {
                    lecture.status = LectureStatusEnum.COMPLETED;
                    await this.lectureRepository.update(lecture);
                    this.logger.log(`✅ Lecture #${lecture.id} completed (ONGOING → COMPLETED): ${lecture.title}`);

                    // Cleanup event emit qilish (o'quvchilarni chiqarish, link yangilash)
                    this.eventEmitter.emit('lecture.completed', {
                        lectureId: lecture.id,
                        groupId: lecture.group?.id,
                        assignedTeacherId: lecture.assignedTeacher?.id,
                    });
                } catch (error) {
                    this.logger.error(`Failed to complete lecture #${lecture.id}: ${error.message}`);
                }
            }

            if (lectures.length > 0) {
                this.logger.log(`✅ Completed ${lectures.length} lecture(s)`);
            }
        } catch (error) {
            this.logger.error(`Error in completeDueLectures: ${error.message}`);
        }
    }
}
