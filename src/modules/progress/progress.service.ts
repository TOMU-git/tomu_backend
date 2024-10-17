import { Inject, Injectable } from '@nestjs/common';
import { CreateProgressDto } from './dto/create-progress.dto';
import { UpdateProgressDto } from './dto/update-progress.dto';
import { Progress } from './entities/progress.entity';
import { ResData } from 'src/lib/resData';
import { ID } from 'src/common/types/type';
import { IProgressService } from './interfaces/progress.service';
import { IProgressRepository } from './interfaces/progress.repository';
import {
  ProgressAlreadyExistException,
  ProgressNotFoundException,
} from './exception/progress.exception';

@Injectable()
export class ProgressService implements IProgressService {
  constructor(
    @Inject('IProgressRepository')
    private readonly progressRepository: IProgressRepository,
  ) {}

  async create(
    createProgressDto: CreateProgressDto,
  ): Promise<ResData<Progress>> {
    // Qo'shilayotgan progressni tekshirish
    const foundData = await this.progressRepository.findByUserAndLesson(
      createProgressDto.userId,
      createProgressDto.lessonId,
    );
    if (foundData) {
      throw new ProgressAlreadyExistException();
    }

    const newProgress = new Progress();
    Object.assign(newProgress, createProgressDto);
    const newData = await this.progressRepository.create(newProgress);

    return new ResData<Progress>('Progress created successfully', 201, newData);
  }

  async findAll(): Promise<ResData<Array<Progress>>> {
    const data = await this.progressRepository.findAll();
    if (data.length === 0) {
      return new ResData<Progress[]>('No progress found', 200, data);
    }
    return new ResData<Array<Progress>>('ok', 200, data);
  }

  async findOneById(id: ID): Promise<ResData<Progress>> {
    const foundData = await this.progressRepository.findById(id);
    if (!foundData) {
      throw new ProgressNotFoundException();
    }
    return new ResData<Progress>('ok', 200, foundData);
  }

  async update(
    id: ID,
    updateProgressDto: UpdateProgressDto,
  ): Promise<ResData<Progress>> {
    const { data: foundData } = await this.findOneById(id);
    const updatedData = Object.assign(foundData, updateProgressDto);
    const data = await this.progressRepository.update(updatedData);

    return new ResData<Progress>('Progress updated successfully', 200, data);
  }

  async delete(id: ID): Promise<ResData<Progress>> {
    const { data: foundData } = await this.findOneById(id);
    const data = await this.progressRepository.delete(foundData);

    return new ResData<Progress>('Progress deleted successfully', 200, data);
  }

  async findByUserAndLesson(
    userId: ID,
    lessonId: ID,
  ): Promise<ResData<Progress>> {
    const foundData = await this.progressRepository.findByUserAndLesson(
      userId,
      lessonId,
    );
    if (!foundData) {
      throw new ProgressNotFoundException();
    }
    return new ResData<Progress>('ok', 200, foundData);
  }

  async findByUserAndHomework(
    userId: ID,
    homeworkId: ID,
  ): Promise<ResData<Progress>> {
    const foundData = await this.progressRepository.findByUserAndHomework(
      userId,
      homeworkId,
    );
    if (!foundData) {
      throw new ProgressNotFoundException();
    }
    return new ResData<Progress>('ok', 200, foundData);
  }
}
