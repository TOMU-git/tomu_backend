import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { LectureCompletedEvent } from '../events/lecture-completed.event';
import { ILectureService } from '../interfaces/lecture.service';

@Injectable()
export class LectureListener {
    private readonly logger = new Logger(LectureListener.name);

    constructor(
        @Inject('ILectureService')
        private readonly lectureService: ILectureService,
    ) { }

    @OnEvent('lecture.completed')
    async handleLectureCompleted(payload: LectureCompletedEvent) {
        this.logger.log(`Lecture completed event received for lecture ${payload.lectureId}. Scheduling next lecture...`);
        try {
            await this.lectureService.scheduleNextLecture(payload.groupId);
        } catch (error) {
            this.logger.error(`Error scheduling next lecture for group ${payload.groupId}: ${error.message}`, error.stack);
        }
    }
}
