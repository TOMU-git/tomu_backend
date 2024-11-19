import { ID } from "src/common/types/type";
import { UserHomeworkProgress } from "../entities/user-homework-progress.entity";

// UserHomeworkProgress ma'lumotlarini boshqarish uchun interfeys
export interface IUserHomeworkProgressRepository {
  bulkCreate(
    userHomeworkProgresses: UserHomeworkProgress[],
  ): Promise<UserHomeworkProgress[]>;
  findAll(): Promise<UserHomeworkProgress[]>;
  findByBlockOrderAndUserId(
    blockId: ID,
    userId: ID,
  ): Promise<UserHomeworkProgress[]>;
  findByUserIdBlockOrderAndHomeworkOrder(
    userId: ID,
    blockOrder: number,
    homeworkOrder: number,
  ): Promise<UserHomeworkProgress>;
  deleteAll(userId: ID, blockOrder: number): Promise<boolean>;
  updateProgress(
    updateData: UserHomeworkProgress,
  ): Promise<UserHomeworkProgress>;
  findHomeworkProgress(
    homeworkOrder: ID,
    userId: ID,
    blockOrder: ID,
  ): Promise<UserHomeworkProgress | null>;

  markHomeworkAsWatched(
    homeworkOrder: ID,
    userId: ID,
    blockId: ID,
  ): Promise<UserHomeworkProgress>;
}
