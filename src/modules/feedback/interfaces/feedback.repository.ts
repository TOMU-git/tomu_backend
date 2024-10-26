import { ID } from "src/common/types/type";
import { Feedback } from "../entities/feedback.entity";

export interface IFeedbackRepository {
  create(dto: Feedback): Promise<Feedback>;
  findAll(): Promise<Array<Feedback>>;
  update(entity: Feedback): Promise<Feedback>;
  delete(entity: Feedback): Promise<Feedback>;
  findById(id: ID): Promise<Feedback | null>;
}
