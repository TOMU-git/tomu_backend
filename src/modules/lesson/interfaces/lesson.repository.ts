import { ID } from 'src/common/types/type';
import { Lesson } from '../entities/lesson.entity';

export interface ILessonRepository {
  create(dto: Lesson): Promise<Lesson>;
  findAll(): Promise<Array<Lesson>>;
  update(entity: Lesson): Promise<Lesson>;
  delete(entity: Lesson): Promise<Lesson>;
  findById(id: ID): Promise<Lesson | null>;
  findOneByName(title: string): Promise<Lesson | null>;
  findLessonsByBlockId(blockId: ID): Promise<Lesson[]>;
}
