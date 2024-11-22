import { ID } from "src/common/types/type";
import { LessonProgress } from "../entities/lesson-progress.entity";

export interface ILessonProgressRepository {
  create(dto: LessonProgress): Promise<LessonProgress>;
  findAll(): Promise<Array<LessonProgress>>;
  findById(id: ID): Promise<LessonProgress | null>;
  findByBlockIdAndUserId(
    blockId: ID,
    userId: ID,
  ): Promise<Array<LessonProgress | null>>;
  isAllLessonWatched(
    blockOrder: ID,
    lessonOrder: ID,
    userId: ID,
    courseId: ID,
  ): Promise<boolean>;
  findOneByUserAndLesson(
    userId: ID,
    lessonId: ID,
  ): Promise<LessonProgress | null>;
  update(dto: LessonProgress): Promise<LessonProgress>;
  findMaxLessonOrder(
    blockOrder: ID,
    userId: ID,
    courseId: ID,
  ): Promise<number | null>;
  findLastWatchedLessonOrder(
    userId: ID,
    courseId: ID,
    blockOrder: ID,
  ): Promise<number | null> ;

  getLessonProgress(
    lessonOrder: ID,
    userId: ID,
    blockId: ID,
  ): Promise<LessonProgress | null>;

  markLessonAsWatched(
    lessonOrder: ID,
    userId: ID,
    blockId: ID,
  ): Promise<LessonProgress>;

  findAllWatchedLessonsByUser(userId: ID): Promise<LessonProgress[]>;

}
