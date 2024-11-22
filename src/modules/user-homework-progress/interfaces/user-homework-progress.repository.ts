import { ID } from "src/common/types/type";
import { UserHomeworkProgress } from "../entities/user-homework-progress.entity";

// UserHomeworkProgress ma'lumotlarini boshqarish uchun interfeys
export interface IUserHomeworkProgressRepository {
  bulkCreate(
    userHomeworkProgresses: UserHomeworkProgress[],
  ): Promise<UserHomeworkProgress[]>;
  findAll(): Promise<UserHomeworkProgress[]>;
  findByBlockIdAndUserId(
    blockId: ID,
    userId: ID,
  ): Promise<UserHomeworkProgress[]>;
  findByUserIdBlockIdAndHomeworkOrder(
    userId: ID,
    blockId: ID,
    homeworkOrder: ID,
  ): Promise<UserHomeworkProgress>;
  deleteAll(userId: ID, blockId: ID): Promise<boolean> 
  updateProgress(
    updateData: UserHomeworkProgress,
  ): Promise<UserHomeworkProgress>;
  findNextHomeworkProgress(
    currentHomeworkOrder: ID,
    userId: ID,
    blockId: ID,
  ): Promise<UserHomeworkProgress | null>

  markHomeworkAsWatched(
    homeworkOrder: ID,
    userId: ID,
    blockId: ID,
  ): Promise<UserHomeworkProgress>;
}
