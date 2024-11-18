import { ResData } from "src/lib/resData";
import { ID } from "src/common/types/type";
import { Homework } from "../entities/homework.entity";
import { CreateHomeworkDto } from "../dto/create-homework.dto";
import { UpdateHomeworkDto } from "../dto/update-homework.dto";

export interface IHomeworkService {
  create(
    dto: CreateHomeworkDto,
    file: Express.Multer.File,
  ): Promise<ResData<Homework>>;
  findAll(): Promise<ResData<Array<Homework>>>;
  findOneById(id: ID): Promise<ResData<Homework>>;
  update(
    id: ID,
    dto: UpdateHomeworkDto,
    file: Express.Multer.File,
  ): Promise<ResData<Homework>>;
  getNextFiveVideos(order: ID, blockId: ID): Promise<ResData<Array<Homework>>>;
  delete(id: ID): Promise<ResData<Homework>>;
  getHomeworksByBlockId(blockId: ID): Promise<ResData<Homework[]>>;
}
