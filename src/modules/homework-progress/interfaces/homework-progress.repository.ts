import { ID } from "src/common/types/type";
import { HomeworkProgress } from "../entities/homework-progress.entity";

export interface IHomeworkProgressRepository {
  create(dto: HomeworkProgress): Promise<HomeworkProgress>;
  findAll(): Promise<Array<HomeworkProgress>>;
  findById(id: ID): Promise<HomeworkProgress | null>;
  findOneByUserAndHomework(
    userId: ID,
    homeworkId: ID,
  ): Promise<HomeworkProgress | null>;
  update(dto: HomeworkProgress): Promise<HomeworkProgress>;
  getVideosWithWatchCountBetween0And5(
    order: ID,
    blockId: ID,
  ): Promise<Array<HomeworkProgress>>;
  getWatchedHomeworkProgressUpToOrder(
    order: ID,
  ): Promise<Array<HomeworkProgress>>;
}
