import { Injectable } from "@nestjs/common";
import { ID } from "src/common/types/type";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, LessThanOrEqual, Between } from "typeorm";
import { HomeworkProgress } from "./entities/homework-progress.entity";
import { IHomeworkProgressRepository } from "./interfaces/homework-progress.repository";

@Injectable()
export class HomeworkProgressRepository implements IHomeworkProgressRepository {
  constructor(
    @InjectRepository(HomeworkProgress)
    private homeworkProgressRepository: Repository<HomeworkProgress>,
  ) {}

  /**
   * Yangi HomeworkProgress yozuvini yaratadi.
   * @param dto - HomeworkProgress uchun ma'lumotlar
   * @returns Yangi yaratilgan HomeworkProgress yozuvi
   */
  async create(dto: HomeworkProgress): Promise<HomeworkProgress> {
    const newHomeworkProgress =
      await this.homeworkProgressRepository.create(dto);
    await this.homeworkProgressRepository.save(newHomeworkProgress);
    return newHomeworkProgress;
  }

  /**
   * Berilgan foydalanuvchi va homework bo'yicha HomeworkProgress yozuvlarini topadi.
   * @param userId - Foydalanuvchi ID
   * @returns Foydalanuvchi bilan bog'liq HomeworkProgress yozuvlari ro'yxati
   */
  async findByUserId(userId: ID): Promise<Array<HomeworkProgress>> {
    return this.homeworkProgressRepository.find({
      where: {
        user: { id: userId },
      },
      relations: ["user", "homework"],
    });
  }

  /**
   * Hamma HomeworkProgress yozuvlarini olish uchun metod.
   * @returns Hamma HomeworkProgress yozuvlarining ro'yxati
   */
  async findAll(): Promise<HomeworkProgress[]> {
    return await this.homeworkProgressRepository
      .createQueryBuilder("homeworkProgress")
      .leftJoin("homeworkProgress.user", "user")
      .leftJoin("homeworkProgress.homework", "homework")
      .addSelect(["user.id", "homework.id"])
      .getMany();
  }

  /**
   * HomeworkProgress yozuvini yangilash.
   * @param entity - Yangilanadigan HomeworkProgress yozuvi
   * @returns Yangilangan HomeworkProgress yozuvi
   */
  async update(entity: HomeworkProgress): Promise<HomeworkProgress> {
    return await this.homeworkProgressRepository.save(entity);
  }

  /**
   * Berilgan foydalanuvchi va homework ID orqali HomeworkProgress yozuvini topadi.
   * @param userId - Foydalanuvchi ID
   * @param homeworkId - Homework ID
   * @returns Topilgan HomeworkProgress yozuvi yoki null
   */
  async findOneByUserAndHomework(
    userId: ID,
    homeworkId: ID,
  ): Promise<HomeworkProgress | null> {
    return this.homeworkProgressRepository.findOne({
      where: {
        userId: userId, // user id si bilan solishtirish
        homeworkOrder: homeworkId, // homework order bilan solishtirish
      },
      relations: ["homework"], // faqat homeworkni yuklash
    });
  }

  /**
   * Homework progresslarni block tartibi va foydalanuvchi ID orqali topish.
   * @param order - Homework tartibi
   * @param userId - Foydalanuvchi ID
   * @returns Topilgan HomeworkProgress yozuvlarining ro'yxati yoki null
   */
  async findByBlockOrderAndUserId(
    blockId: ID,
    userId: ID,
  ): Promise<Array<HomeworkProgress>> {
    return await this.homeworkProgressRepository.find({
      where: {
        blockId: blockId,
        userId: userId,
      },
      relations: ["homework"], // 'homework' bilan bog'liqliklar olinadi
      order: {
        homeworkOrder: "ASC", // homeworkOrder bo'yicha o'sish tartibida saralash
      },
    });
  }

  async findTopFiveByBlockOrderAndUserId(
    blockOrder: ID,
    userId: ID,
  ): Promise<Array<HomeworkProgress>> {
    return await this.homeworkProgressRepository.find({
      where: {
        blockOrder: blockOrder,
        userId: userId,
      },
      relations: ["homework"], // 'homework' bilan bog'lanishlar olinadi
      order: {
        homeworkOrder: "DESC", // homeworkOrder bo'yicha kamayish tartibida saralash
      },
      take: 5, // faqat eng katta 5 ta yozuvni olish
    });
  }

  /**
   * Foydalanuvchi va block tartibi bo'yicha eng yuqori Homework tartibini topish.
   * @param blockOrder - Block tartibi
   * @param userId - Foydalanuvchi ID
   * @returns Eng yuqori Homework tartibi yoki null
   */
  async findHighestHomeworkOrderByUserAndBlock(
    blockOrder: ID,
    userId: ID,
  ): Promise<number | null> {
    const result = await this.homeworkProgressRepository
      .createQueryBuilder("homeworkProgress")
      .select("homeworkProgress.homeworkOrder", "homeworkOrder")
      .where("homeworkProgress.blockOrder = :blockOrder", { blockOrder })
      .andWhere("homeworkProgress.userId = :userId", { userId })
      .orderBy("homeworkProgress.homeworkOrder", "DESC")
      .getRawOne();

    return result ? result.homeworkOrder : null;
  }

  /**
   * HomeworkProgress yozuvini o'chirish.
   * @param entity - O'chiriladigan HomeworkProgress yozuvi
   * @returns O'chirilgan HomeworkProgress yozuvi
   */
  async delete(entity: HomeworkProgress): Promise<HomeworkProgress> {
    return await this.homeworkProgressRepository.remove(entity);
  }

  /**
   * ID orqali HomeworkProgress yozuvini topish.
   * @param id - HomeworkProgress ID
   * @returns Topilgan HomeworkProgress yozuvi yoki null
   */
  async findById(id: ID): Promise<HomeworkProgress | null> {
    return await this.homeworkProgressRepository.findOneBy({ id });
  }

  /**
   * Berilgan `homeworkOrder`, `userId` va `blockOrder` bo'yicha `HomeworkProgress` yozuvini topib,
   * uning `isWatched` maydonini `true` ga o'zgartiradi va `countWatched` ni oshiradi.
   *
   * @param homeworkOrder - Homeworkning tartib raqami
   * @param userId - Foydalanuvchi ID si
   * @param blockOrder - Blokning tartib raqami
   * @returns Yangilangan `HomeworkProgress` yozuvi
   * @throws Error Agar `HomeworkProgress` topilmasa
   */
  async markHomeworkAsWatched(
    homeworkOrder: ID,
    userId: ID,
    blockOrder: ID,
  ): Promise<HomeworkProgress> {
    // homeworkOrder, userId, va blockOrder bo'yicha homework progress yozuvini topamiz
    const homeworkProgress = await this.homeworkProgressRepository.findOne({
      where: { homeworkOrder, userId, blockOrder },
      relations: ["user", "homework"], // agar user va homework bog'lanishini olishni xohlasangiz
    });

    if (homeworkProgress) {
      // Agar topilgan bo'lsa, faqat isWatched ni true qilamiz
      homeworkProgress.isWatched = true;

      // O'zgartirilgan homeworkProgressni saqlaymiz va qaytaramiz
      return await this.homeworkProgressRepository.save(homeworkProgress);
    } else {
      // Agar topilmasa, xato tashlaymiz
      throw new Error("HomeworkProgress not found");
    }
  }

  /**
   * Foydalanuvchi va block tartibiga ko'ra oxirgi ko'rilgan Homework tartibini topish.
   * @param userId - Foydalanuvchi ID
   * @param blockOrder - Block tartibi
   * @returns Oxirgi ko'rilgan Homework tartibi yoki null
   */
  async findLastWatchedHomeworkOrderByUserIdAndBlockOrder(
    userId: ID,
    blockOrder: ID,
  ): Promise<number | null> {
    const lastWatchedProgress = await this.homeworkProgressRepository.findOne({
      where: {
        userId: userId,
        isWatched: true,
        blockOrder: LessThanOrEqual(blockOrder),
      },
      order: {
        homeworkOrder: "DESC",
      },
      relations: ["homework"],
      select: ["homework"],
    });

    return lastWatchedProgress ? lastWatchedProgress.homework.order : null;
  }

  /**
   * Berilgan tartib va foydalanuvchi ID bo'yicha barcha HomeworkProgress yozuvlari kuzatilganligini tekshirish.
   * @param order - Homework tartibi
   * @param userId - Foydalanuvchi ID
   * @returns Hamma yozuvlar kuzatilgan bo'lsa, true qaytaradi
   */
  async areAllWatchedByOrderAndUserId(
    blockOrder: ID,
    userId: ID,
  ): Promise<boolean> {
    const homeworkProgresses = await this.homeworkProgressRepository.find({
      where: {
        blockOrder: blockOrder,
        userId: userId,
      },
      select: ["isWatched"],
    });

    if (homeworkProgresses.length < 5) {
      return false;
    }
    return homeworkProgresses.every((progress) => progress.isWatched === true);
  }

  /**
   * Kuzatish soni 0 dan 5 gacha bo'lgan videolarni olish.
   * @param blockOrder - Block tartibi
   * @returns Kuzatish soni 0 va 5 oralig'ida bo'lgan HomeworkProgress yozuvlarining ro'yxati
   */
  async getVideosWithWatchCountBetween0And5(
    blockOrder: ID,
  ): Promise<Array<HomeworkProgress>> {
    return await this.homeworkProgressRepository.find({
      where: {
        blockOrder: blockOrder,
        isWatched: true,
        countWatched: Between(0, 5), // countWatched 0 va 5 orasida bo'lishi kerak
      },
      relations: ["homework"], // 'homework' bilan bog'liqliklar olinadi
      order: {
        homeworkOrder: "ASC", // homeworkOrder bo'yicha o'sish tartibida saralash
      },
    });
  }
  
  async getHomeworkProgress(
    homeworkOrder: ID,
    userId: ID,
    blockOrder: ID,
  ): Promise<HomeworkProgress | null> {
    // homeworkOrder, userId va blockOrder bo'yicha homework progress yozuvini qidiramiz
    const homeworkProgress = await this.homeworkProgressRepository.findOne({
      where: { homeworkOrder, userId, blockOrder },
    });

    // homeworkProgress mavjud bo'lsa, uni qaytaradi, bo'lmasa null qaytaradi
    return homeworkProgress || null;
  }

  /**
   * Foydalanuvchining barcha ko'rilgan (isWatched = true) homework progresslarini topish.
   *
   * @param userId - Foydalanuvchi ID
   * @returns isWatched = true bo'lgan barcha HomeworkProgress yozuvlari
   */
  async findAllWatchedHomeworkByUser(userId: ID): Promise<HomeworkProgress[]> {
    return await this.homeworkProgressRepository.find({
      where: {
        user: { id: userId },
        isWatched: true,
      }
    });
  }
}
