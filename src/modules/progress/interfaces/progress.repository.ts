import { ID } from 'src/common/types/type';
import { Progress } from '../entities/progress.entity';

export interface IProgressRepository {
  create(dto: Progress): Promise<Progress>;
  findAll(): Promise<Array<Progress>>;
  update(entity: Progress): Promise<Progress>;
  delete(entity: Progress): Promise<Progress>;
  findById(id: ID): Promise<Progress | null>;
  findByUserAndLesson(userId: ID, lessonId: ID): Promise<Progress | null>;
  findByUserAndHomework(userId: ID, homeworkId: ID): Promise<Progress | null>;
}
