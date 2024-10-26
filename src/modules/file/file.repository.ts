import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { IFileRepository } from "./interfaces/file.repository";
import { File } from "./entities/file.entity";

@Injectable()
export class FileRepository implements IFileRepository {
  constructor(
    @InjectRepository(File)
    private fileRepository: Repository<File>,
  ) {}

  async delete(entity: File): Promise<File> {
    return await this.fileRepository.remove(entity);
  }

  async findOneById(id: number): Promise<File> {
    return await this.fileRepository.findOneBy({ id });
  }

  async create(entity: File): Promise<File> {
    return await this.fileRepository.save(entity);
  }
  async findAll(): Promise<Array<File>> {
    return await this.fileRepository.find();
  }

  async findByImageUrl(imageUrl: string): Promise<File | null> {
    return await this.fileRepository.findOne({ where: { path: imageUrl } });
  }
}
