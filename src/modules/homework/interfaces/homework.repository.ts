import { ID } from "src/common/types/type";
import { Homework } from "../entities/homework.entity";

export interface IHomeworkRepository {
  create(dto: Homework): Promise<Homework>;
  findAll(): Promise<Array<Homework>>;
  update(entity: Homework): Promise<Homework>;
  delete(entity: Homework): Promise<Homework>;
  findById(id: ID): Promise<Homework | null>;
  findOneByOrder(order: ID, blockId: ID): Promise<Homework | null>;
  findOneByName(title: string): Promise<Homework | null>;
}
