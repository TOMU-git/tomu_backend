import { ResData } from "src/lib/resData";
import { ID } from "src/common/types/type";
import { Feedback } from "../entities/feedback.entity";
import { CreateFeedbackDto } from "../dto/create-feedback.dto";
import { UpdateFeedbackDto } from "../dto/update-feedback.dto";

export interface IFeedbackService {
  create(dto: CreateFeedbackDto): Promise<ResData<Feedback>>;
  findAll(): Promise<ResData<Array<Feedback>>>;
  findOneById(id: ID): Promise<ResData<Feedback>>;
  update(id: ID, dto: UpdateFeedbackDto): Promise<ResData<Feedback>>;
  create(dto: CreateFeedbackDto): Promise<ResData<Feedback>>;
  delete(id: ID): Promise<ResData<Feedback>>;
}
