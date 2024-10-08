import { ResData } from 'src/lib/resData';
import { ID } from 'src/common/types/type';
import { HomePage } from '../entities/home-page.entity';
import { CreateHomePageDto } from '../dto/create-home-page.dto';
import { UpdateHomePageDto } from '../dto/update-home-page.dto';

export interface IHomePageService {
  create(dto: CreateHomePageDto): Promise<ResData<HomePage>>;
  findAll(): Promise<ResData<Array<HomePage>>>;
  findOneById(id: ID): Promise<ResData<HomePage>>;
  update(id: ID, dto: UpdateHomePageDto): Promise<ResData<HomePage>>;
  delete(id: ID): Promise<ResData<HomePage>>;
}
