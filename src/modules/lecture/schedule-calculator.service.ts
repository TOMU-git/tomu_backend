import { Injectable, Logger } from '@nestjs/common';
import { Group } from '../group/entities/group.entity';
import { Lecture } from './entities/lecture.entity';
import { LectureStatusEnum } from 'src/common/enums/lecture-status.enum';

@Injectable()
export class ScheduleCalculatorService {
    private readonly logger = new Logger(ScheduleCalculatorService.name);
    private readonly TIME_SLOTS = [9, 11, 13, 15, 17, 19, 10, 12, 14, 16, 18, 20];
    private readonly FRIDAY_BLOCKED_START = 12;
    private readonly FRIDAY_BLOCKED_END = 14;

    /**
     * Keyingi dars vaqtini hisoblash
     * @param lastLectureDate - oxirgi dars vaqti
     * @param currentStep - hozirgi qadam (rotation step)
     */
    calculateNextLectureTime(lastLectureDate: Date, currentStep: number): { date: Date; nextStep: number } {
        let nextDate = new Date(lastLectureDate);

        // +1 kun qo'shamiz (1 hafta keyinga)
        nextDate.setDate(nextDate.getDate() + 7);

        // Agar yakshanba bo'lsa, dushanbaga o'tkazamiz
        if (nextDate.getDay() === 0) {
            nextDate.setDate(nextDate.getDate() + 1);
        }

        // Keyingi vaqt slotini olamiz
        const nextStepIndex = (currentStep + 1) % this.TIME_SLOTS.length;
        const nextHour = this.TIME_SLOTS[nextStepIndex];

        nextDate.setHours(nextHour, 0, 0, 0);

        // Agar juma va 12:00-14:00 oralig'ida bo'lsa, skip qilamiz
        if (nextDate.getDay() === 5 && nextHour >= this.FRIDAY_BLOCKED_START && nextHour < this.FRIDAY_BLOCKED_END) {
            // Recursively keyingi vaqtni topamiz
            return this.calculateNextLectureTime(nextDate, nextStepIndex);
        }

        return {
            date: nextDate,
            nextStep: nextStepIndex,
        };
    }

    /**
     * Guruh uchun barcha darslarni generatsiya qilish
     */
    async generateLecturesForGroup(
        group: Group,
        grammarTitles: string[],
        startDate: Date = null,
        limit: number = 0, // 0 means all
        startOrder: number = 1,
    ): Promise<Partial<Lecture>[]> {
        const lectures: Partial<Lecture>[] = [];
        let firstLectureDate: Date;
        if (startDate) {
            firstLectureDate = new Date(startDate);
        } else if (group.startDate) {
            firstLectureDate = new Date(group.startDate);
        } else {
            this.logger.warn(`Group ${group.id} has no startDate. Using current date as fallback.`);
            firstLectureDate = new Date();
        }

        firstLectureDate.setHours(15, 0, 0, 0); // Birinchi dars 15:00 da

        let currentDate = new Date(firstLectureDate);
        let currentStep = this.TIME_SLOTS.indexOf(15); // 15:00 = index 3

        const count = limit > 0 ? Math.min(limit, grammarTitles.length) : grammarTitles.length;

        for (let i = 0; i < count; i++) {
            const endTime = new Date(currentDate);
            endTime.setHours(endTime.getHours() + 1); // 1 soat davomiylik

            lectures.push({
                title: grammarTitles[i], // Grammar titledan directly
                startTime: new Date(currentDate),
                endTime: endTime,
                duration: 60, // 1 soat (minutlarda)
                status: LectureStatusEnum.SCHEDULED,
                order: startOrder + i,
            });

            // Keyingi darsni hisoblash
            if (i < count - 1) {
                const next = this.calculateNextLectureTime(currentDate, currentStep);
                currentDate = next.date;
                currentStep = next.nextStep;
            }
        }

        this.logger.log(`Generated ${lectures.length} lectures for group ${group.name}`);

        return lectures;
    }
}
