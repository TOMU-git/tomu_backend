import { Injectable, Logger } from "@nestjs/common";
import { ID } from "src/common/types/type";
import { InjectRepository } from "@nestjs/typeorm";
import { In, LessThanOrEqual, Repository, Between } from "typeorm";
import { LessonProgress } from "./entities/lesson-progress.entity";
import { ILessonProgressRepository } from "./interfaces/lesson-progress.repository";

@Injectable()
export class LessonProgressRepository implements ILessonProgressRepository {
  private readonly logger = new Logger(LessonProgressRepository.name);
  constructor(
    @InjectRepository(LessonProgress)
    private lessonProgressRepository: Repository<LessonProgress>,
  ) { }

  async create(dto: LessonProgress): Promise<LessonProgress> {
    const newLessonProgress = await this.lessonProgressRepository.create(dto);
    await this.lessonProgressRepository.save(newLessonProgress);
    return newLessonProgress;
  }

  // berilgan userId va lessonId ga mos lessonProgressni topish
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

  // berilgan userId va blockId ga mos lessonProgressnilarni topish
  // berilgan userId va blockId ga mos lessonProgressnilarni topish
  async findByBlockIdAndUserId(
    blockId: ID,
    userId: ID,
  ): Promise<Array<LessonProgress | null>> {
    return this.lessonProgressRepository.find({
      where: {
        blockId: blockId,
        user: { id: userId }, // Relation uslubida qidirish
      },
      relations: ["lesson"], // "lesson"ni to'liq olish uchun relations qo'shish
      order: {
        lessonOrder: "ASC", // lessonOrder bo'yicha o'sish tartibida saralash
      },
      select: ["lesson"], // Agar faqat lessonni tanlamoqchi bo'lsangiz
    });
  }

  /**
   * Foydalanuvchi va block tartibiga ko'ra oxirgi ko'rilgan Lessonk tartibini topish.
   * @param userId - Foydalanuvchi ID
   * @param blockOrder - Block tartibi
   * @returns Oxirgi ko'rilgan Lessonk tartibi yoki null
   */
  async findLastWatchedLessonOrder(
    userId: ID,
    courseId: ID,
    blockOrder: ID,
  ): Promise<number | null> {
    const result = await this.lessonProgressRepository
      .createQueryBuilder("lessonProgress")
      .leftJoin("lessonProgress.user", "user")
      .select("lessonProgress.lessonOrder", "lessonOrder") // faqat lessonOrder tanlash
      .where("user.id = :userId", { userId })
      .andWhere("lessonProgress.courseId = :courseId", { courseId })
      .andWhere("lessonProgress.blockOrder = :blockOrder", { blockOrder })
      .andWhere("lessonProgress.isWatched = :isWatched", { isWatched: true })
      .orderBy("lessonProgress.lessonOrder", "DESC")
      .getRawOne();

    return result ? result.lessonOrder : null; // agar topilmasa, null qaytarish
  }

  // blockOrder va userId bo'yicha eng katta lessonOrder qiymatini topish
  async findMaxLessonOrder(
    blockOrder: ID,
    userId: ID,
    courseId: ID,
  ): Promise<number | null> {
    const result = await this.lessonProgressRepository
      .createQueryBuilder("lessonProgress")
      .leftJoin("lessonProgress.user", "user")
      .select("lessonProgress.lessonOrder", "lessonOrder")
      .where("lessonProgress.blockOrder = :blockOrder", { blockOrder })
      .andWhere("user.id = :userId", { userId })
      .andWhere("lessonProgress.courseId = :courseId", { courseId })
      .orderBy("lessonProgress.lessonOrder", "DESC")
      .getRawOne();

    return result ? result.lessonOrder : null;
  }

  async isAllLessonWatched(
    blockOrder: ID,
    lessonOrder: ID,
    userId: ID,
    courseId: ID,
  ): Promise<boolean> {
    const lessonProgresses = await this.lessonProgressRepository.find({
      where: {
        blockOrder: blockOrder,
        courseId: courseId,
        lessonOrder: LessThanOrEqual(lessonOrder),
        user: { id: userId },
      },
      select: ["isWatched"],
    });

    if (lessonProgresses.length < 5 || lessonProgresses.length < lessonOrder) {
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
    return await this.lessonProgressRepository.findOne({
      where: { id },
      relations: ['lesson'],
    });
  }

  async getLessonProgress(
    lessonOrder: ID,
    userId: ID,
    blockOrder: ID,
    courseId: ID,
  ): Promise<LessonProgress | null> {
    // lessonOrder, userId, blockOrder va courseId bo'yicha lesson progress yozuvini qidiramiz
    const lessonProgress = await this.lessonProgressRepository.findOne({
      where: {
        lessonOrder,
        user: { id: userId }, // Relation uslubida qidirish
        blockOrder,
        courseId
      },
    });

    // Ma'lumot mavjud bo'lsa, uni qaytaradi, bo'lmasa null qaytaradi
    return lessonProgress || null;
  }

  /**
   * Berilgan `lessonOrder`, `userId` va `blockOrder` bo'yicha `LessonkProgress` yozuvini topib,
   * uning `isUnlocked` maydonini `true` ga o'zgartiradi va `countWatched` ni oshiradi.
   *
   * @param lessonOrder - Lessonkning tartib raqami
   * @param userId - Foydalanuvchi ID si
   * @param blockId - Blokning tartib raqami
   * @returns Yangilangan `LessonkProgress` yozuvi
   * @throws Error Agar `LessonkProgress` topilmasa
   */
  /**
   * Berilgan `currentLessonOrder`, `userId` va `blockId` bo'yicha
   * keyingi darsni unlock qiladi (ya'ni `lessonOrder + 1`).
   *
   * Agar keyingi dars mavjud bo'lmasa (oxirgi dars bo'lsa), hech narsa qilmaydi.
   */
  async unlockNextLesson(
    currentLessonOrder: ID,
    userId: ID,
    blockId: ID,
  ): Promise<LessonProgress | null> {
    // Keyingi darsni topamiz
    const nextLessonProgress = await this.lessonProgressRepository.findOne({
      where: {
        lessonOrder: currentLessonOrder + 1,
        user: { id: userId }, // Relation uslubida qidirish
        blockId
      },
    });

    // Agar keyingi dars mavjud bo'lmasa — oxirgi dars bo'lishi mumkin
    if (!nextLessonProgress) {
      this.logger.warn(
        `Dars zanjiri tugadi: lessonOrder ${currentLessonOrder + 1} uchun progress topilmadi (userId=${userId}, blockId=${blockId})`,
      );
      return null;
    }

    // Keyingi darsni unlock qilamiz
    nextLessonProgress.isUnlocked = true;
    return await this.lessonProgressRepository.save(nextLessonProgress);
  }


  /**
   * Foydalanuvchining barcha ko'rilgan (isWatched = true) dars progresslarini topish.
   *
   * @param userId - Foydalanuvchi ID
   * @returns isWatched = true bo'lgan barcha LessonProgress yozuvlari
   */
  async findAllWatchedLessonsByUser(userId: ID, courseId: ID): Promise<LessonProgress[]> {
    return await this.lessonProgressRepository.find({
      where: {
        user: { id: userId }, // Relation uslubida qidirish
        isWatched: true,
        courseId: courseId,
      },
      relations: ['lesson', 'lesson.block', 'lesson.block.course'],
    });
  }


  async checkAllLessonsWatched(
    blockOrder: ID,
    userId: ID,
    courseId: ID,
  ): Promise<boolean> {
    const lessonProgresses = await this.lessonProgressRepository.find({
      where: {
        blockOrder: blockOrder,
        courseId: courseId,
        user: { id: userId }, // Relation uslubida qidirish
      },
      select: ["isWatched"],
    });

    // Agar barcha isWatched qiymatlari true bo'lsa, har doim true qaytaradi.
    return lessonProgresses.every((progress) => progress.isWatched);
  }

  /**
   * Berilgan vaqt oralig'ida foydalanuvchi tomonidan ko'rilgan darslar sonini hisoblash.
   * 
   * @param userId - Foydalanuvchi ID si
   * @param startDate - Boshlang'ich sana
   * @param endDate - Tugash sanasi
   * @returns Ko'rilgan darslar soni
   */
  async countWatchedLessonsInDateRange(
    userId: ID,
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    // Using TypeORM's find method with automatic mapping
    const count = await this.lessonProgressRepository.count({
      where: {
        user: { id: userId }, // Relation uslubida qidirish
        isWatched: true,
        lastUpdatedAt: Between(startDate, endDate)
      }
    });

    return count;
  }

  async findLastUnlockedAndWatchedLessonOrder(
    userId: ID,
    courseId: ID,
    blockOrder: ID,
  ): Promise<number | null> {
    const result = await this.lessonProgressRepository
      .createQueryBuilder("lessonProgress")
      .leftJoin("lessonProgress.user", "user")
      .select("lessonProgress.lessonOrder", "lessonOrder")
      .where("user.id = :userId", { userId })
      .andWhere("lessonProgress.courseId = :courseId", { courseId })
      .andWhere("lessonProgress.blockOrder = :blockOrder", { blockOrder })
      .andWhere("lessonProgress.isWatched = true")
      .andWhere("lessonProgress.isUnlocked = true")
      .orderBy("lessonProgress.lessonOrder", "DESC")
      .getRawOne(); // faqat lessonOrder ni olamiz

    return result ? result.lessonOrder : null;
  }

  /**
   * Berilgan blokda foydalanuvchi tomonidan tugatilgan darslar sonini hisoblash.
   * 
   * @param userId - Foydalanuvchi ID si
   * @param courseId - Kurs ID si
   * @param blockOrder - Blok tartibi (masalan, 1-bo'lim uchun 1)
   * @returns Tugatilgan darslar soni
   */
  async countCompletedLessonsInBlock(
    userId: ID,
    courseId: ID,
    blockOrder: number,
  ): Promise<number> {
    const count = await this.lessonProgressRepository.count({
      where: {
        user: { id: userId },
        courseId: courseId,
        blockOrder: blockOrder,
        isWatched: true,
      }
    });

    return count;
  }

  /**
   * Berilgan blokdagi barcha darslar foydalanuvchi tomonidan tugatilganligini tekshirish.
   * 
   * @param userId - Foydalanuvchi ID si
   * @param courseId - Kurs ID si
   * @param blockOrder - Blok tartibi (masalan, 1-bo'lim uchun 1)
   * @returns true - agar barcha darslar tugatilgan bo'lsa, false - aks holda
   */
  async isBlockFullyCompleted(
    userId: ID,
    courseId: ID,
    blockOrder: number,
  ): Promise<boolean> {
    // Blokdagi barcha lesson progresslarni olish
    const allLessonProgresses = await this.lessonProgressRepository.find({
      where: {
        user: { id: userId },
        courseId: courseId,
        blockOrder: blockOrder,
      }
    });

    // Agar hech qanday progress bo'lmasa, blok tugatilmagan
    if (!allLessonProgresses || allLessonProgresses.length === 0) {
      return false;
    }

    // Barcha darslar ko'rilganligini tekshirish
    const allWatched = allLessonProgresses.every((progress) => progress.isWatched);

    return allWatched;
  }

}
