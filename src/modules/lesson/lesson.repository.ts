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

  async findVideosTen(id: number): Promise<Lesson[]> {
    return await this.lessonRepository
      .createQueryBuilder('lessons')
      .where({ blockId: id })
      .orderBy('lessons.order', 'ASC')
      .limit(10)
      .getMany();
  }

  async findByIds(ids: number[]): Promise<Lesson[]> {
    return this.lessonRepository.findBy({ id: In(ids) }); // TypeORM uchun `In` metodidan foydalaning
  }

  async findLessonsByBlockId(blockId: ID): Promise<Lesson[]> {
    return await this.lessonRepository.find({
      where: { block: { id: blockId } },
      relations: ['block'], // block bilan bog'liq ma'lumotlarni olish uchun
      order: { order: 'ASC' }, // `order` maydoni bo'yicha tartiblash
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

  async findOneByOrder(order: ID, blockId: ID): Promise<Lesson | null> {
    return await this.lessonRepository.findOne({
      where: {
        order: order,
        block: { id: blockId }, // block maydoni orqali blockId ni qidirish
      },
    });
  }
}
