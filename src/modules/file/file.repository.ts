import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IFileRepository } from './interfaces/file.repository';
import { File } from './entities/file.entity';

@Injectable()
export class FileRepository implements IFileRepository {
  constructor(
    @InjectRepository(File)
    private fileRepository: Repository<File>,
  ) {}
  async multipleCreate(
    dto1: File,
    dto2: File,
  ): Promise<Array<File>> {
    const newFile = await this.fileRepository.create([dto1, dto2]);
    await this.fileRepository.save(newFile);
    return newFile;
  }

  async delete(entity: File): Promise<File> {
    return await this.fileRepository.remove(entity);
  }

  async findOneById(id: number): Promise<File> {
    return await this.fileRepository.findOneBy({ id });
  }

  async create(entity: File): Promise<File> {
    const newFile = await this.fileRepository.create(entity);
    await this.fileRepository.save(newFile);
    return newFile;
  }
  async findAll(): Promise<Array<File>> {
    return await this.fileRepository.find();
  }
}
