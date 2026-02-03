import { ID } from "src/common/types/type";
import { LessonProgress } from "../entities/lesson-progress.entity";

export interface ILessonProgressRepository {
  create(dto: LessonProgress): Promise<LessonProgress>;
  findAll(): Promise<Array<LessonProgress>>;
  findById(id: ID): Promise<LessonProgress | null>;
  findByBlockIdAndUserId(
    blockId: ID,
    userId: ID,
  ): Promise<Array<LessonProgress | null>>;
  isAllLessonWatched(
    blockOrder: ID,
    lessonOrder: ID,
    userId: ID,
    courseId: ID,
  ): Promise<boolean>;
  findOneByUserAndLesson(
    userId: ID,
    lessonId: ID,
  ): Promise<LessonProgress | null>;
  update(dto: LessonProgress): Promise<LessonProgress>;
  findMaxLessonOrder(
    blockOrder: ID,
    userId: ID,
    courseId: ID,
  ): Promise<number | null>;
  findLastWatchedLessonOrder(
    userId: ID,
    courseId: ID,
    blockOrder: ID,
  ): Promise<number | null>;

  getLessonProgress(
    lessonOrder: ID,
    userId: ID,
    blockOrder: ID,
    courseId: ID,
  ): Promise<LessonProgress | null>;

  unlockNextLesson(
    currentLessonOrder: ID,
    userId: ID,
    blockId: ID,
  ): Promise<LessonProgress>;

  findAllWatchedLessonsByUser(userId: ID, courseId: ID): Promise<LessonProgress[]>;
  checkAllLessonsWatched(
    blockOrder: ID,
    userId: ID,
    courseId: ID,
  ): Promise<boolean>;

  /**
   * Berilgan vaqt oralig'ida foydalanuvchi tomonidan ko'rilgan darslar sonini hisoblash.
   * 
   * @param userId - Foydalanuvchi ID si
   * @param startDate - Boshlang'ich sana
   * @param endDate - Tugash sanasi
   * @returns Ko'rilgan darslar soni
   */
  countWatchedLessonsInDateRange(
    userId: ID,
    startDate: Date,
    endDate: Date,
  ): Promise<number>;

  findLastUnlockedAndWatchedLessonOrder(
    userId: ID,
    courseId: ID,
    blockOrder: ID,
  ): Promise<number | null>;

  /**
   * Berilgan blokda foydalanuvchi tomonidan tugatilgan darslar sonini hisoblash.
   * 
   * @param userId - Foydalanuvchi ID si
   * @param courseId - Kurs ID si
   * @param blockOrder - Blok tartibi (masalan, 1-bo'lim uchun 1)
   * @returns Tugatilgan darslar soni
   */
  countCompletedLessonsInBlock(
    userId: ID,
    courseId: ID,
    blockOrder: number,
  ): Promise<number>;

  /**
   * Berilgan blokdagi barcha darslar foydalanuvchi tomonidan tugatilganligini tekshirish.
   * 
   * @param userId - Foydalanuvchi ID si
   * @param courseId - Kurs ID si
   * @param blockOrder - Blok tartibi (masalan, 1-bo'lim uchun 1)
   * @returns true - agar barcha darslar tugatilgan bo'lsa, false - aks holda
   */
  isBlockFullyCompleted(
    userId: ID,
    courseId: ID,
    blockOrder: number,
  ): Promise<boolean>;
}
