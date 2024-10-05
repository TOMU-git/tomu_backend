import { ResData } from 'src/lib/resData';
import { ID } from 'src/common/types/type';
import { Homework } from '../entities/homework.entity';
import { CreateHomeworkDto } from '../dto/create-homework.dto';
import { UpdateHomeworkDto } from '../dto/update-homework.dto';

export interface IHomeworkService {
  create(dto: CreateHomeworkDto): Promise<ResData<Homework>>;
  findAll(): Promise<ResData<Array<Homework>>>;
  findOneById(id: ID): Promise<ResData<Homework>>;
  update(id: ID, dto: UpdateHomeworkDto): Promise<ResData<Homework>>;
  create(dto: CreateHomeworkDto): Promise<ResData<Homework>>;
  delete(id: ID): Promise<ResData<Homework>>;
}
