import { ID } from "src/common/types/type";
import { Grammar } from "../entities/grammar.entity";

export interface IGrammarRepository {
  create(dto: Grammar): Promise<Grammar>;
  findAll(): Promise<Array<Grammar>>;
  update(entity: Grammar): Promise<Grammar>;
  delete(entity: Grammar): Promise<Grammar>;
  findById(id: ID): Promise<Grammar | null>;
  findGrammarsByCourseId(id: number): Promise<Grammar[]>;
  findOneByOrder(order: number, courseId: ID): Promise<Grammar | null>;
}
