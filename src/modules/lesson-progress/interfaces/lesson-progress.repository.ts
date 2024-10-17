import { ID } from 'src/common/types/type';
import { LessonProgress } from '../entities/lesson-progress.entity';

export interface ILessonProgressRepository {
  create(dto: LessonProgress): Promise<LessonProgress>;
  findAll(): Promise<Array<LessonProgress>>;
  findById(id: ID): Promise<LessonProgress | null>;
  findOneByUserAndLesson(
    userId: ID,
    lessonId: ID,
  ): Promise<LessonProgress | null>;
}
