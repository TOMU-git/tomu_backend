import { ResData } from "../../../lib/resData";
import { ID } from "../../../common/types/type";
import { HomeworkProgress } from "../entities/homework-progress.entity";
import { CreateHomeworkProgressDto } from "../dto/create-homework-progress.dto";
import { UpdateHomeworkProgressDto } from "../dto/update-homework-progress.dto"; // Update DTO importi

export interface IHomeworkProgressService {
  create(
    dto: CreateHomeworkProgressDto,
  ): Promise<ResData<Partial<HomeworkProgress>>>;
  findAll(): Promise<ResData<Array<HomeworkProgress>>>;
  findOneById(id: ID): Promise<ResData<HomeworkProgress>>;
  update(
    id: ID,
    dto: UpdateHomeworkProgressDto,
  ): Promise<ResData<HomeworkProgress>>;
  getRandomVideos(order: ID): Promise<ResData<Array<HomeworkProgress>>>;
  getFiveVideos(order: ID): Promise<ResData<Array<HomeworkProgress>>>;
  getWatchedHomeworkProgressUpToOrder(order: ID): Promise<ResData<boolean>>;
}
