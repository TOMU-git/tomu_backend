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
    blockOrder: ID,
    userId: ID,
  ): Promise<UserHomeworkProgress[]> {
    return await this.userHomeworkProgressRepository.find({
      where: {
        blockOrder: blockOrder,
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
    blockOrder: ID,
  ): Promise<UserHomeworkProgress> {
    try {
      // homeworkOrder, userId (user_idx ustuniga bog'lanadi) va blockOrder bo'yicha homework progress yozuvini topamiz
      const homeworkProgress =
        await this.userHomeworkProgressRepository.findOne({
          where: { homeworkOrder, userId, blockOrder }, // userId bilan qidiramiz
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
          `Homework progress not found for homeworkOrder: ${homeworkOrder}, userId: ${userId}, blockOrder: ${blockOrder}`,
        );
        throw new Error(
          `UserHomeworkProgress not found for homeworkOrder: ${homeworkOrder}, userId: ${userId}, blockOrder: ${blockOrder}`,
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

  async findHomeworkProgress(
    homeworkOrder: ID,
    userId: ID,
    blockOrder: ID,
  ): Promise<UserHomeworkProgress | null> {
    try {
      // homeworkOrder, userId (user_idx ustuniga bog'lanadi) va blockOrder bo'yicha homework progress yozuvini topamiz
      const homeworkProgress =
        await this.userHomeworkProgressRepository.findOne({
          where: { homeworkOrder, userId, blockOrder }, // Berilgan parametrlar bo'yicha qidiramiz
          relations: ["homework"], // Agar homework bilan bog'lanishni olishni xohlasangiz
        });

      // Agar topilgan bo'lsa, qaytarish
      return homeworkProgress;
    } catch (error) {
      // Xatolikni log qilish yoki xabar yuborish
      console.error("Find error:", error);
      throw new Error("Error while fetching HomeworkProgress");
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
  async deleteAll(userId: ID, blockOrder: number): Promise<boolean> {
    try {
      // Faqat berilgan userId va blockOrder bo'yicha yozuvlarni o'chirish
      const result = await this.userHomeworkProgressRepository.delete({
        userId: userId,
        blockOrder: blockOrder,
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
