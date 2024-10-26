import { ResData } from "src/lib/resData";
import { ID } from "src/common/types/type";
import { File } from "../entities/file.entity";

export interface IFileService {
  create(dto: Express.Multer.File): Promise<ResData<File>>;
  findAll(): Promise<ResData<Array<File>>>;
  remove(id: ID): Promise<ResData<File>>;
  findOneById(id: ID): Promise<ResData<File>>;
  findByImageUrl(imageUrl: string): Promise<ResData<File | null>>;
  removeByImageUrl(imageUrl: string): Promise<ResData<string>>;
}
