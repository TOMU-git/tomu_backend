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
    blockId: ID,
  ): Promise<Array<HomeworkProgress>> {
    return await this.homeworkProgressRepository
      .createQueryBuilder("homeworkProgress")
      .leftJoinAndSelect("homeworkProgress.homework", "homework")
      .leftJoinAndSelect("homework.block", "block")
      .where("homework.order < :order", { order })
      .andWhere("homeworkProgress.countWatched > :minCount", { minCount: 0 })
      .andWhere("homeworkProgress.countWatched < :maxCount", { maxCount: 5 })
      .andWhere("homework.block.id = :blockId", { blockId })
      .select(["homeworkProgress", "homework", "block.id"])
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
