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
  findByUserId(id: ID): Promise<ResData<Array<HomeworkProgress>>>;

  update(
    id: ID,
    dto: UpdateHomeworkProgressDto,
  ): Promise<ResData<HomeworkProgress>>;

  delete(id: ID): Promise<ResData<HomeworkProgress>>;
  getVideos(
    userID: ID,
    blockId: ID,
    blockOrder: ID,
  ): Promise<ResData<Array<HomeworkProgress>>>;
}
