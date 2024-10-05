import { Inject, Injectable } from '@nestjs/common';
import { IHomeworkRepository } from './interfaces/homework.repository';
import { ResData } from 'src/lib/resData';
import { ID } from 'src/common/types/type';
import { IHomeworkService } from './interfaces/homework.service';
import {
  HomeworkAlreadyExistException,
  HomeworkNotFoundException,
} from './exception/homework.exception';
import { CreateHomeworkDto } from './dto/create-homework.dto';
import { Homework } from './entities/homework.entity';
import { UpdateHomeworkDto } from './dto/update-homework.dto';

@Injectable()
export class HomeworkService implements IHomeworkService {
  constructor(
    @Inject('IHomeworkRepository')
    private readonly homeworkRepository: IHomeworkRepository,
  ) {}

  async create(
    createHomeworkDto: CreateHomeworkDto,
  ): Promise<ResData<Homework>> {
    const foundData = await this.homeworkRepository.findOneByName(
      createHomeworkDto.assignment_video_url,
    );
    if (foundData) {
      throw new HomeworkAlreadyExistException();
    }
    let newHomework = new Homework();
    newHomework = Object.assign(newHomework, createHomeworkDto);
    const newData = await this.homeworkRepository.create(newHomework);

    return new ResData<Homework>('Homework created successfully', 201, newData);
  }

  async findAll(): Promise<ResData<Array<Homework>>> {
    const data = await this.homeworkRepository.findAll();

    return new ResData<Array<Homework>>('ok', 200, data);
  }

  async findOneById(id: ID): Promise<ResData<Homework>> {
    const foundData = await this.homeworkRepository.findById(id);
    if (!foundData) {
      throw new HomeworkNotFoundException();
    }

    return new ResData<Homework>('ok', 200, foundData);
  }

  async update(
    id: ID,
    updateHomeworkDto: UpdateHomeworkDto,
  ): Promise<ResData<Homework>> {
    const { data: foundData } = await this.findOneById(id);
    const updatedData = Object.assign(foundData, updateHomeworkDto);
    const data = await this.homeworkRepository.update(updatedData);

    return new ResData<Homework>('Homework updated successfully', 200, data);
  }

  async delete(id: ID): Promise<ResData<Homework>> {
    const { data: foundData } = await this.findOneById(id);
    const data = await this.homeworkRepository.delete(foundData);

    return new ResData<Homework>('Homework deleted successfully', 200, data);
  }
}
