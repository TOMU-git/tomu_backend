import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ILectureRepository } from '../interfaces/lecture.repository';
import { Lecture } from '../entities/lecture.entity';
import { NotificationService } from '../../notification/services/notification.service';

/**
 * Dars boshlanishi oldidan o'quvchilarga eslatma yuborish
 * Har minutda tekshiradi:
 * - Darsdan 60 daqiqa qolgan va reminderSent = false bo'lgan darslar
 * - O'sha dars guruhi o'quvchilariga push notification yuboradi
 */
@Injectable()
export class LectureReminderService {
    private readonly logger = new Logger(LectureReminderService.name);

    constructor(
        @Inject('ILectureRepository')
        private readonly lectureRepository: ILectureRepository,
        private readonly notificationService: NotificationService,
    ) { }

    /**
     * Har minutda darslarni tekshirib, eslatma yuborish
     * Darsdan 60 daqiqa qolgan va hali eslatma yuborilmaganlarni topadi
     */
    @Cron(CronExpression.EVERY_MINUTE)
    async handleReminders(): Promise<void> {
        try {
            const lectures = await this.lectureRepository.findLecturesNeedingReminder(60);

            for (const lecture of lectures) {
                try {
                    await this.sendReminderToStudents(lecture);

                    // Eslatma yuborilganini belgilash
                    lecture.reminderSent = true;
                    await this.lectureRepository.update(lecture);

                    this.logger.log(`🔔 Reminder sent for lecture #${lecture.id}: ${lecture.title}`);
                } catch (error) {
                    this.logger.error(`Failed to send reminder for lecture #${lecture.id}: ${error.message}`);
                }
            }

            if (lectures.length > 0) {
                this.logger.log(`🔔 Sent reminders for ${lectures.length} lecture(s)`);
            }
        } catch (error) {
            this.logger.error(`Error in handleReminders: ${error.message}`);
        }
    }

    /**
     * Guruhdagi barcha o'quvchilarga eslatma yuborish
     */
    private async sendReminderToStudents(lecture: Lecture): Promise<void> {
        if (!lecture.group?.users || lecture.group.users.length === 0) {
            this.logger.warn(`No students found for lecture #${lecture.id}`);
            return;
        }

        const formattedTime = new Date(lecture.startTime).toLocaleTimeString('uz-UZ', {
            hour: '2-digit',
            minute: '2-digit',
        });

        const formattedDate = new Date(lecture.startTime).toLocaleDateString('uz-UZ', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
        });

        for (const student of lecture.group.users) {
            try {
                await this.notificationService.sendNotification({
                    userId: Number(student.id),
                    title: '📚 Dars boshlanmoqda!',
                    body: `"${lecture.title}" darsi bugun ${formattedTime} da boshlanadi.${lecture.inviteLink ? ' Guruh linkini tekshiring.' : ''}`,
                });
            } catch (error) {
                this.logger.error(`Reminder notification error for user ${student.id}: ${error.message}`);
            }
        }
    }
}
