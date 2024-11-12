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
  ): Promise<UserHomeworkProgress[]> {
    return await this.userHomeworkProgressRepository.find({
      where: { userId, blockOrder, homeworkOrder },
    });
  }

  /**
   * userId, blockOrder va homeworkOrder bo'yicha progressni yangilash
   * @param userId - Foydalanuvchi ID
   * @param blockOrder - Block tartibi
   * @param homeworkOrder - Homework tartibi
   * @param updateData - Yangilanish ma'lumotlari
   * @returns Yangilangan UserHomeworkProgress yozuvlari
   */
  async updateProgressByUserIdBlockOrderAndHomeworkOrder(
    userId: number,
    blockOrder: number,
    homeworkOrder: number,
    updateData: Partial<UserHomeworkProgress>, // bu yerda faqat yangilash kerak bo'lgan ma'lumotlar yuboriladi
  ): Promise<UserHomeworkProgress[]> {
    // Yangi ma'lumotlarni yangilash
    await this.userHomeworkProgressRepository.update(
      { userId, blockOrder, homeworkOrder },
      updateData,
    );

    // Yangilangan yozuvni qaytarish
    return this.findByUserIdBlockOrderAndHomeworkOrder(
      userId,
      blockOrder,
      homeworkOrder,
    );
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
