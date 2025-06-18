import { ID } from "src/common/types/type";
import { Lesson } from "../entities/lesson.entity";

export interface ILessonRepository {
  create(dto: Lesson): Promise<Lesson>;
  findAll(): Promise<Array<Lesson>>;
  update(entity: Lesson): Promise<Lesson>;
  delete(entity: Lesson): Promise<Lesson>;
  findById(id: ID): Promise<Lesson | null>;
  findVideosTen(id: number): Promise<Lesson[]>;
  findOneByName(title: string): Promise<Lesson | null>;
  findOneByOrder(order: ID, blockId: ID): Promise<Lesson | null>;
  findLessonsByBlockId(blockId: ID): Promise<Lesson[]>;
  countByBlockId(blockId: ID): Promise<number> 
  findNextFiveLessonsAfterOrder(
    lastLessonOrder: number,
    blockId: ID,
  ): Promise<Array<Lesson>>;
}
