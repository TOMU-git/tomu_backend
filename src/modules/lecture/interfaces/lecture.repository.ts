import { ID } from "src/common/types/type";
import { Lecture } from "../entities/lecture.entity";

export interface ILectureRepository {
  create(dto: Lecture): Promise<Lecture>;
  findAll(): Promise<Array<Lecture>>;
  update(entity: Lecture): Promise<Lecture>;
  delete(entity: Lecture): Promise<Lecture>;
  findById(id: ID): Promise<Lecture | null>;
}