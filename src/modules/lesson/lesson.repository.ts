import { Injectable } from '@nestjs/common';
import { ID } from 'src/common/types/type';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ILessonRepository } from './interfaces/lesson.repository';
import { Lesson } from './entities/lesson.entity';

@Injectable()
export class LessonRepository implements ILessonRepository {
  constructor(
    @InjectRepository(Lesson)
    private LessonRepository: Repository<Lesson>,
  ) {}

  async create(dto: Lesson): Promise<Lesson> {
    const newLesson = await this.LessonRepository.create(dto);
    await this.LessonRepository.save(newLesson);
    return newLesson;
  }

  async findAll(): Promise<Array<Lesson>> {
    return await this.LessonRepository.find();
  }

  async update(entity: Lesson): Promise<Lesson> {
    return await this.LessonRepository.save(entity);
  }

  async delete(entity: Lesson): Promise<Lesson> {
    return await this.LessonRepository.remove(entity);
  }

  async findById(id: ID): Promise<Lesson | null> {
    return await this.LessonRepository.findOneBy({ id });
  }

  async findOneByName(title: string): Promise<Lesson | null> {
    return await this.LessonRepository.findOneBy({ title });
  }
}
