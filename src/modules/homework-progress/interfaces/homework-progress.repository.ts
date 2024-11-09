import { ID } from "src/common/types/type";
import { HomeworkProgress } from "../entities/homework-progress.entity";

// HomeworkProgress ma'lumotlarini boshqarish uchun interfeys
export interface IHomeworkProgressRepository {
  // Yangi HomeworkProgress yozuvini yaratadi
  create(dto: HomeworkProgress): Promise<HomeworkProgress>;

  // Barcha HomeworkProgress yozuvlarini qaytaradi
  findAll(): Promise<Array<HomeworkProgress>>;

  // ID bo'yicha HomeworkProgress yozuvini topadi
  findById(id: ID): Promise<HomeworkProgress | null>;

  // Foydalanuvchi ID bo'yicha barcha HomeworkProgress yozuvlarini qaytaradi
  findByUserId(userId: ID): Promise<Array<HomeworkProgress> | null>;

  // HomeworkProgress yozuvini yangilaydi
  update(dto: HomeworkProgress): Promise<HomeworkProgress>;

  // HomeworkProgress yozuvini o'chiradi
  delete(dto: HomeworkProgress): Promise<HomeworkProgress>;

  // Berilgan order va userId bo'yicha barcha HomeworkProgress yozuvlarida isWatched maydoni true yoki yo'qligini tekshiradi
  areAllWatchedByOrderAndUserId(order: ID, userId: ID): Promise<boolean>;

  // Foydalanuvchi va blockOrder bo'yicha oxirgi isWatched true bo'lgan HomeworkProgress yozuvining homework.order qiymatini qaytaradi
  findLastWatchedHomeworkOrderByUserIdAndBlockOrder(
    userId: ID,
    blockOrder: number,
  ): Promise<number | null>;

  // Berilgan order va userId bo'yicha HomeworkProgress yozuvlarini qaytaradi
  findByOrderAndUserId(
    order: ID,
    userId: ID,
  ): Promise<Array<HomeworkProgress | null>>;

  // Berilgan blockOrder qiymati bo'yicha isWatched qiymati 0 dan 5 gacha bo'lgan HomeworkProgress yozuvlarini qaytaradi
  getVideosWithWatchCountBetween0And5(
    blockOrder: ID,
  ): Promise<Array<HomeworkProgress>>;

  // Berilgan blockOrder va userId bo'yicha eng yuqori homework.order qiymatini qaytaradi
  findHighestHomeworkOrderByUserAndBlock(
    blockOrder: ID,
    userId: ID,
  ): Promise<number | null>;

  // Berilgan userId va homeworkId bo'yicha HomeworkProgress yozuvini topadi
  findOneByUserAndHomework(
    userId: ID,
    homeworkId: ID,
  ): Promise<HomeworkProgress | null>;
}
