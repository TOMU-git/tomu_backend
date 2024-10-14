import { existsSync, unlink } from 'fs';
import { Inject, Injectable } from '@nestjs/common';
import { CreateFileDto } from './dto/create-file.dto';
import { File } from './entities/file.entity';
import { ResData } from 'src/lib/resData';
import { IFileRepository } from './interfaces/file.repository';
import { FileNotFoundException } from './exception/file.exception';

@Injectable()
export class FileService {
  constructor(
    @Inject('IFileRepository') private readonly fileRepository: IFileRepository,
  ) {}
  async create(createFileDto: CreateFileDto) {
    let newCategory = new File();
    newCategory = Object.assign(newCategory, createFileDto);
    const newData = await this.fileRepository.create(newCategory);

    return new ResData<File>(
      'File was created successfully',
      201,
      newData,
    );
  }

  async multipleCreate(dto1: File, dto2: File) {
    console.log(dto1, dto2);
    const newCategory = new File();
    const newCategory1 = Object.assign(newCategory, dto1);
    const newCategory2 = Object.assign(newCategory, dto2);
    const newData = await this.fileRepository.multipleCreate(
      newCategory1,
      newCategory2,
    );

    return new ResData<Array<File>>(
      'File was created successfully',
      201,
      newData,
    );
  }

  async findAll() {
    const data = await this.fileRepository.findAll();

    return new ResData<Array<File>>('ok', 200, data);
  }

  async findOneById(id: number) {
    const foundData = await this.fileRepository.findOneById(id);
    if (!foundData) {
      throw new FileNotFoundException();
    }
    return new ResData<File>('ok', 200, foundData);
  }

  async remove(id: number) {
    const { data: foundData } = await this.findOneById(id);
    const data = await this.fileRepository.delete(foundData);
    const deleteFile = data.path;
    if (existsSync(deleteFile)) {
      unlink(deleteFile, (err) => {
        if (err) {
          console.log(err);
        }
        console.log('deleted');
      });
    }
    return new ResData('success', 200, data);
  }
}
