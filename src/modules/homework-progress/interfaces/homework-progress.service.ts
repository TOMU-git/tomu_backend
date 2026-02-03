import { ResData } from "../../../lib/resData";
import { ID } from "../../../common/types/type";
import { HomeworkProgress } from "../entities/homework-progress.entity";
import { UpdateHomeworkProgressDto } from "../dto/update-homework-progress.dto"; // Update DTO importi

// HomeworkProgress xizmatlari uchun interfeys
export interface IHomeworkProgressService {
  // Barcha HomeworkProgress yozuvlarini qaytaradi
  findAll(): Promise<ResData<Array<HomeworkProgress>>>;

  // ID bo'yicha HomeworkProgress yozuvini topadi
  findOneById(id: ID): Promise<ResData<HomeworkProgress>>;

  // Foydalanuvchi ID bo'yicha barcha HomeworkProgress yozuvlarini qaytaradi
  findByUserId(id: ID): Promise<ResData<Array<HomeworkProgress>>>;

  // ID va DTO bo'yicha HomeworkProgress yozuvini yangilaydi
  update(id: ID): Promise<ResData<HomeworkProgress>>;

  // ID bo'yicha HomeworkProgress yozuvini o'chiradi
  delete(id: ID): Promise<ResData<HomeworkProgress>>;

  // Agar schedule bo'lmasa, foydalanuvchi ko'rgan modullar asosida yangi schedule yaratadi
  getUserHomeworkVideos(userId: ID, courseId: ID): Promise<ResData<Array<Partial<HomeworkProgress>>>>;

  // Dars ko'rilganda darhol o'sha darsning uyga vazifasini yuborish
  scheduleHomeworkForLesson(userId: ID, courseId: ID, blockOrder: number, lessonOrder: number): Promise<ResData<any>>;

  // Foydalanuvchi ID bo'yicha uyga vazifa navbatidagi elementlar sonini qaytaradi
  countQueueItems(userId: ID, courseId: ID): Promise<ResData<{ count: number }>>;

  // Foydalanuvchi ID bo'yicha barcha kurslar uchun uyga vazifa navbatidagi elementlar sonini qaytaradi
  countAllQueueItems(userId: ID): Promise<ResData<Array<{ courseTitle: string; count: number }>>>;

  runSchedulerManually(): Promise<any>;
}
