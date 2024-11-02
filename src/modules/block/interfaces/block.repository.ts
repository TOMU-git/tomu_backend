import { ID } from "src/common/types/type";
import { Block } from "../entities/block.entity";

export interface IBlockRepository {
  create(dto: Block): Promise<Block>;
  findAll(): Promise<Array<Block>>;
  update(entity: Block): Promise<Block>;
  delete(entity: Block): Promise<Block>;
  findById(id: ID): Promise<Block | null>;
  findOneByName(title: string): Promise<Block | null>;
  getBlocksLessonsByCourseId(courseId: number): Promise<Array<Block>>;
  getBlocksHomeworksByCourseId(courseId: number): Promise<Array<Block>>;
}
