import { ID } from "src/common/types/type";
import { HomeworkProgress } from "../entities/homework-progress.entity";

export interface IHomeworkProgressRepository {
  create(dto: HomeworkProgress): Promise<HomeworkProgress>;
  findAll(): Promise<Array<HomeworkProgress>>;
  findById(id: ID): Promise<HomeworkProgress | null>;
  findByUserId(userId: ID): Promise<Array<HomeworkProgress> | null>;
  update(dto: HomeworkProgress): Promise<HomeworkProgress>;
  delete(dto: HomeworkProgress): Promise<HomeworkProgress>;
  areAllWatchedByOrderAndUserId(order: ID, userId: ID): Promise<boolean>;
  findLastWatchedHomeworkOrderByUserIdAndBlockOrder(
    userId: ID,
    blockOrder: number,
  ): Promise<number | null>;
  findByOrderAndUserId(
    order: ID,
    userId: ID,
  ): Promise<Array<HomeworkProgress | null>>;
  getVideosWithWatchCountBetween0And5(
    blockOrder: ID,
  ): Promise<Array<HomeworkProgress>>;
  findHighestHomeworkOrderByUserAndBlock(
    blockOrder: ID,
    userId: ID,
  ): Promise<number | null>;
  findOneByUserAndHomework(
    userId: ID,
    homeworkId: ID,
  ): Promise<HomeworkProgress | null>;
}
