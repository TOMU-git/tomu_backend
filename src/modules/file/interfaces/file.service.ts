import { ResData } from 'src/lib/resData';
import { ID } from 'src/common/types/type';
import { File } from '../entities/file.entity';
import { CreateFileDto } from '../dto/create-file.dto';

export interface IFileService {
  create(dto: CreateFileDto): Promise<ResData<File>>;
  multipleCreate(
    dto: CreateFileDto,
    dto2: CreateFileDto,
  ): Promise<ResData<Array<File>>>;
  findAll(): Promise<ResData<Array<File>>>;
  remove(id: ID): Promise<ResData<File>>;
  findOneById(id: ID): Promise<ResData<File>>;
  findByImageUrl(imageUrl: string): Promise<ResData<File | null>>;
  removeByImageUrl(imageUrl: string): Promise<ResData<string>>;
}
