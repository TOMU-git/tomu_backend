import { ID } from "src/common/types/type";
import { LessonProgress } from "../entities/lesson-progress.entity";

export interface ILessonProgressRepository {
  create(dto: LessonProgress): Promise<LessonProgress>;
  findAll(): Promise<Array<LessonProgress>>;
  findById(id: ID): Promise<LessonProgress | null>;
  findByOrderAndUserId(
    blockId: ID,
    userId: ID,
  ): Promise<Array<LessonProgress | null>>;
  isAllLessonWatched(
    blockOrder: ID,
    lessonOrder: ID,
    userId: ID,
  ): Promise<boolean>;
  findOneByUserAndLesson(
    userId: ID,
    lessonId: ID,
  ): Promise<LessonProgress | null>;
  update(dto: LessonProgress): Promise<LessonProgress>;
  findHighestLessonOrderByUserAndBlock(
    blockOrder: ID,
    userId: ID,
  ): Promise<number | null>;
  findLastWatchedLessonOrderByUserIdAndBlockOrder(
    userId: ID,
    blockOrder: ID,
  ): Promise<number | null>;

  existsLessonProgress(
    lessonOrder: ID,
    userId: ID,
    blockOrder: ID,
  ): Promise<boolean>;

  markLessonAsWatched(
    lessonOrder: ID,
    userId: ID,
    blockOrder: ID,
  ): Promise<LessonProgress>;

  findAllWatchedLessonsByUser(userId: ID): Promise<LessonProgress[]>;
}
