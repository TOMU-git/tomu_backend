import { ID } from "src/common/types/type";
import { HomeworkProgress } from "../entities/homework-progress.entity";

export interface IHomeworkProgressRepository {
  create(dto: HomeworkProgress): Promise<HomeworkProgress>;
  findAll(): Promise<Array<HomeworkProgress>>;
  findById(id: ID): Promise<HomeworkProgress | null>;
  findByUserId(userId: ID): Promise<Array<HomeworkProgress> | null>;
  update(dto: HomeworkProgress): Promise<HomeworkProgress>;
  delete(dto: HomeworkProgress): Promise<HomeworkProgress>;
  findByOrderAndUserId(
    order: ID,
    userId: ID,
  ): Promise<Array<HomeworkProgress | null>>;
  getVideosWithWatchCountBetween0And5(
    order: ID,
    blockOrder: ID,
  ): Promise<Array<HomeworkProgress>>;
  findHighestLessonOrderByUserAndBlock(
    blockOrder: ID,
    userId: ID,
  ): Promise<number | null>;
  getWatchedHomeworkProgressUpToOrder(
    order: ID,
  ): Promise<Array<HomeworkProgress>>;
  findOneByUserAndHomework(
    userId: ID,
    homeworkId: ID,
  ): Promise<HomeworkProgress | null>;
  
}
