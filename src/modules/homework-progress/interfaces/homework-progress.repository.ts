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
  areAllWatchedByOrderAndUserId(
    blockOrder: ID,
    userId: ID,
    courseId: ID,
  ): Promise<boolean>;

  // Foydalanuvchi va blockOrder bo'yicha oxirgi isWatched true bo'lgan HomeworkProgress yozuvining homework.order qiymatini qaytaradi
  findLastWatchedHomeworkOrderByUserIdAndBlockOrder(
    userId: ID,
    blockId: number,
  ): Promise<number | null>;

  // Foydalanuvchi ko'rayotgan videodan keyingi proccessni isWatched ni true qiladi
  markHomeworkAsWatched(
    homeworkOrder: number,
    userId: number,
    blockId: number,
  ): Promise<HomeworkProgress>;

  // Berilgan blockId va userId bo'yicha HomeworkProgress yozuvlarini qaytaradi
  findByBlocIdAndUserId(
    blockId: ID,
    userId: ID,
  ): Promise<Array<HomeworkProgress>>;

  // Berilgan blockOrder qiymati bo'yicha isWatched qiymati 0 dan 5 gacha bo'lgan HomeworkProgress yozuvlarini qaytaradi
  getVideosWithWatchCountBetween0And5(
    blockOrder: ID,
    courseId: ID,
    userId: ID,
  ): Promise<Array<HomeworkProgress>>;

  // Berilgan blockOrder va userId bo'yicha eng yuqori homework.order qiymatini qaytaradi
  findHighestHomeworkOrderByUserAndBlock(
    blockId: ID,
    userId: ID,
  ): Promise<number | null>;

  // Berilgan userId va homeworkId bo'yicha HomeworkProgress yozuvini topadi
  findOneByUserAndHomework(
    userId: ID,
    homeworkId: ID,
  ): Promise<HomeworkProgress | null>;

  // shunga mos progress bor yoki yo'qligini tekshiradi
  getHomeworkProgress(
    homeworkOrder: ID,
    userId: ID,
    blockId: ID,
  ): Promise<HomeworkProgress | null>;

  findTopFiveByBlockIdAndUserId(
    blockId: ID,
    userId: ID,
  ): Promise<Array<HomeworkProgress>>;

  findAllWatchedHomeworkByUser(
    userId: ID,
    courseId: ID,
  ): Promise<HomeworkProgress[]>;

  getHighestHomeworkProgress(
    userId: ID,
    blockOrder: ID,
    courseId: ID,
  ): Promise<HomeworkProgress | null>;

  findLastWatchedHomework(
    courseId: ID,
    userId: ID,
    blockOrder: ID,
  ): Promise<number | null>;
  
  areAllHomeworksWatchedUpToOrder(
    blockOrder: ID,
    userId: ID,
    courseId: ID,
    homeworkOrder: ID, // homeworkOrder ni qabul qilish
  ): Promise<boolean>;

  // Berilgan foydalanuvchi va kurs ID bo'yicha HomeworkProgress yozuvlarini topadi
  findByUserIdAndCourseId(userId: ID, courseId: ID): Promise<Array<HomeworkProgress>>;
}
