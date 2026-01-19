import { ResData } from "src/lib/resData";
import { ID } from "src/common/types/type";
import { Block } from "../entities/block.entity";
import { CreateBlockDto } from "../dto/create-block.dto";
import { UpdateBlockDto } from "../dto/update-block.dto";

export interface IBlockService {
  create(dto: CreateBlockDto): Promise<ResData<Block>>;
  findAll(): Promise<ResData<Array<Block>>>;
  findOneById(id: ID): Promise<ResData<Block>>;
  update(id: ID, dto: UpdateBlockDto): Promise<ResData<Block>>;
  create(dto: CreateBlockDto): Promise<ResData<Block>>;
  delete(id: ID): Promise<ResData<Block>>;
  getBlocksLessonsByCourseId(courseId: number): Promise<ResData<Array<Block>>>;
  getBlocksHomeworksByCourseId(courseId: number): Promise<ResData<Array<Block>>>;
  recalculateCountVideos(id: ID): Promise<ResData<string>>;
}
