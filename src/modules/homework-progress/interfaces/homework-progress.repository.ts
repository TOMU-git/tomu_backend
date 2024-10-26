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
}
