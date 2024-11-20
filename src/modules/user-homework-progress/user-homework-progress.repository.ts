import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UserHomeworkProgress } from "./entities/user-homework-progress.entity";
import { Injectable } from "@nestjs/common";
import { ID } from "src/common/types/type"; // ID turini import qilish
import { IUserHomeworkProgressRepository } from "./interfaces/user-homework-progress.repository";

@Injectable()
export class UserHomeworkProgressRepository
  implements IUserHomeworkProgressRepository
{
  constructor(
    @InjectRepository(UserHomeworkProgress)
    private readonly userHomeworkProgressRepository: Repository<UserHomeworkProgress>, // Repositoryni constructor orqali inject qilish
  ) {}

  /**
   * Bir nechta UserHomeworkProgress yozuvlarini yaratish
   * @param userHomeworkProgresses - UserHomeworkProgress yozuvlari
   * @returns Yangi yaratilgan UserHomeworkProgress yozuvlari
   */
  async bulkCreate(
    userHomeworkProgresses: UserHomeworkProgress[],
  ): Promise<UserHomeworkProgress[]> {
    return await this.userHomeworkProgressRepository.save(
      userHomeworkProgresses,
    );
  }

  /**
   * userId va blockOrder bo'yicha UserHomeworkProgress yozuvlarini topish
   * @param userId - Foydalanuvchi ID
   * @param blockOrder - Block tartibi
   * @returns UserHomeworkProgress yozuvlari
   */
  async findByBlockOrderAndUserId(
    blockId: ID,
    userId: ID,
  ): Promise<UserHomeworkProgress[]> {
    return await this.userHomeworkProgressRepository.find({
      where: {
        blockId: blockId,
        userId: userId,
      },
      relations: ["homework"],
      order: {
        homeworkOrder: "ASC", // homeworkOrder bo'yicha o'sish tartibida saralash
      },
    });
  }

  /**
   * userId, blockOrder, va homeworkOrder bo'yicha UserHomeworkProgress yozuvlarini topish
   * @param userId - Foydalanuvchi ID
   * @param blockOrder - Block tartibi
   * @param homeworkOrder - Homework tartibi
   * @returns UserHomeworkProgress yozuvlari
   */
  async findByUserIdBlockOrderAndHomeworkOrder(
    userId: number,
    blockOrder: number,
    homeworkOrder: number,
  ): Promise<UserHomeworkProgress> {
    return await this.userHomeworkProgressRepository.findOne({
      where: { userId, blockOrder, homeworkOrder },
    });
  }

  async markHomeworkAsWatched(
    homeworkOrder: ID,
    userId: ID,
    blockId: ID,
  ): Promise<UserHomeworkProgress> {
    try {
      // homeworkOrder, userId (user_idx ustuniga bog'lanadi) va blockId bo'yicha homework progress yozuvini topamiz
      const homeworkProgress =
        await this.userHomeworkProgressRepository.findOne({
          where: { homeworkOrder, userId, blockId }, // userId bilan qidiramiz
          relations: ["homework"], // agar user va homework bog'lanishini olishni xohlasangiz
        });

      if (homeworkProgress) {
        // Agar topilgan bo'lsa, faqat isWatched ni true qilamiz
        homeworkProgress.isWatched = true;

        // O'zgartirilgan homeworkProgressni saqlaymiz va qaytaramiz
        return await this.userHomeworkProgressRepository.save(homeworkProgress);
      } else {
        // Agar topilmasa, xato haqida aniq ma'lumot beramiz
        console.error(
          `Homework progress not found for homeworkOrder: ${homeworkOrder}, userId: ${userId}, blockId: ${blockId}`,
        );
        throw new Error(
          `UserHomeworkProgress not found for homeworkOrder: ${homeworkOrder}, userId: ${userId}, blockId: ${blockId}`,
        );
      }
    } catch (error) {
      console.error("Error in markHomeworkAsWatched method:", error);
      throw new Error("An error occurred while marking homework as watched");
    }
  }

  async findAll(): Promise<UserHomeworkProgress[]> {
    return await this.userHomeworkProgressRepository.find({});
  }

  async findNextHomeworkProgress(
    currentHomeworkOrder: ID,
    userId: ID,
    blockOrder: ID,
  ): Promise<UserHomeworkProgress | null> {
    try {
      // homeworkOrder'dan katta birinchi yozuvni topish uchun QueryBuilder ishlatamiz
      const homeworkProgress = await this.userHomeworkProgressRepository
        .createQueryBuilder("progress")
        .where("progress.homeworkOrder > :currentHomeworkOrder", {
          currentHomeworkOrder,
        })
        .andWhere("progress.userId = :userId", { userId })
        .andWhere("progress.blockOrder = :blockOrder", { blockOrder })
        .orderBy("progress.homeworkOrder", "ASC") // Homework order bo'yicha tartib
        .getOne(); // Faqat bitta yozuvni qaytarish

      // Topilgan yozuvni qaytarish
      return homeworkProgress;
    } catch (error) {
      // Xatolikni log qilish
      console.error("Find error:", error);
      throw new Error("Error while fetching next HomeworkProgress");
    }
  }

  async updateProgress(
    updateData: UserHomeworkProgress,
  ): Promise<UserHomeworkProgress> {
    return await this.userHomeworkProgressRepository.save(updateData);
  }

  /**
   * Barcha UserHomeworkProgress yozuvlarini o'chirish
   * @returns true - Agar o'chirish muvaffaqiyatli bo'lsa
   * @returns false - Agar xatolik yuz bersa
   */
  async deleteAll(userId: ID, blockId: ID): Promise<boolean> {
    try {
      // Faqat berilgan userId va blockId bo'yicha yozuvlarni o'chirish
      const result = await this.userHomeworkProgressRepository.delete({
        userId: userId,
        blockId: blockId,
      });

      // Agar hech qanday yozuv o'chirilmagan bo'lsa, false qaytariladi
      if (result.affected === 0) {
        return false;
      }

      return true; // Muvaffaqiyatli o'chirish
    } catch (error) {
      console.error(error);
      return false; // Xatolik yuz bersa
    }
  }
}
