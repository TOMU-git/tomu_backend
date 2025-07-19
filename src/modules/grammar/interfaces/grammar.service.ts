import { ResData } from "src/lib/resData";
import { ID } from "src/common/types/type";
import { Grammar } from "../entities/grammar.entity";
import { CreateGrammarDto } from "../dto/create-grammar.dto";
import { UpdateGrammarDto } from "../dto/update-grammar.dto";

export interface IGrammarService {
  create(
    dto: CreateGrammarDto,
    file: Express.Multer.File,
  ): Promise<ResData<Grammar>>;
  findAll(): Promise<ResData<Array<Grammar>>>;
  findOneById(id: ID): Promise<ResData<Grammar>>;
  findGrammarByCourseId(id: number, userId: number): Promise<ResData<Grammar[]>>;
  update(
    id: ID,
    dto: UpdateGrammarDto,
    file?: Express.Multer.File,
  ): Promise<ResData<Grammar>>;
  delete(id: ID): Promise<ResData<Grammar>>;
}
