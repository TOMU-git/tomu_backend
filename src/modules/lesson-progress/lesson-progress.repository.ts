import { Injectable } from "@nestjs/common";
import { ID } from "src/common/types/type";
import { InjectRepository } from "@nestjs/typeorm";
import { In, LessThanOrEqual, Repository } from "typeorm";
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

  async findByOrderAndUserId(
    order: ID,
    userId: ID,
  ): Promise<Array<LessonProgress | null>> {
    return this.lessonProgressRepository.find({
      where: {
        blockOrder: order,
        userId: userId, // user_ID o'rniga userId ishlatamiz
      },
      select: ["lesson"],
    });
  }
  // blockOrder va userId bo'yicha eng katta lessonOrder qiymatini topish
  async findHighestLessonOrderByUserAndBlock(
    blockOrder: ID,
    userId: ID,
  ): Promise<number | null> {
    const result = await this.lessonProgressRepository.createQueryBuilder("lessonProgress")
      .select("lessonProgress.lessonOrder", "lessonOrder")
      .where("lessonProgress.blockOrder = :blockOrder", { blockOrder })
      .andWhere("lessonProgress.userId = :userId", { userId })
      .orderBy("lessonProgress.lessonOrder", "DESC")
      .getRawOne();

    return result ? result.lessonOrder : null;
  }

  async findIfAllWatched(
    blockOrder: ID,
    lessonOrder: ID,
    userId: ID,
  ): Promise<boolean> {
    const lessonProgresses = await this.lessonProgressRepository.find({
      where: {
        blockOrder: blockOrder,
        lessonOrder: LessThanOrEqual(lessonOrder),
        user: { id: userId },
      },
      select: ["isWatched"],
    });

    // Agar barcha isWatched qiymatlari true bo'lsa, har doim true qaytaradi.
    return lessonProgresses.every((progress) => progress.isWatched);
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
