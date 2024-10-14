import { File } from '../entities/file.entity';

export interface IFileRepository {
  create(dto: File): Promise<File>;
  multipleCreate(dto: File, dto2: File): Promise<Array<File>>;
  findAll(): Promise<Array<File>>;
  findOneById(id: number): Promise<File | null>;
  delete(entity: File): Promise<File>;
  findByImageUrl(imageUrl: string): Promise<File | null>;
}
