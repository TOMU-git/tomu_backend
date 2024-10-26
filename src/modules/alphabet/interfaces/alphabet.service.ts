import { ResData } from "src/lib/resData";
import { ID } from "src/common/types/type";
import { Alphabet } from "../entities/alphabet.entity";
import { CreateAlphabetDto } from "../dto/create-alphabet.dto";
import { UpdateAlphabetDto } from "../dto/update-alphabet.dto";

export interface IAlphabetService {
  create(
    dto: CreateAlphabetDto,
    file: Express.Multer.File,
  ): Promise<ResData<Alphabet>>;
  findAll(): Promise<ResData<Array<Alphabet>>>;
  findOneById(id: ID): Promise<ResData<Alphabet>>;
  update(
    id: ID,
    dto: UpdateAlphabetDto,
    file: Express.Multer.File,
  ): Promise<ResData<Alphabet>>;
  delete(id: ID): Promise<ResData<Alphabet>>;
  getAlphabetsByCourseId(courseId: ID): Promise<ResData<Alphabet[]>>;
}
