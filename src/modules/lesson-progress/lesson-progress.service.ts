import { Injectable, Inject, forwardRef } from "@nestjs/common";
import { ILessonProgressService } from "./interfaces/lesson-progress.service";
import { ResData } from "src/lib/resData";
import { ID } from "src/common/types/type";
import { LessonProgress } from "./entities/lesson-progress.entity";
import { LessonProgressNotFoundException } from "./exception/lesson-progress.exception";
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
import { User } from "../user/entities/user.entity";
import { UserCourseProgressService } from "../ai/services/user-course-progress.service";
import { UserProgressCalculator } from "../ai/utils/user-progress-calculator.util";
import { DataSource } from "typeorm";

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

    // AI modulidan UserCourseProgress servislari
    private readonly userCourseProgressService: UserCourseProgressService,
    private readonly userProgressCalculator: UserProgressCalculator,

    // Database transaction uchun
    private readonly dataSource: DataSource,
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
      const foundLessonProgress = await this.lessonProgressRepository.findById(id);
      if (!foundLessonProgress || !foundLessonProgress.lesson) {
        throw new LessonProgressNotFoundException();
      }

      const { userId, blockId, courseId, blockOrder, lessonOrder } = foundLessonProgress;

      // 🔒 Avvalgi vazifalar soni 5 dan oshmaganmi?
      const initialQueue = await this.homeworkProgressService.countQueueItems(userId, courseId);
      if (initialQueue?.data?.count >= 5) {
        return new ResData<LessonProgress>(
          "Avvalgi vazifalarni yakunlang, so'ngra dars davom etadi.",
          403,
          foundLessonProgress,
        );
      }

      // 🔒 Dars ochilganmi tekshirish (eng muhim tekshiruv!)
      if (!foundLessonProgress.isUnlocked) {
        return new ResData<LessonProgress>(
          "Bu dars hali ochilmagan. Avvalgi darslarni yakunlang.",
          403,
          foundLessonProgress,
        );
      }

      if (foundLessonProgress.isWatched) {
        return new ResData<LessonProgress>(
          "Dars allaqachon ko'rilgan",
          200,
          foundLessonProgress,
        );
      }



      // ✅ Kunlik limit tekshiruvi
      // const dailyWatchedCount = await this.checkDailyLessonsLimit(userId);
      // if (dailyWatchedCount >= 10) {
      //   return new ResData<LessonProgress>(
      //     "Kunlik dars ko‘rish limiti tugagan. Ertaga davom eting.",
      //     403,
      //     foundLessonProgress,
      //   );
      // }

      // UserCourse ma'lumotlarini tekshirish
      const userCourse = await this.userCourseRepository.findByUserIdAndCourseId(userId, courseId);

      const hasPaid = userCourse.hasEverPaid
      const isActive = userCourse.isActive


      if (foundLessonProgress.lessonOrder >= 30 && !hasPaid && !isActive) {
        return new ResData<LessonProgress>(
          "To access lessons beyond lesson 30 in module 1, you need to purchase this course.",
          403,
          foundLessonProgress,
        );
      }

      if (foundLessonProgress.lessonOrder > 30 && hasPaid && !isActive) {
        return new ResData<LessonProgress>(
          "To access lessons beyond lesson 30 in module 1, you need to purchase this course.",
          403,
          foundLessonProgress,
        );
      }

      // 🔄 Transaction ichida LessonProgress va UserCourseProgress ni yangilash
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        // 👁 Darsni ko'rilgan deb belgilaymiz
        foundLessonProgress.isWatched = true;
        await queryRunner.manager.save(foundLessonProgress);

        // 🔄 UserCourseProgress ni yangilash
        await this.updateUserCourseProgressInTransaction(
          queryRunner,
          userId,
          courseId,
          foundLessonProgress
        );

        await queryRunner.commitTransaction();
        this.logger.log(`LessonProgress and UserCourseProgress updated successfully for user ${userId}, course ${courseId}`);
      } catch (error) {
        await queryRunner.rollbackTransaction();
        this.logger.error(`Transaction failed: ${error.message}`, error.stack);
        throw error;
      } finally {
        await queryRunner.release();
      }

      // 📌 Uyga vazifa rejalashtirish
      try {
        const result = await this.homeworkProgressService.scheduleHomeworkForLesson(
          userId,
          courseId,
          blockOrder,
          lessonOrder,
        );

        if (result.statusCode === 200) {
          this.logger.log(`Dars ID: ${foundLessonProgress.lesson.id} uchun vazifa muvaffaqiyatli rejalashtirildi`);
        } else {
          this.logger.warn(`Vazifa rejalashtirishda muammo: ${result.message}`);
          return new ResData<LessonProgress>(
            `Dars ko‘rildi, ammo vazifa rejalashtirilmadi: ${result.message}`,
            200,
            foundLessonProgress,
          );
        }
      } catch (error) {
        this.logger.error(`Vazifa rejalashtirishda xatolik: ${error.message}`, error.stack);
        return new ResData<LessonProgress>(
          "Dars ko‘rildi, ammo uyga vazifani rejalashtirishda xatolik yuz berdi",
          200,
          foundLessonProgress,
        );
      }

      // 🔄 Vazifa qo‘shilgandan keyin yana tekshiramiz
      const afterQueue = await this.homeworkProgressService.countQueueItems(userId, courseId);
      if (afterQueue?.data?.count <= 4) {
        await this.lessonProgressRepository.unlockNextLesson(lessonOrder, userId, blockId);
      } else {
        this.logger.warn("Vazifa limiti tugadi, keyingi dars ochilmadi");
      }

      return new ResData<LessonProgress>(
        "Dars muvaffaqiyatli ko‘rildi",
        200,
        foundLessonProgress,
      );
    } catch (error) {
      this.logger.error(`Dars progressini yangilashda xatolik: ${error.message}`, error.stack);
      throw error;
    }
  }



  async getVideos(userId: ID, blockId: ID): Promise<any> {
    const block = await this.blockRepository.findById(blockId);
    if (!block) {
      throw new BlockNotFoundException();
    }

    const existingProgresses =
      await this.lessonProgressRepository.findByBlockIdAndUserId(blockId, userId);

    if (existingProgresses && existingProgresses.length > 0) {
      const courseId = existingProgresses[0].courseId;
      const blockOrder = existingProgresses[0].blockOrder;

      // UserCourse ma'lumotlarini olish (isPreviousModuleCompleted uchun kerak)
      const userCourse = await this.userCourseRepository.findByUserIdAndCourseId(userId, courseId);

      if (!userCourse) {
        throw new Error(`UserCourse not found for userId=${userId}, courseId=${courseId}`);
      }

      const hasPaid = userCourse.hasEverPaid
      const isActive = userCourse.isActive
      const onFreeTrial = userCourse.onFreeTrial

      // ✅ Oldingi modulni to'liq tugatganligini tekshirish va kunlik warning limiti
      let isPreviousModuleCompleted: boolean | null = true; // Default: 1-modul yoki oldingi modul tugatilgan

      if (blockOrder > 1) {
        const previousBlockOrder = blockOrder - 1;
        const isCompleted = await this.lessonProgressRepository.isBlockFullyCompleted(
          userId,
          courseId,
          previousBlockOrder
        );

        if (!isCompleted) {
          // Oldingi modul tugatilmagan - kunlik warning limitni tekshirish
          const today = new Date();
          today.setHours(0, 0, 0, 0); // Bugungi kunning boshlanishi

          const lastWarning = userCourse.lastModuleWarningShownAt;
          const lastWarningBlock = userCourse.lastModuleWarningBlockOrder;

          // Agar warning bugun ko'rsatilmagan bo'lsa yoki boshqa modul uchun ko'rsatilgan bo'lsa
          if (!lastWarning ||
            new Date(lastWarning) < today ||
            lastWarningBlock !== blockOrder) {
            // Warning ko'rsatish va timestamp yangilash
            isPreviousModuleCompleted = false;
            userCourse.lastModuleWarningShownAt = new Date();
            userCourse.lastModuleWarningBlockOrder = blockOrder;
            await this.userCourseRepository.update(userCourse);
            this.logger.log(`⚠️ Module warning shown: userId=${userId}, blockOrder=${blockOrder}`);
          } else {
            // Warning bugun allaqachon ko'rsatilgan
            isPreviousModuleCompleted = null;
            this.logger.log(`ℹ️ Module warning already shown today: userId=${userId}, blockOrder=${blockOrder}`);
          }
        }
      }

      const totalLessonsCount = await this.lessonRepository.countByBlockId(blockId);
      const progressCount = existingProgresses.length;

      if (totalLessonsCount > progressCount) {


        await this.generateLessonProgress(userId, blockId, courseId);

        const updatedProgresses =
          await this.lessonProgressRepository.findByBlockIdAndUserId(blockId, userId);

        return {
          message: "Lesson progress updated with new lessons",
          statusCode: 200,
          data: updatedProgresses,
          isPaid: true,
          isPreviousModuleCompleted
        };
      }



      // TODO: TEMPORARY - Re-enable queue check for production
      // TEMPORARY: Queue check disabled for AI testing

      // Vazifalar bo'limidagi vazifalar sonini tekshirish
      const queueItemsCount = await this.homeworkProgressService.countQueueItems(userId, courseId);
      if (queueItemsCount.data.count >= 5) {
        return {
          message: "Finish reviewing the previous tasks first.",
          statusCode: 403,
          data: existingProgresses,
          isPaid: isActive,
          isPreviousModuleCompleted
        };
      }



      // // ✅ Kunlik limitni tekshirish
      // const dailyWatchedCount = await this.checkDailyLessonsLimit(userId);
      // if (dailyWatchedCount >= 10) {
      //   return {
      //     message: "Kunlik dars ko'rish limiti tugagan. Ertaga davom eting.",
      //     statusCode: 403,
      //     data: existingProgresses, // eski darslar ko'rsatiladi
      //     isPaid: isActive,
      //   };
      // }

      // TODO: TEMPORARY - Re-enable payment check for production
      // TEMPORARY: Payment check disabled for AI testing

      if (!hasPaid || !isActive) {
        if (blockOrder > 1) {
          return {
            message: "To access lessons beyond lesson 30 in module 1, you need to purchase this course.",
            statusCode: 403,
            data: [],
            isPaid: false,
            isPreviousModuleCompleted
          };
        }

        if (blockOrder === 1) {
          const hasLessonBeyond30 = existingProgresses.some(progress =>
            progress.lessonOrder >= 30 && progress.isUnlocked
          );

          if (hasLessonBeyond30) {
            return {
              message: "To access lessons beyond lesson 30 in module 1, you need to purchase this course.",
              statusCode: 403,
              data: existingProgresses,
              isPaid: false,
              isPreviousModuleCompleted
            };
          }
        }
      }

      // ✅ Lazy Unlock: Barcha tekshiruvlardan o'tgandan keyin, agar queue bo'sh bo'lsa keyingi darsni ochish
      if (queueItemsCount.data.count === 0) {
        this.logger.log(`🔍 Lazy unlock boshlandi: userId=${userId}, courseId=${courseId}, blockOrder=${blockOrder}`);

        const dailyWatchedCount = await this.checkDailyLessonsLimit(userId);
        this.logger.log(`📊 Kunlik ko'rilgan darslar: ${dailyWatchedCount}/10`);

        if (dailyWatchedCount < 40) {
          const lastLessonOrder = await this.lessonProgressRepository.findLastUnlockedAndWatchedLessonOrder(
            userId,
            courseId,
            blockOrder
          );
          this.logger.log(`📌 Oxirgi watched & unlocked dars: ${lastLessonOrder}`);

          if (lastLessonOrder !== null) {
            const nextLessonProgress = await this.lessonProgressRepository.getLessonProgress(
              lastLessonOrder + 1,
              userId,
              blockOrder,
              courseId
            );
            this.logger.log(`🔎 Keyingi dars topildi: lessonOrder=${lastLessonOrder + 1}, isUnlocked=${nextLessonProgress?.isUnlocked}`);

            if (nextLessonProgress && !nextLessonProgress.isUnlocked) {
              nextLessonProgress.isUnlocked = true;
              await this.lessonProgressRepository.update(nextLessonProgress);
              this.logger.log(
                `✅ Lazy unlock: Queue bo'sh, keyingi dars (lessonOrder ${nextLessonProgress.lessonOrder}) ochildi`
              );
            } else if (nextLessonProgress && nextLessonProgress.isUnlocked) {
              this.logger.log(`⏩ Dars allaqachon ochiq: lessonOrder=${nextLessonProgress.lessonOrder}`);
            } else {
              this.logger.warn(`❌ Keyingi dars topilmadi: lessonOrder=${lastLessonOrder + 1}`);
            }
          } else {
            this.logger.warn(`❌ Hech qanday watched & unlocked dars topilmadi`);
          }
        } else {
          this.logger.log(`🚫 Kunlik limit tugagan: ${dailyWatchedCount}/10`);
        }
      } else {
        this.logger.log(`🚫 Queue bo'sh emas: ${queueItemsCount.data.count} ta vazifa`);
      }

      // ✅ Agar unlock qilingan bo'lsa, yangilangan ma'lumotlarni qaytarish
      const finalProgresses = await this.lessonProgressRepository.findByBlockIdAndUserId(blockId, userId);

      return {
        message: "Lesson fetched successfully",
        statusCode: 200,
        data: finalProgresses,
        isPaid: !!isActive,
        isPreviousModuleCompleted
      };
    }

    const courseId = await this.blockRepository.getCourseIdByBlockId(blockId);
    if (existingProgresses.length === 0) {
      const newProgresses = await this.generateLessonProgress(userId, blockId, courseId);
      const userCourse = await this.userCourseRepository.findByUserIdAndCourseId(userId, courseId);

      if (!userCourse) {
        throw new Error(`UserCourse not found for userId=${userId}, courseId=${courseId}`);
      }

      const isActive = userCourse.isActive;

      return {
        message: "Lesson progress created successfully",
        statusCode: 200,
        data: newProgresses,
        isPaid: !!isActive,
        isPreviousModuleCompleted: true
      };
    }

    return {
      message: "No lessons available",
      statusCode: 404,
      data: [],
      isPaid: false,
      isPreviousModuleCompleted: true
    };
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
        newProgress.user = { id: userId } as User; // Relation orqali yozish
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
  async checkDailyLessonsLimit(userId: ID): Promise<number> {
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

  /**
   * UserCourseProgress ni yangilash (LessonProgress o'zgarishidan keyin)
   * @param userId - Foydalanuvchi ID
   * @param courseId - Kurs ID
   * @param lessonProgress - Yangilangan LessonProgress
   */
  private async updateUserCourseProgress(
    userId: ID,
    courseId: ID,
    lessonProgress: LessonProgress
  ): Promise<void> {
    try {
      // Barcha lesson progresslarni olish (calculation uchun)
      const allLessonProgresses = await this.lessonProgressRepository.findByBlockIdAndUserId(
        lessonProgress.blockId,
        userId
      );

      // UserCourseProgress uchun ma'lumotlarni hisoblash
      const progressData = this.userProgressCalculator.calculateUserCourseProgressData(
        allLessonProgresses,
        lessonProgress.lesson?.id,
        lessonProgress.lessonOrder,
        lessonProgress.blockId,
        'arabic' // Course language (Arabic course)
      );

      // UserCourseProgress upsert
      const upsertResult = await this.userCourseProgressService.upsertFromLessonProgress(
        userId,
        courseId,
        {
          currentLessonId: progressData.currentLessonId,
          currentLessonOrder: progressData.currentLessonOrder,
          currentBlockId: progressData.currentBlockId,
          courseLanguage: progressData.courseLanguage,
        }
      );

      if (upsertResult.statusCode !== 200 && upsertResult.statusCode !== 201) {
        throw new Error(`UserCourseProgress upsert failed: ${upsertResult.message}`);
      }

      this.logger.log(`UserCourseProgress successfully updated for user ${userId}, course ${courseId}`);
    } catch (error) {
      this.logger.error(`updateUserCourseProgress failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Transaction ichida UserCourseProgress ni yangilash
   * @param queryRunner - TypeORM QueryRunner
   * @param userId - Foydalanuvchi ID
   * @param courseId - Kurs ID
   * @param lessonProgress - Yangilangan LessonProgress
   */
  private async updateUserCourseProgressInTransaction(
    queryRunner: any,
    userId: ID,
    courseId: ID,
    lessonProgress: LessonProgress
  ): Promise<void> {
    try {
      // Barcha lesson progresslarni olish (calculation uchun)
      const allLessonProgresses = await queryRunner.manager.find(LessonProgress, {
        where: {
          blockId: lessonProgress.blockId,
          user: { id: userId }
        },
        relations: ['lesson']
      });

      // UserCourseProgress uchun ma'lumotlarni hisoblash
      const progressData = this.userProgressCalculator.calculateUserCourseProgressData(
        allLessonProgresses,
        lessonProgress.lesson?.id,
        lessonProgress.lessonOrder,
        lessonProgress.blockId,
        'arabic' // Course language (Arabic course)
      );

      // Transaction ichida UserCourseProgress upsert
      await this.userCourseProgressService.recalculateAndUpsertInTransaction(
        queryRunner,
        userId,
        courseId,
        allLessonProgresses,
        progressData.currentLessonId,
        progressData.currentLessonOrder,
        progressData.currentBlockId,
        progressData.courseLanguage
      );

      this.logger.log(`UserCourseProgress successfully updated in transaction for user ${userId}, course ${courseId}`);
    } catch (error) {
      this.logger.error(`updateUserCourseProgressInTransaction failed: ${error.message}`, error.stack);
      throw error;
    }
  }
}

// INSERT INTO homeworks (title, video_url, mime_type, size, "order", duration, block_id)
// SELECT
//     'Generated description for homework ' || i,
//     'https://player.vimeo.com/video/1131005257',
//     1024000 + (i * 1000),  -- Fayl hajmini oshib boruvchi qiymat sifatida o'zgartirish
//     i,  -- Order ketma-ketlikda oshib boradi
//     300 + (i * 10),  -- Davomiylik oshib boruvchi qiymat sifatida
//     11  -- block_id
// FROM
//     generate_series(1, 100) AS s(i);
