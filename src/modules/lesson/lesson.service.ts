import { Inject, Injectable } from '@nestjs/common';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { Lesson } from './entities/lesson.entity';
import { ILessonRepository } from './interfaces/lesson.repository';
import { ResData } from 'src/lib/resData';
import { ID } from 'src/common/types/type';
import { ILessonService } from './interfaces/lesson.service';
import {
  LessonAlreadyExistException,
  LessonNotFoundException,
} from './exception/lesson.exception';

@Injectable()
export class LessonService implements ILessonService {
  constructor(
    @Inject('ILessonRepository')
    private readonly lessonRepository: ILessonRepository,
  ) {}

  async create(dto: CreateLessonDto): Promise<ResData<Lesson>> {
    const foundData = await this.lessonRepository.findOneByName(dto.title);
    if (foundData) {
      throw new LessonAlreadyExistException();
    }

    let newLesson = new Lesson();
    newLesson = Object.assign(newLesson, dto);
    const newData = await this.lessonRepository.create(newLesson);

    return new ResData<Lesson>('Lesson created successfully', 201, newData);
  }

  async findAll(): Promise<ResData<Array<Lesson>>> {
    const data = await this.lessonRepository.findAll();
    return new ResData<Array<Lesson>>('ok', 200, data);
  }

  async findOneById(id: ID): Promise<ResData<Lesson>> {
    const foundData = await this.lessonRepository.findById(id);
    if (!foundData) {
      throw new LessonNotFoundException();
    }

    return new ResData<Lesson>('ok', 200, foundData);
  }

  async update(id: ID, dto: UpdateLessonDto): Promise<ResData<Lesson>> {
    const { data: foundData } = await this.findOneById(id);
    const updatedData = Object.assign(foundData, dto);
    const data = await this.lessonRepository.update(updatedData);

    return new ResData<Lesson>('Lesson updated successfully', 200, data);
  }

  async delete(id: ID): Promise<ResData<Lesson>> {
    const { data: foundData } = await this.findOneById(id);
    const data = await this.lessonRepository.delete(foundData);

    return new ResData<Lesson>('Lesson deleted successfully', 200, data);
  }
}
