import { Injectable } from '@nestjs/common';
import { ID } from 'src/common/types/type';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IHomeworkRepository } from './interfaces/homework.repository';
import { Homework } from './entities/homework.entity';

@Injectable()
export class HomeworkRepository implements IHomeworkRepository {
  constructor(
    @InjectRepository(Homework)
    private homeworkRepository: Repository<Homework>,
  ) {}

  async create(dto: Homework): Promise<Homework> {
    const newHomework = await this.homeworkRepository.create(dto);
    await this.homeworkRepository.save(newHomework);
    return newHomework;
  }

  async findAll(): Promise<Array<Homework>> {
    return await this.homeworkRepository.find();
  }

  async update(entity: Homework): Promise<Homework> {
    return await this.homeworkRepository.save(entity);
  }

  async delete(entity: Homework): Promise<Homework> {
    return await this.homeworkRepository.remove(entity);
  }

  async findById(id: ID): Promise<Homework | null> {
    return await this.homeworkRepository.findOneBy({ id });
  }

  async findOneByName(title: string): Promise<Homework | null> {
    return await this.homeworkRepository.findOneBy({ description: title });
  }
}
