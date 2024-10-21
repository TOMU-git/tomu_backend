import { Injectable } from '@nestjs/common';
import { ID } from 'src/common/types/type';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ILessonRepository } from './interfaces/lesson.repository';
import { Lesson } from './entities/lesson.entity';

@Injectable()
export class LessonRepository implements ILessonRepository {
  constructor(
    @InjectRepository(Lesson)
    private lessonRepository: Repository<Lesson>,
  ) {}

  async create(dto: Lesson): Promise<Lesson> {
    const newLesson = await this.lessonRepository.create(dto);
    await this.lessonRepository.save(newLesson);
    return newLesson;
  }

  async findAll(): Promise<Array<Lesson>> {
    return await this.lessonRepository.find({
      order: { order: 'ASC' }, // Bu yerda 'ASC' oshib boruvchi tartibni bildiradi
    });
  }

  async findByIds(ids: number[]): Promise<Lesson[]> {
    return this.lessonRepository.findBy({ id: In(ids) }); // TypeORM uchun `In` metodidan foydalaning
  }

  async findLessonsByBlockId(blockId: ID): Promise<Lesson[]> {
    return await this.lessonRepository.find({
      where: {
        block: { id: blockId }, // Block orqali qidirish
      },
    });
  }
  async update(entity: Lesson): Promise<Lesson> {
    return await this.lessonRepository.save(entity);
  }

  async delete(entity: Lesson): Promise<Lesson> {
    return await this.lessonRepository.remove(entity);
  }

  async findById(id: ID): Promise<Lesson | null> {
    return await this.lessonRepository.findOneBy({ id });
  }

  async findOneByName(title: string): Promise<Lesson | null> {
    return await this.lessonRepository.findOneBy({ title });
  }

  async findOneByOrder(order: ID): Promise<Lesson | null> {
    return await this.lessonRepository.findOneBy({ order });
  }
}
