import { ID } from "src/common/types/type";
import { LessonProgress } from "../entities/lesson-progress.entity";

export interface ILessonProgressRepository {
  create(dto: LessonProgress): Promise<LessonProgress>;
  findAll(): Promise<Array<LessonProgress>>;
  findById(id: ID): Promise<LessonProgress | null>;
  findByOrderAndUserId(
    order: ID,
    userId: ID,
  ): Promise<Array<LessonProgress | null>>;
  findIfAllWatched(
    blockOrder: ID,
    lessonOrder: ID,
    userId: ID,
  ): Promise<boolean>;
  findOneByUserAndLesson(
    userId: ID,
    lessonId: ID,
  ): Promise<LessonProgress | null>;
  update(dto: LessonProgress): Promise<LessonProgress>;
}
