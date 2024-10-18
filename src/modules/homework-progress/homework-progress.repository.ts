import { Injectable } from '@nestjs/common';
import { ID } from 'src/common/types/type';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HomeworkProgress } from './entities/homework-progress.entity';
import { IHomeworkProgressRepository } from './interfaces/homework-progress.repository';

@Injectable()
export class HomeworkProgressRepository implements IHomeworkProgressRepository {
  constructor(
    @InjectRepository(HomeworkProgress)
    private homeworkProgressRepository: Repository<HomeworkProgress>,
  ) {}

  async create(dto: HomeworkProgress): Promise<HomeworkProgress> {
    const newHomeworkProgress = await this.homeworkProgressRepository.create(dto);
    await this.homeworkProgressRepository.save(newHomeworkProgress);
    return newHomeworkProgress;
  }

  async findOneByUserAndHomework(
    userId: ID,
    homeworkId: ID,
  ): Promise<HomeworkProgress | null> {
    return this.homeworkProgressRepository.findOne({
      where: {
        user: { id: userId },
        homework: { id: homeworkId },
      },
      relations: ['user', 'homework'],
    });
  }

  async findAll(): Promise<Array<HomeworkProgress>> {
    return await this.homeworkProgressRepository.find();
  }

  async update(entity: HomeworkProgress): Promise<HomeworkProgress> {
    return await this.homeworkProgressRepository.save(entity);
  }

  async delete(entity: HomeworkProgress): Promise<HomeworkProgress> {
    return await this.homeworkProgressRepository.remove(entity);
  }

  async findById(id: ID): Promise<HomeworkProgress | null> {
    return await this.homeworkProgressRepository.findOneBy({ id });
  }
}
