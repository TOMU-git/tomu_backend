import { ID } from "src/common/types/type";
import { Alphabet } from "../entities/alphabet.entity";

export interface IAlphabetRepository {
  create(dto: Alphabet): Promise<Alphabet>;
  findAll(): Promise<Array<Alphabet>>;
  update(entity: Alphabet): Promise<Alphabet>;
  delete(entity: Alphabet): Promise<Alphabet>;
  findById(id: ID): Promise<Alphabet | null>;
  findOneByOrder(order: number, courseId: ID): Promise<Alphabet | null>;
  getAlphabetsByCourseId(courseId: number): Promise<Alphabet[]>;
} 