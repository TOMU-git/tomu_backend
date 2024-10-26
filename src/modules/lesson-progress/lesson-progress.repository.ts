import { Injectable } from "@nestjs/common";
import { ID } from "src/common/types/type";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { LessonProgress } from "./entities/lesson-progress.entity";
import { ILessonProgressRepository } from "./interfaces/lesson-progress.repository";

@Injectable()
export class LessonProgressRepository implements ILessonProgressRepository {
  constructor(
    @InjectRepository(LessonProgress)
    private lessonProgressRepository: Repository<LessonProgress>,
  ) {}

  async create(dto: LessonProgress): Promise<LessonProgress> {
    const newLessonProgress = await this.lessonProgressRepository.create(dto);
    await this.lessonProgressRepository.save(newLessonProgress);
    return newLessonProgress;
  }

  async findOneByUserAndLesson(
    userId: ID,
    lessonId: ID,
  ): Promise<LessonProgress | null> {
    return this.lessonProgressRepository.findOne({
      where: {
        user: { id: userId },
        lesson: { id: lessonId },
      },
      relations: ["user", "lesson"],
    });
  }

  async findAll(): Promise<Array<LessonProgress>> {
    return await this.lessonProgressRepository.find();
  }

  async update(entity: LessonProgress): Promise<LessonProgress> {
    return await this.lessonProgressRepository.save(entity);
  }

  async delete(entity: LessonProgress): Promise<LessonProgress> {
    return await this.lessonProgressRepository.remove(entity);
  }

  async findById(id: ID): Promise<LessonProgress | null> {
    return await this.lessonProgressRepository.findOneBy({ id });
  }
}
