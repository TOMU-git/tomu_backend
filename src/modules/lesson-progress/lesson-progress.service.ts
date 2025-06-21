import { Injectable, Inject, forwardRef } from "@nestjs/common";
import { ILessonProgressService } from "./interfaces/lesson-progress.service";
import { ResData } from "src/lib/resData";
import { ID } from "src/common/types/type";
import { LessonProgress } from "./entities/lesson-progress.entity";
import {
  LessonProgressAlreadyExistException,
  LessonProgressNotFoundException,
} from "./exception/lesson-progress.exception";
import { ILessonProgressRepository } from "./interfaces/lesson-progress.repository";
import { IUserService } from "../user/interfaces/user.service";
import { ILessonService } from "../lesson/interfaces/lesson.service";
import { ILessonRepository } from "../lesson/interfaces/lesson.repository";
import { IHomeworkProgressRepository } from "../homework-progress/interfaces/homework-progress.repository";
import { IHomeworkProgressService } from "../homework-progress/interfaces/homework-progress.service";
import { IBlockRepository } from "../block/interfaces/block.repository";
import { BlockNotFoundException } from "../block/exception/block.exception";
import { Logger } from '@nestjs/common';
import { IUserCourseRepository } from "../user-courses/interfaces/user-course.repository";
import { StatusEnum } from "src/common/enums/enum";

@Injectable()
export class LessonProgressService implements ILessonProgressService {
  private readonly logger = new Logger(LessonProgressService.name);

  constructor(
    @Inject("ILessonProgressRepository")
    private readonly lessonProgressRepository: ILessonProgressRepository,

    @Inject("IUserService") // UserService ni inject qilamiz
    private readonly userService: IUserService,

    @Inject("ILessonService") // LessonService ni inject qilamiz
    private readonly lessonService: ILessonService,

    @Inject("ILessonRepository") // LessonRepository ni inject qilamiz
    private readonly lessonRepository: ILessonRepository,

    @Inject("IHomeworkProgressRepository") // HomeworkRepository ni inject qilamiz
    private readonly homeworkProgressRepository: IHomeworkProgressRepository,

    @Inject("IBlockRepository") // LessonRepository ni inject qilamiz
    private readonly blockRepository: IBlockRepository,

    @Inject(forwardRef(() => "IHomeworkProgressService")) // HomeworkProgressService ni inject qilamiz
    private readonly homeworkProgressService: IHomeworkProgressService,

    @Inject("IUserCourseRepository") // UserCourseRepository ni inject qilamiz
    private readonly userCourseRepository: IUserCourseRepository,
  ) { }

  async findAll(): Promise<ResData<Array<LessonProgress>>> {
    const data = await this.lessonProgressRepository.findAll();

    return new ResData<Array<LessonProgress>>("ok", 200, data);
  }

  async findOneById(id: ID): Promise<ResData<LessonProgress>> {
    const foundData = await this.lessonProgressRepository.findById(id);
    if (!foundData) {
      throw new LessonProgressNotFoundException();
    }

    return new ResData<LessonProgress>("ok", 200, foundData);
  }

  async update(id: ID): Promise<ResData<LessonProgress>> {
    try {
      // Progress topish va lesson relationni yuklash
      const foundLessonProgress = await this.lessonProgressRepository.findById(id);
      if (!foundLessonProgress) {
        throw new LessonProgressNotFoundException();
      }

      // Lesson ma'lumotlarini tekshirish
      if (!foundLessonProgress.lesson) {
        throw new Error('Dars topilmadi');
      }

      // Agar dars allaqachon ko'rilgan bo'lsa, uy vazifani qayta qo'shmaslik
      if (foundLessonProgress.isWatched) {
        return new ResData<LessonProgress>(
          "Dars allaqachon ko'rilgan",
          200,
          foundLessonProgress,
        );
      }

      const userId = Number(foundLessonProgress.userId);
      const courseId = Number(foundLessonProgress.courseId);
      const blockOrder = Number(foundLessonProgress.blockOrder);
      const lessonOrder = Number(foundLessonProgress.lessonOrder);

      // Foydalanuvchining bugungi ko'rgan darslar sonini tekshirish
      // const watchedLessonsToday = await this.checkDailyLessonsLimit(userId);
      // if (watchedLessonsToday >= 10) {
      //   return new ResData<LessonProgress>(
      //     "Bugun uchun darslar limiti (10) tugadi. Iltimos, ertaga davom eting.",
      //     400,
      //     foundLessonProgress,
      //   );
      // }

      // Oldingi uy vazifalar bajarilganligini tekshirish
      const lastWatchedLessonOrder = await this.lessonProgressRepository.findLastWatchedLessonOrder(
        userId,
        courseId,
        blockOrder,
      );

      const lastWatchedHomeworkOrder = await this.homeworkProgressRepository.findLastWatchedHomework(
        courseId,
        userId,
        blockOrder,
      );

      // Har bir darsdan keyin uy vazifa bajarilishi shart
      if (lastWatchedLessonOrder > lastWatchedHomeworkOrder) {
        return new ResData<LessonProgress>(
          "Keyingi darsni ko'rish uchun avval uy vazifani bajarishingiz kerak",
          400,
          foundLessonProgress,
        );
      }

      // Agar dars allaqachon ko'rilgan bo'lsa, uy vazifani qayta qo'shmaslik
      if (foundLessonProgress.isWatched) {
        return new ResData<LessonProgress>(
          "Dars allaqachon ko'rilgan",
          200,
          foundLessonProgress,
        );
      }

      // Joriy darsni ko'rilgan qilish
      foundLessonProgress.isWatched = true;
      await this.lessonProgressRepository.update(foundLessonProgress);

      // Dars ko'rilganda darhol o'sha darsning uyga vazifasini yuborish
      try {
        // Lesson obyektini tekshirish va lessonId olish
        if (!foundLessonProgress.lesson || !foundLessonProgress.lesson.id) {
          this.logger.warn(`Dars ma'lumotlari to'liq emas, uyga vazifa rejalashtirish o'tkazib yuborildi`);
          return new ResData<LessonProgress>(
            "Dars progressi muvaffaqiyatli yangilandi, lekin uyga vazifa rejalashtirilmadi",
            200,
            foundLessonProgress,
          );
        }

        const lessonId = foundLessonProgress.lesson.id;

        console.log("lessonId in lessonProgressService", lessonId);

        // Event emitter orqali xabar yuborish o'rniga to'g'ridan-to'g'ri metodni chaqiramiz
        const result = await this.homeworkProgressService.scheduleHomeworkForLesson(userId, courseId, blockOrder, lessonOrder);

        if (result.statusCode === 200) {
          this.logger.log(`Dars (ID: ${lessonId}) ko'rilgandan so'ng uyga vazifa muvaffaqiyatli rejalashtirildi`);
        } else {
          this.logger.warn(`Dars (ID: ${lessonId}) ko'rilgandan so'ng uyga vazifani rejalashtirish muammosi: ${result.message}`);
        }
      } catch (error) {
        this.logger.error(`Dars ko'rilgandan so'ng uyga vazifani rejalashtirish xatoligi: ${error.message}`, error.stack);
        // Asosiy jarayonni to'xtatmaslik uchun xatoni yutib yuboramiz
      }

      return new ResData<LessonProgress>(
        "Dars progressi muvaffaqiyatli yangilandi",
        200,
        foundLessonProgress,
      );
    } catch (error) {
      this.logger.error(`Dars progressini yangilashda xatolik: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getVideos(
    userId: ID,
    blockId: ID,
  ): Promise<ResData<Array<LessonProgress>>> {
    const block = await this.blockRepository.findById(blockId);
    if (!block) {
      throw new BlockNotFoundException();
    }
  
    const existingProgresses =
      await this.lessonProgressRepository.findByBlockIdAndUserId(
        blockId,
        userId,
      );
  
    // 🔄 Progress mavjud bo'lsa, lekin yangi darslar qo'shilgan bo'lsa, progressni yangilash
    if (existingProgresses && existingProgresses.length > 0) {
      const courseId = existingProgresses[0].courseId;
      const blockOrder = existingProgresses[0].blockOrder;
  
      // 1. Darslar sonini tekshirish
      const totalLessonsCount = await this.lessonRepository.countByBlockId(blockId);
      const progressCount = existingProgresses.length;
  
      // 2. Agar yangi darslar mavjud bo‘lsa, progressga qo‘shib qo‘yish
      if (totalLessonsCount > progressCount) {
        // generateLessonProgress progresslarni to‘liq qayta yaratmaydi, faqat yo‘qlarni qo‘shadi
        await this.generateLessonProgress(userId, blockId, courseId);
  
        // Progressni qaytadan olish (yangilangan holda)
        const updatedProgresses =
          await this.lessonProgressRepository.findByBlockIdAndUserId(
            blockId,
            userId,
          );
  
        return new ResData<Array<LessonProgress>>(
          "Lesson progress updated with new lessons",
          200,
          updatedProgresses,
        );
      }
  
      // ❗ Kurs pullik bo'lsa va progress tekshiruvlari (o'zgarmagan qismi)
      const userCourse = await this.userCourseRepository.findByUserIdAndCourseId(userId, courseId);
      const isPaid = userCourse && userCourse.status === StatusEnum.COMPLETED;
  
      if (!isPaid) {
        if (blockOrder > 1) {
          return new ResData<Array<LessonProgress>>(
            "To access lessons beyond module 1, you need to purchase this course.",
            403,
            existingProgresses,
          );
        }
  
        if (blockOrder === 1) {
          const hasLessonBeyond20 = existingProgresses.some(progress =>
            progress.lessonOrder > 20 && progress.isUnlocked
          );
  
          if (hasLessonBeyond20) {
            return new ResData<Array<LessonProgress>>(
              "To access lessons beyond lesson 20 in module 1, you need to purchase this course.",
              403,
              existingProgresses,
            );
          }
        }
      }
  
      return new ResData<Array<LessonProgress>>(
        "Lesson fetched successfully",
        200,
        existingProgresses,
      );
    }
  
    // ❌ Agar progress umuman bo'lmasa — ilk marta yaratilmoqda
    const courseId = await this.blockRepository.getCourseIdByBlockId(blockId);
  
    if (existingProgresses.length === 0) {
      const newProgresses = await this.generateLessonProgress(userId, blockId, courseId);
  
      return new ResData<Array<LessonProgress>>(
        "Lesson progress created successfully",
        200,
        newProgresses,
      );
    }
  
    return new ResData<Array<LessonProgress>>(
      "No lessons available",
      404,
      [],
    );
  }
  

  /**
   * Berilgan block va foydalanuvchi uchun barcha darslar progressini yaratadi
   * 
   * @param userId - Foydalanuvchi ID si
   * @param blockId - Block ID si
   * @param courseId - Kurs ID si
   * @returns Yaratilgan progress ro'yxati
   */
  async generateLessonProgress(
    userId: ID,
    blockId: ID,
    courseId: ID,
  ): Promise<Array<LessonProgress>> {
    try {
      const block = await this.blockRepository.findById(blockId);
      if (!block) {
        throw new Error(`${blockId} ID li block topilmadi`);
      }
  
      // Barcha darslarni olish
      const lessons = await this.lessonRepository.findLessonsByBlockId(blockId);
      if (!lessons || lessons.length === 0) {
        throw new Error(`${blockId} ID li blockda darslar topilmadi`);
      }
  
      // Mavjud progresslar
      const existingProgresses =
        await this.lessonProgressRepository.findByBlockIdAndUserId(blockId, userId);
  
      const existingLessonIds = new Set(
        existingProgresses.map(progress => progress.lesson.id),
      );
  
      const sortedLessons = lessons.sort((a, b) => a.order - b.order);
  
      const newProgressList: LessonProgress[] = [];
  
      for (const lesson of sortedLessons) {
        if (existingLessonIds.has(lesson.id)) {
          continue; // progress allaqachon mavjud, o'tkazib yuboriladi
        }
  
        const newProgress = new LessonProgress();
        newProgress.userId = userId;
        newProgress.blockId = blockId;
        newProgress.lessonOrder = lesson.order;
        newProgress.blockOrder = block.order;
        newProgress.courseId = courseId;
        newProgress.lesson = lesson;
        newProgress.isWatched = false;
  
        // Progress hali yo'q darslar ichida eng birinchi tartibdagini ochiq qilish
        const isFirstUnlocked =
          !existingProgresses.length &&
          lesson.order === sortedLessons[0].order;
        newProgress.isUnlocked = isFirstUnlocked;
  
        this.logger.log(
          `Yangi progress qo‘shildi: lessonOrder=${newProgress.lessonOrder}, isUnlocked=${newProgress.isUnlocked}`,
        );
  
        const createdProgress = await this.lessonProgressRepository.create(newProgress);
        newProgressList.push(createdProgress);
      }
  
      return [...existingProgresses, ...newProgressList];
    } catch (error) {
      this.logger.error('Dars progresslarini yaratishda xatolik: ' + error.message);
      throw error;
    }
  }
  

  /**
   * Foydalanuvchining bugungi ko'rgan darslar sonini tekshirish
   * @param userId - Foydalanuvchi ID si
   * @returns Bugun ko'rilgan darslar soni
   */
  private async checkDailyLessonsLimit(userId: ID): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Bugungi kunning boshlanishi (00:00:00)

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1); // Ertangi kun

    // Bugun ko'rilgan darslar sonini hisoblash
    const watchedLessonsToday = await this.lessonProgressRepository.countWatchedLessonsInDateRange(
      userId,
      today,
      tomorrow
    );

    return watchedLessonsToday;
  }
}

// INSERT INTO homeworks (title, video_url, mime_type, size, "order", duration, block_id)
// SELECT
//     'Generated description for homework ' || i,
//     'https://player.vimeo.com/video/1031009633',
//     'video/mp4',
//     1024000 + (i * 1000),  -- Fayl hajmini oshib boruvchi qiymat sifatida o'zgartirish
//     i,  -- Order ketma-ketlikda oshib boradi
//     300 + (i * 10),  -- Davomiylik oshib boruvchi qiymat sifatida
//     32  -- block_id
// FROM
//     generate_series(1, 100) AS s(i);
