import { Injectable } from "@nestjs/common";
import { ID } from "src/common/types/type";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { HomeworkProgress } from "./entities/homework-progress.entity";
import { IHomeworkProgressRepository } from "./interfaces/homework-progress.repository";
@Injectable()
export class HomeworkProgressRepository implements IHomeworkProgressRepository {
  constructor(
    @InjectRepository(HomeworkProgress)
    private homeworkProgressRepository: Repository<HomeworkProgress>,
  ) {}

  // Yangi homework progress yozuvi yaratish uchun metod
  async create(dto: HomeworkProgress): Promise<HomeworkProgress> {
    const newHomeworkProgress =
      await this.homeworkProgressRepository.create(dto);
    await this.homeworkProgressRepository.save(newHomeworkProgress);
    return newHomeworkProgress;
  }

  // Berilgan foydalanuvchi va homework bo'yicha homework progress yozuvini topish uchun metod
  async findByUserId(userId: ID): Promise<Array<HomeworkProgress>> {
    return this.homeworkProgressRepository.find({
      where: {
        user: { id: userId }, // user jadvalidagi id bilan solishtiriladi
      },
      relations: ["user", "homework"],
    });
  }

  // Barcha homework progress yozuvlarini olish uchun metod
  async findAll(): Promise<HomeworkProgress[]> {
    return await this.homeworkProgressRepository
      .createQueryBuilder("homeworkProgress")
      .leftJoin("homeworkProgress.user", "user") // user jadvalini qo'shish
      .leftJoin("homeworkProgress.homework", "homework") // homework jadvalini qo'shish
      .addSelect(["user.id"]) // Faqat userning `id` maydonini tanlash
      .addSelect(["homework.id"]) // Faqat homeworkning `id` maydonini tanlash
      .getMany();
  }

  // Homework progress yozuvini yangilash uchun metod
  async update(entity: HomeworkProgress): Promise<HomeworkProgress> {
    return await this.homeworkProgressRepository.save(entity);
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
      relations: ["user", "homework"],
    });
  }

  async findByOrderAndUserId(
    order: ID,
    userId: ID,
  ): Promise<Array<HomeworkProgress | null>> {
    return this.homeworkProgressRepository.find({
      where: {
        blockOrder: order,
        userId: userId, // user_ID o'rniga userId ishlatamiz
      },
      relations: ["homework"], // "lesson"ni to'liq olish uchun relations qo'shish
      select: ["homework"], // Agar faqat lessonni tanlamoqchi bo'lsangiz
    });
  }

  async findHighestLessonOrderByUserAndBlock(
    blockOrder: ID,
    userId: ID,
  ): Promise<number | null> {
    const result = await this.homeworkProgressRepository
      .createQueryBuilder("homeworkProgress")
      .select("homeworkProgress.lessonOrder", "lessonOrder")
      .where("homeworkProgress.blockOrder = :blockOrder", { blockOrder })
      .andWhere("homeworkProgress.userId = :userId", { userId })
      .orderBy("homeworkProgress.lessonOrder", "DESC")
      .getRawOne();

    return result ? result.lessonOrder : null;
  }

  // Berilgan homework progress yozuvini o'chirish uchun metod
  async delete(entity: HomeworkProgress): Promise<HomeworkProgress> {
    return await this.homeworkProgressRepository.remove(entity);
  }

  // Berilgan ID bo'yicha homework progress yozuvini topish uchun metod
  async findById(id: ID): Promise<HomeworkProgress | null> {
    return await this.homeworkProgressRepository.findOneBy({ id });
  }

  // Videolarni olish uchun metod (countWatched 0 dan 5 gacha bo'lganlarini)
  async getVideosWithWatchCountBetween0And5(
    order: ID,
    blockOrder: ID,
  ): Promise<Array<HomeworkProgress>> {
    return await this.homeworkProgressRepository
      .createQueryBuilder("homeworkProgress")
      .leftJoinAndSelect("homeworkProgress.homework", "homework")
      .where("homework.order < :order", { order })
      .andWhere("homeworkProgress.countWatched > :minCount", { minCount: 0 })
      .andWhere("homeworkProgress.countWatched < :maxCount", { maxCount: 5 })
      .andWhere("homeworkProgress.blockOrder = :blockOrder", { blockOrder }) // blockOrder orqali filtrlash
      .select(["homeworkProgress", "homework"])
      .getMany();
  }

  // Berilgan ordergacha tomosha qilingan homework progress yozuvlarini olish uchun metod
  async getWatchedHomeworkProgressUpToOrder(
    order: number,
  ): Promise<HomeworkProgress[]> {
    return await this.homeworkProgressRepository
      .createQueryBuilder("homeworkProgress")
      .leftJoinAndSelect("homeworkProgress.homework", "homework") // homework jadvalini qo'shish
      .where("homework.order <= :order", { order }) // homework.order qiymati kiritilgan qiymatdan kichik yoki teng bo'lsa filtrlanadi
      .andWhere("homeworkProgress.isWatched = :isWatched", { isWatched: true }) // isWatched qiymati true bo'lgan yozuvlarni filtrlaydi
      .getMany(); // barcha mos yozuvlarni qaytaradi
  }
}
