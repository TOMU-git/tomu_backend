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

  async create(dto: HomeworkProgress): Promise<HomeworkProgress> {
    const newHomeworkProgress =
      await this.homeworkProgressRepository.create(dto);
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
      relations: ["user", "homework"],
    });
  }

  async findAll(): Promise<HomeworkProgress[]> {
    return await this.homeworkProgressRepository
      .createQueryBuilder("homeworkProgress")
      .leftJoin("homeworkProgress.user", "user") // user jadvalini qo'shish
      .leftJoin("homeworkProgress.homework", "homework") // homework jadvalini qo'shish
      .addSelect(["user.id"]) // Faqat userning `id` maydonini tanlash
      .addSelect(["homework.id"]) // Faqat homeworkning `id` maydonini tanlash
      .getMany();
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

  async getVideosWithWatchCountBetween0And5(
    order: number,
  ): Promise<HomeworkProgress[]> {
    return await this.homeworkProgressRepository
      .createQueryBuilder("homeworkProgress")
      .leftJoinAndSelect("homeworkProgress.homework", "homework") // homework jadvali bilan bog'lash
      .leftJoinAndSelect("homework.block", "block") // homework.block orqali bog'lash
      .leftJoinAndSelect("block.course", "course") // block.course orqali bog'lash
      .where("homework.order < :order", { order }) // homework.order orqali filtrlash
      .andWhere("homeworkProgress.countWatched > :minCount", { minCount: 0 })
      .andWhere("homeworkProgress.countWatched < :maxCount", { maxCount: 5 })
      .select([
        "homeworkProgress", // homeworkProgress yozuvini olish
        "homework", // homework ma'lumotlarini olish
        "block.id", // block id ni olish
        "course.id", // course id ni olish
      ])
      .getMany(); // homeworkProgress yozuvlarini barcha kerakli homework, block va course ma'lumotlari bilan qaytarish
  }

  async getFiveVideos(order: number): Promise<Array<HomeworkProgress>> {
    return await this.homeworkProgressRepository
      .createQueryBuilder("homeworkProgress")
      .leftJoinAndSelect("homeworkProgress.homework", "homework") // homework jadvalini qo'shish
      .where("homework.order > :order", { order }) // homework.order bo'yicha filtrlash
      .orderBy("homework.order", "ASC") // homework.order bo'yicha tartiblash
      .limit(5) // faqat 5 ta natijani cheklash
      .getMany(); // Barcha ma'lumotlarni olish
  }

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
