import { Inject, Injectable } from "@nestjs/common";
import { ResData } from "src/lib/resData";
import { ILessonProgressRepository } from "../lesson-progress/interfaces/lesson-progress.repository";
import { IHomeworkProgressRepository } from "../homework-progress/interfaces/homework-progress.repository";
import { ILessonRepository } from "../lesson/interfaces/lesson.repository";
import { IHomeworkRepository } from "../homework/interfaces/homework.repository";
import { ID } from "src/common/types/type";

@Injectable()
export class UserProgressService {
  constructor(
    @Inject("ILessonProgressRepository")
    private readonly lessonProgressRepository: ILessonProgressRepository,

    @Inject("IHomeworkProgressRepository")
    private readonly homeworkProgressRepository: IHomeworkProgressRepository,

    @Inject("ILessonRepository")
    private readonly lessonRepository: ILessonRepository,

    @Inject("IHomeworkRepository")
    private readonly homeworkRepository: IHomeworkRepository,
  ) {}

  async getWatchedHomeworksCount(userId: ID): Promise<Number> {
    const watchedVideosCount =
      await this.homeworkProgressRepository.findAllWatchedHomeworkByUser(
        userId,
      );

    return Number(watchedVideosCount.length);
  }

  async getWatchedLessonsCount(userId: ID): Promise<Number> {
    const watchedVideosCount =
      await this.lessonProgressRepository.findAllWatchedLessonsByUser(userId);
    return Number(watchedVideosCount.length);
  }

  async getVideosCount(): Promise<Number> {
    const homeworks = await this.homeworkRepository.findAll();
    const lessons = await this.lessonRepository.findAll();

    const allVideosCount = Number(homeworks.length) + Number(lessons.length);

    return allVideosCount;
  }

  async getProgressData(userId: ID): Promise<any> {
    const allVideosCount = await this.getVideosCount();
    const homeworkCount = await this.getWatchedHomeworksCount(userId);
    const lessonCount = await this.getWatchedLessonsCount(userId);
    const watchedVideosCount = Number(homeworkCount) + Number(lessonCount);

    return {
      allVideosCount,
      watchedVideosCount,
    };
  }
}
