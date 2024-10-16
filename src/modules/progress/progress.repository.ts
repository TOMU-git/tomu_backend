import { Injectable } from '@nestjs/common';
import { ID } from 'src/common/types/type';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Progress } from './entities/progress.entity';
import { IProgressRepository } from './interfaces/progress.repository';

@Injectable()
export class ProgressRepository implements IProgressRepository {
  constructor(
    @InjectRepository(Progress)
    private progressRepository: Repository<Progress>,
  ) {}

  // Yangi progress yozuvini yaratish
  async create(dto: Progress): Promise<Progress> {
    const newProgress = await this.progressRepository.create(dto);
    await this.progressRepository.save(newProgress);
    return newProgress;
  }

  // Barcha progress yozuvlarini olish
  async findAll(): Promise<Array<Progress>> {
    return await this.progressRepository.find();
  }

  // Progress yozuvini yangilash
  async update(entity: Progress): Promise<Progress> {
    return await this.progressRepository.save(entity);
  }

  // Progress yozuvini o'chirish
  async delete(entity: Progress): Promise<Progress> {
    return await this.progressRepository.remove(entity);
  }

  // Progress yozuvini ID orqali topish
  async findById(id: ID): Promise<Progress | null> {
    return await this.progressRepository.findOneBy({ id });
  }

  // Foydalanuvchi, lesson va homework asosida progressni topish
  async findByUserAndLesson(
    userId: ID,
    lessonId: ID,
  ): Promise<Progress | null> {
    return await this.progressRepository.findOne({
      where: {
        user: { id: userId },
        lesson: { id: lessonId },
      },
    });
  }

  async findByUserAndHomework(
    userId: ID,
    homeworkId: ID,
  ): Promise<Progress | null> {
    return await this.progressRepository.findOne({
      where: {
        user: { id: userId },
        homework: { id: homeworkId },
      },
    });
  }
}
