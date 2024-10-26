import { ResData } from "../../../lib/resData";
import { ID } from "../../../common/types/type";
import { HomeworkProgress } from "../entities/homework-progress.entity";
import { CreateHomeworkProgressDto } from "../dto/create-homework-progress.dto";
export interface IHomeworkProgressService {
  create(dto: CreateHomeworkProgressDto): Promise<ResData<HomeworkProgress>>;
  findAll(): Promise<ResData<HomeworkProgress[]>>;
  findOneById(id: ID): Promise<ResData<HomeworkProgress>>;
}
