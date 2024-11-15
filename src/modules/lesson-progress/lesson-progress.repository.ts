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
    blockId: ID,
    userId: ID,
  ): Promise<Array<LessonProgress | null>> {
    return this.lessonProgressRepository.find({
      where: {
        blockId: blockId,
        userId: userId,
      },
      relations: ["lesson"], // "lesson"ni to'liq olish uchun relations qo'shish
      select: ["lesson"], // Agar faqat lessonni tanlamoqchi bo'lsangiz
    });
  }

  /**
   * Foydalanuvchi va block tartibiga ko'ra oxirgi ko'rilgan Lessonk tartibini topish.
   * @param userId - Foydalanuvchi ID
   * @param blockOrder - Block tartibi
   * @returns Oxirgi ko'rilgan Lessonk tartibi yoki null
   */
  async findLastWatchedLessonOrderByUserIdAndBlockOrder(
    userId: ID,
    blockOrder: ID,
  ): Promise<number | null> {
    const lastWatchedProgress = await this.lessonProgressRepository.findOne({
      where: {
        userId: userId,
        isWatched: true,
        blockOrder: LessThanOrEqual(blockOrder),
      },
      order: {
        lessonOrder: "DESC",
      },
      relations: ["lesson"],
      select: ["lesson"],
    });

    return lastWatchedProgress ? lastWatchedProgress.lesson.order : null;
  }

  // blockOrder va userId bo'yicha eng katta lessonOrder qiymatini topish
  async findHighestLessonOrderByUserAndBlock(
    blockOrder: ID,
    userId: ID,
  ): Promise<number | null> {
    const result = await this.lessonProgressRepository
      .createQueryBuilder("lessonProgress")
      .select("lessonProgress.lessonOrder", "lessonOrder")
      .where("lessonProgress.blockOrder = :blockOrder", { blockOrder })
      .andWhere("lessonProgress.userId = :userId", { userId })
      .orderBy("lessonProgress.lessonOrder", "DESC")
      .getRawOne();

    return result ? result.lessonOrder : null;
  }

  async isAllLessonWatched(
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

    if (lessonProgresses.length < 5) {
      return false;
    }

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

  async existsLessonProgress(
    lessonOrder: ID,
    userId: ID,
    blockOrder: ID,
  ): Promise<boolean> {
    // lessonOrder, userId, va blockOrder bo'yicha lesson progress yozuvini qidiramiz
    const lessonProgress = await this.lessonProgressRepository.findOne({
      where: { lessonOrder, userId, blockOrder },
    });

    // Ma'lumot mavjud bo'lsa true, bo'lmasa false qaytaradi
    return !!lessonProgress;
  }

  /**
   * Berilgan `lessonOrder`, `userId` va `blockOrder` bo'yicha `LessonkProgress` yozuvini topib,
   * uning `isWatched` maydonini `true` ga o'zgartiradi va `countWatched` ni oshiradi.
   *
   * @param lessonOrder - Lessonkning tartib raqami
   * @param userId - Foydalanuvchi ID si
   * @param blockOrder - Blokning tartib raqami
   * @returns Yangilangan `LessonkProgress` yozuvi
   * @throws Error Agar `LessonkProgress` topilmasa
   */
  async markLessonAsWatched(
    lessonOrder: ID,
    userId: ID,
    blockOrder: ID,
  ): Promise<LessonProgress> {
    // lessonOrder, userId, va blockOrder bo'yicha lesson progress yozuvini topamiz
    const lessonProgress = await this.lessonProgressRepository.findOne({
      where: { lessonOrder, userId, blockOrder },
      relations: ["user", "lesson"], // agar user va lesson bog'lanishini olishni xohlasangiz
    });

    if (lessonProgress) {
      // Agar topilgan bo'lsa, faqat isWatched ni true qilamiz
      lessonProgress.isWatched = true;

      // O'zgartirilgan lessonProgressni saqlaymiz va qaytaramiz
      return await this.lessonProgressRepository.save(lessonProgress);
    } else {
      // Agar topilmasa, xato tashlaymiz
      throw new Error("LessonkProgress not found");
    }
  }

  /**
   * Foydalanuvchining barcha ko'rilgan (isWatched = true) dars progresslarini topish.
   *
   * @param userId - Foydalanuvchi ID
   * @returns isWatched = true bo'lgan barcha LessonProgress yozuvlari
   */
  async findAllWatchedLessonsByUser(userId: ID): Promise<LessonProgress[]> {
    return await this.lessonProgressRepository.find({
      where: {
        user: { id: userId },
        isWatched: true,
      },
    });
  }
}
