// src/modules/homework-progress/homework-progress.service.ts
import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { IHomeworkProgressService } from "./interfaces/homework-progress.service";
import { HomeworkProgressRepository } from "./repositories/homework-progress.repository";
import { HomeworkQueueRepository } from "./repositories/homework-queue.repository";
import { ILessonProgressRepository } from "../lesson-progress/interfaces/lesson-progress.repository";
import { ResData } from "src/lib/resData";
import { ID } from "src/common/types/type";
import { HomeworkProgress } from "./entities/homework-progress.entity";
import { HomeworkQueue } from "./entities/homework-queue.entity";
import { SchedulerRegistry } from "@nestjs/schedule";
import { CronJob } from "cron";
import { LessonRepository } from "../lesson/lesson.repository";
import { BlockRepository } from "../block/block.repository";
import { IHomeworkRepository } from "../homework/interfaces/homework.repository";
import { IUserCourseRepository } from "../user-courses/interfaces/user-course.repository";
import { IUserCourseService } from "../user-courses/interfaces/user-course.service";
import { ILessonProgressService } from "../lesson-progress/interfaces/lesson-progress.service";
import { generateVimeoEmbedUrl } from "src/common/utils/helper";

// Nestjs/schedule va cron packagelarini o'rnatish kerak bo'lishi mumkin:
// npm install --save @nestjs/schedule cron

@Injectable()
export class HomeworkProgressService implements IHomeworkProgressService {
  private readonly logger = new Logger(HomeworkProgressService.name);
  constructor(
    @Inject("IHomeworkProgressRepository")
    private readonly homeworkProgressRepository: HomeworkProgressRepository,

    private readonly homeworkQueueRepository: HomeworkQueueRepository,

    @Inject("ILessonProgressRepository")
    private readonly lessonProgressRepository: ILessonProgressRepository,

    @Inject("ILessonProgressService")
    private readonly lessonProgressService: ILessonProgressService,

    private readonly schedulerRegistry: SchedulerRegistry,

    @Inject("ILessonRepository")
    private readonly lessonRepository: LessonRepository,

    @Inject("IBlockRepository")
    private readonly blockRepository: BlockRepository,

    @Inject("IHomeworkRepository")
    private readonly homeworkRepository: IHomeworkRepository,

    @Inject("IUserCourseRepository")
    private readonly userCourseRepository: IUserCourseRepository,

    @Inject("IUserCourseService")
    private readonly userCourseService: IUserCourseService,
  ) {
    // Schedule service initialization
    this.initializeSchedulers();
  }

  // Har 30 minutda yangi uy vazifalarni berish uchun scheduler
  private initializeSchedulers() {
    try {

      const job = new CronJob("*/30 * * * *", () => {
        this.processHomeworkQueue();
      });

      this.schedulerRegistry.addCronJob("homeworkScheduler", job);

      job.start();
    } catch (error) {
      console.error("initializeSchedulers xatolik:", error);
    }
  }

  public runSchedulerManually() {
    return this.processHomeworkQueue();
  }

  private async processHomeworkQueue() {
    try {
      const users = await this.getAllActiveUsers();

      for (const user of users) {
        await this.scheduleHomeworkForUser(user.id, user.courseId);
      }
    } catch (error) {
      console.error("Error processing homework queue:", error);
    }
  }

  private async getAllActiveUsers() {
    try {
      this.logger.log('Aktiv foydalanuvchilarni olish...');

      const lessonProgresses = await this.lessonProgressRepository.findAllWatchedLessonsByUser(null, null);
      const homeworkProgresses = await this.homeworkProgressRepository.findAll();

      const userCourseMap = new Map<string, { id: ID; courseId: ID }>();

      lessonProgresses.forEach(progress => {
        if (progress.userId && progress.courseId) {
          const key = `${progress.userId}_${progress.courseId}`;
          userCourseMap.set(key, { id: progress.userId, courseId: progress.courseId });
        }
      });

      homeworkProgresses.forEach(progress => {
        if (progress.userId && progress.courseId) {
          const key = `${progress.userId}_${progress.courseId}`;
          userCourseMap.set(key, { id: progress.userId, courseId: progress.courseId });
        }
      });

      const activeUsers = Array.from(userCourseMap.values());

      this.logger.log(`Jami ${activeUsers.length} ta noyob foydalanuvchi topildi`);
      return activeUsers;
    } catch (error) {
      this.logger.error(`Aktiv foydalanuvchilarni olishda xatolik: ${error.message}`, error.stack);
      return [];
    }
  }

  // Foydalanuvchi uchun yangi uy vazifa jadvallash
  private async scheduleHomeworkForUser(userId: ID, courseId: ID) {


    // findByDate orqali obuna muddatini tekshirish va isActive ni yangilash
    const now = new Date();
    const { data: subscriptionStatus } = await this.userCourseService.findByDate(
      Number(userId),
      now,
      Number(courseId),
    );

    // 1) Kurs holatini o‘qish
    const userCourse = await this.userCourseRepository.findByUserIdAndCourseId(userId, courseId);
    if (!userCourse) return;

    // hasEverPaid false va ko'rilgan darslar >= 29 bo'lsa, sekinlashtirilgan rejim
    let isSlowMode = false;
    let isWatchedFreeLessons = false;
    let isHasEverPaid = false;

    const watchedLessons = await this.lessonProgressRepository.findAllWatchedLessonsByUser(userId, courseId);
    if (watchedLessons && watchedLessons.length >= 29) {
      isWatchedFreeLessons = true;
    }

    if (subscriptionStatus.hasEverPaid) {
      isHasEverPaid = true;
    }

    if (isHasEverPaid && !subscriptionStatus.isActive) {
      isSlowMode = true;
    }

    if (!isHasEverPaid && isWatchedFreeLessons) {
      isSlowMode = true;
    }

    // Agar sekinlashtirilgan rejimda bo'lsa — queue'da hali scheduledAt vaqti kelmagan homework bormi tekshirish
    // Bor bo'lsa, yangi qo'shmaymiz (5 soatlik interval saqlanadi)
    if (isSlowMode) {
      const queuedItems = await this.homeworkQueueRepository.findByUserIdAndCourseId(userId, courseId);

      const hasPendingScheduled = queuedItems.some(
        item => item.scheduledAt && new Date(item.scheduledAt) > now
      );

      if (hasPendingScheduled) {
        this.logger.log(
          `User ${userId} sekinlashtirilgan rejimda va hali kutilayotgan vazifa bor, o'tkazildi`
        );
        return;
      }
    }

    // agar navbatdagi vazifalar soni 20 dan ortiq bo‘lsa, qo‘shishni o‘tkazmaymiz
    const pendingCount = await this.homeworkQueueRepository.countPendingHomeworksByUser(userId);
    if (pendingCount >= 20) {
      return new ResData("Queue to‘la", 400);
    }

    // 3) Tavsiya oling
    const recommendations = await this.getHomeworkRecommendations(userId, courseId);
    if (!recommendations.length) return;

    // 4) Recommendation ob’ekti
    const candidate = recommendations[0];

    // 5) Intervalni hisoblash (findByDate natijasiga asosan)
    let delayMinutes = 30; // default - aktiv obuna uchun har 30 daqiqada

    // Agar sekinlashtirilgan rejimda bo'lsa - 5 soatda yuborish
    if (isSlowMode) {
      delayMinutes = 5 * 60; // 300 minut = 5 soat
      this.logger.log(`User ${userId} sekinlashtirilgan rejimda, 5 soatlik interval qo'llanildi`);
    }

    // 6) Keyingi yuborish vaqtini tayyorlash
    const nextTime = new Date(Date.now() + delayMinutes * 60 * 1000);

    // 7) Navbatga yozish (HomeworkQueueRepository.addToQueue blockOrder va homeworkOrder ni o‘zi to‘ldiradi)
    await this.homeworkQueueRepository.addToQueue({
      userId: candidate.userId,
      homeworkId: candidate.homeworkId,
      courseId: candidate.courseId,
      priority: candidate.priority,
      isScheduled: true,
      scheduledAt: nextTime,
    });

    this.logger.log(
      `Scheduled homework ${candidate.homeworkId} for user ${userId} at ${nextTime.toISOString()}`
    );
  }

  /**
   * Dars ko'rilganda darhol o'sha darsning uyga vazifasini yuborish
   * 
   * @param userId - Foydalanuvchi ID si
   * @param lessonId - Dars ID si
   * @returns Yuborilgan uyga vazifa ma'lumotlari
   */
  async scheduleHomeworkForLesson(userId: ID, courseId: ID, blockOrder: number, lessonOrder: number): Promise<ResData<any>> {
    try {
      // Dars uchun uyga vazifa topish

      const homework = await this.findHomeworkByLessonId(courseId, blockOrder, lessonOrder);

      if (!homework) {
        return new ResData("Dars uchun uyga vazifa topilmadi", 404, null);
      }

      // Uyga vazifa allaqachon rejalashtirilganligini tekshirish
      const existingQueues = await this.homeworkQueueRepository.findScheduledHomeworksByUser(userId);
      const existingQueue = existingQueues.find(q => q.homeworkId === homework.id);

      if (existingQueue) {
        return new ResData("Uyga vazifa allaqachon rejalashtirilgan", 200, existingQueue);
      }

      // Yangi uyga vazifa rejasini yaratish
      const queueItem = await this.homeworkQueueRepository.addToQueue({
        userId,
        homeworkId: homework.id,
        courseId,
        isScheduled: true,
        scheduledAt: new Date(), // Darhol yuborish uchun hozirgi vaqt
        priority: 200 // Eng yuqori prioritet
      });

      // Uyga vazifani darhol yuborish uchun getUserHomeworkVideos metodini chaqiramiz
      await this.getUserHomeworkVideos(userId, courseId);

      return new ResData("Uyga vazifa muvaffaqiyatli rejalashtirildi", 200, queueItem);
    } catch (error) {
      console.error(`Dars uchun uyga vazifani rejalashtirish xatoligi:`, error);
      return new ResData("Uyga vazifani rejalashtirish xatoligi", 500, null);
    }
  }

  // Joriy modulni aniqlash
  private async getCurrentUserModule(userId: ID, courseId: ID): Promise<number> {
    try {
      const watchedLessons = await this.lessonProgressRepository.findAllWatchedLessonsByUser(userId, courseId);

      if (!watchedLessons || watchedLessons.length === 0) {
        return 1; // Default module order
      }

      const sortedLessons = [...watchedLessons].sort((a, b) =>
        new Date(b.lastUpdatedAt).getTime() - new Date(a.lastUpdatedAt).getTime());

      const latestLesson = sortedLessons[0];

      if (latestLesson?.lesson?.block?.order) {
        return latestLesson.lesson.block.order; // module order
      }

      return 1; // Default module order
    } catch (error) {
      console.error(`Error getting current module order for user ${userId}:`, error);
      return 1;
    }
  }


  // Tavsiya berilishi mumkin bo'lgan modullarni aniqlash
  private getEligibleModules(currentModuleOrder: number): number[] {
    const modules = [currentModuleOrder]; // Joriy modul

    // Oldingi 2 ta modul
    for (let i = 1; i <= 2; i++) {
      if (currentModuleOrder - i > 0) {
        modules.push(currentModuleOrder - i);
      }
    }

    return modules;
  }

  // Uy vazifalarni tavsiya qilish
  // HomeworkProgressService class ichida
  // private async getHomeworkRecommendations(
  //   userId: ID,
  //   courseId: ID,
  // ): Promise<
  //   Array<{
  //     userId: ID;
  //     homeworkId: ID;
  //     priority: number;
  //     courseId: ID;
  //   }>
  // > {
  //   try {
  //     const watchedLessons = await this.lessonProgressRepository.findAllWatchedLessonsByUser(userId, courseId);
  //     if (!watchedLessons || watchedLessons.length === 0) {
  //       this.logger.log(`User ${userId} uchun ko'rilgan darslar topilmadi`);
  //       return [];
  //     }

  //     const allHomeworkProgresses = await this.homeworkProgressRepository.findByUserId(userId);

  //     const homeworkBlocks = await this.blockRepository.getBlocksHomeworksByCourseId(courseId);
  //     if (!homeworkBlocks || homeworkBlocks.length === 0) {
  //       this.logger.warn(`Kurs ${courseId} uchun homework blocklar topilmadi`);
  //       return [];
  //     }

  //     const recommendationCandidates = [];

  //     for (const lessonProgress of watchedLessons) {
  //       const lesson = lessonProgress.lesson;
  //       const lessonOrder = lesson?.order;
  //       const lessonBlockOrder = lesson?.block?.order;

  //       if (!lessonOrder || !lessonBlockOrder) continue;

  //       const targetHomeworkBlock = homeworkBlocks.find(block => block.order === lessonBlockOrder);
  //       if (!targetHomeworkBlock) continue;

  //       const homeworks = await this.homeworkRepository.findHomeworksByBlockId(targetHomeworkBlock.id);
  //       if (!homeworks || homeworks.length === 0) continue;

  //       const matchedHomework = homeworks.find(hw => hw.order === lessonOrder);
  //       if (!matchedHomework) continue;

  //       const existingProgress = allHomeworkProgresses.find(
  //         progress => progress.homework?.id === matchedHomework.id
  //       );
  //       if (existingProgress && existingProgress.countWatched >= 10) continue;

  //       const existingQueue = await this.homeworkQueueRepository.findByUserIdAndHomeworkId(
  //         userId,
  //         matchedHomework.id
  //       );
  //       if (existingQueue) continue;

  //       recommendationCandidates.push({
  //         userId,
  //         homeworkId: matchedHomework.id,
  //         priority: 100,
  //         courseId
  //       });
  //     }

  //     if (recommendationCandidates.length === 0) {
  //       this.logger.log(`No homework recommendations found for user ${userId}`);
  //       return [];
  //     }

  //     // Randomdan bitta tanlaymiz
  //     const randomIndex = Math.floor(Math.random() * recommendationCandidates.length);
  //     return [recommendationCandidates[randomIndex]];
  //   } catch (error) {
  //     this.logger.error(`Error getting homework recommendations: ${error.message}`, error.stack);
  //     return [];
  //   }
  // }

  private async getHomeworkRecommendations(
    userId: ID,
    courseId: ID,
  ): Promise<
    Array<{
      userId: ID;
      homeworkId: ID;
      priority: number;
      courseId: ID;
    }>
  > {
    try {
      this.logger.log(`userId: ${userId}, courseId: ${courseId}`);

      // Homework progresslarini shu kurs bo‘yicha olish
      const allHomeworkProgresses = await this.homeworkProgressRepository.findByUserIdAndCourseId(userId, courseId);
      this.logger.log(`allHomeworkProgresses.length: ${allHomeworkProgresses.length}`);

      const courseProgresses = allHomeworkProgresses.filter(
        (p) => p.isWatched && p.countWatched < 10 && p.homework
      );
      this.logger.log(`courseProgresses.length: ${courseProgresses.length}`);

      if (!courseProgresses.length) {
        this.logger.log(`User ${userId} uchun homeworkProgress topilmadi (kurs ${courseId})`);
        return [];
      }

      // Queue’ni faqat shu kurs bo‘yicha olish
      const queuedItems = await this.homeworkQueueRepository.findByUserIdAndCourseId(userId, courseId);
      const queuedHomeworkIds = new Set(queuedItems.map((q) => q.homeworkId));

      const recommendations = [];

      for (const progress of courseProgresses) {
        const homework = progress.homework;
        if (!homework || queuedHomeworkIds.has(homework.id)) continue;

        recommendations.push({
          userId,
          homeworkId: homework.id,
          priority: 100,
          courseId,
        });
      }

      if (recommendations.length === 0) {
        this.logger.log(`No homework recommendations found for user ${userId}`);
        return [];
      }

      const randomIndex = Math.floor(Math.random() * recommendations.length);
      return [recommendations[randomIndex]];

    } catch (error) {
      this.logger.error(
        `Error getting homework recommendations for user ${userId}, course ${courseId}: ${error.message}`,
        error.stack
      );
      return [];
    }
  }




  // Darsga mos keladigan uy vazifani topish
  private async findHomeworkByLessonId(courseId: ID, blockOrder: number, lessonOrder: number) {
    try {
      // Kurs bo'yicha HOMEWORK kategoriyasidagi bloklarni olish
      const homeworkBlocks = await this.blockRepository.getBlocksHomeworksByCourseId(courseId);
      if (!homeworkBlocks || homeworkBlocks.length === 0) {
        this.logger.warn(`No homework blocks found for course ${courseId}`);
        return null;
      }

      // Kerakli tartib raqamli blokni topish
      const targetBlock = homeworkBlocks.find(block => block.order === blockOrder);
      if (!targetBlock) {
        this.logger.warn(`No homework block found with order ${blockOrder} in course ${courseId}`);
        return null;
      }

      // Blok ID orqali uy vazifalarni olish
      const homeworks = await this.homeworkRepository.findHomeworksByBlockId(targetBlock.id);
      if (!homeworks || homeworks.length === 0) {
        this.logger.warn(`No homeworks found for block ID ${targetBlock.id}`);
        return null;
      }

      // Dars tartib raqami bilan bir xil uy vazifani topish
      // Uy vazifa tartib raqami dars tartib raqamiga teng bo'lishi kerak
      const homework = homeworks.find(hw => hw.order === lessonOrder);

      if (!homework) {
        this.logger.warn(`No homework found with order=${lessonOrder} in block ID ${targetBlock.id}`);
        return null;
      }

      return homework;
    } catch (error) {
      this.logger.error(`Error finding homework for lesson: ${error.message}`, error.stack);
      return null;
    }
  }

  /**
   * Barcha HomeworkProgress yozuvlarini qaytaradi
   */
  async findAll(): Promise<ResData<Array<HomeworkProgress>>> {
    try {
      // HomeworkProgressRepository da findAll metodi mavjud
      const homeworkProgresses = await this.homeworkProgressRepository.findAll();
      return new ResData('All homework progresses retrieved successfully', 200, homeworkProgresses);
    } catch (error) {
      console.error('Error finding all homework progresses:', error);
      return new ResData('Failed to retrieve homework progresses', 500, []);
    }
  }

  // ID bo'yicha HomeworkProgress yozuvini topadi
  async findOneById(id: ID): Promise<ResData<HomeworkProgress>> {
    try {
      // HomeworkProgressRepository da findById metodi mavjud
      const homeworkProgress = await this.homeworkProgressRepository.findById(id);
      if (!homeworkProgress) {
        return new ResData('Homework progress not found', 404, null);
      }
      return new ResData('Homework progress retrieved successfully', 200, homeworkProgress);
    } catch (error) {
      console.error(`Error finding homework progress with ID ${id}:`, error);
      return new ResData('Failed to retrieve homework progress', 500, null);
    }
  }

  // Foydalanuvchi ID bo'yicha barcha HomeworkProgress yozuvlarini qaytaradi
  async findByUserId(id: ID): Promise<ResData<Array<HomeworkProgress>>> {
    try {
      // HomeworkProgressRepository da findByUserId metodi mavjud
      const homeworkProgresses = await this.homeworkProgressRepository.findByUserId(id);
      return new ResData('User homework progresses retrieved successfully', 200, homeworkProgresses);
    } catch (error) {
      console.error(`Error finding homework progresses for user ${id}:`, error);
      return new ResData('Failed to retrieve user homework progresses', 500, []);
    }
  }

  async update(id: ID): Promise<ResData<HomeworkProgress>> {
    try {
      const queueItem = await this.homeworkQueueRepository.findById(id);
      if (!queueItem) {
        this.logger.error(`Homework queue item not found: queueId=${id}`);
        throw new NotFoundException('Homework queue item not found');
      }

      const userId = queueItem.userId;
      const courseId = queueItem.courseId;

      if (!courseId) {
        this.logger.error(`Course ID not found in queue item: queueId=${id}`);
        throw new BadRequestException('Course ID not found in queue item');
      }

      // 1. HomeworkProgress yaratish yoki yangilash
      let homeworkProgress = await this.homeworkProgressRepository.findOneByUserAndHomework(
        userId,
        queueItem.homeworkId
      );

      if (!homeworkProgress) {
        const newProgress = new HomeworkProgress();
        newProgress.userId = userId;
        newProgress.homework = queueItem.homework;
        newProgress.blockId = queueItem.homework?.blockId || 0;
        newProgress.blockOrder = queueItem.blockOrder || queueItem.homework?.block?.order || 0;
        newProgress.homeworkOrder = queueItem.homeworkOrder || queueItem.homework?.order || 0;
        newProgress.courseId = courseId || queueItem.homework?.block?.course?.id || 0;
        newProgress.isWatched = true;
        newProgress.countWatched = 1;

        homeworkProgress = await this.homeworkProgressRepository.create(newProgress);
      } else {
        homeworkProgress.isWatched = true;
        homeworkProgress.countWatched += 1;
        homeworkProgress = await this.homeworkProgressRepository.update(homeworkProgress);
      }

      // 2. Queue'dan o‘chirish
      if (queueItem.id) {
        const deleteResult = await this.homeworkQueueRepository.removeFromQueue(queueItem.id);
        if ((deleteResult as any)?.affected === 0) {
          this.logger.warn(`Queue item with ID ${queueItem.id} was not removed`);
        } else {
          this.logger.log(`Queue item with ID ${queueItem.id} successfully removed`);
        }
      }

      // 3. Queue tozalanganmi?
      const remainingQueueItems = await this.homeworkQueueRepository.findByUserIdAndCourseId(userId, courseId);
      const isQueueEmpty = !remainingQueueItems || remainingQueueItems.length === 0;



      // if (isQueueEmpty && dailyWatchedCount < 10) {
      // // 4. Eng so‘nggi homework progressni aniqlaymiz
      // const allProgresses = await this.homeworkProgressRepository.findByUserId(userId);
      // const sorted = allProgresses
      //   .filter(p => p.courseId === courseId)
      //   .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      // const latest = sorted[0];

      // if (!latest) {
      //   this.logger.warn("📭 No latest homework progress found");
      // } else {
      //   // 5. Hozirgi lessonProgress mavjudmi?
      //   const currentLessonProgress = await this.lessonProgressRepository.getLessonProgress(
      //     latest.homeworkOrder,
      //     userId,
      //     latest.blockOrder,
      //     courseId
      //   );

      //   if (currentLessonProgress) {
      //     // 6. Keyingi lessonProgress topiladi
      //     const nextLessonProgress = await this.lessonProgressRepository.getLessonProgress(
      //       latest.homeworkOrder + 1,
      //       userId,
      //       latest.blockOrder,
      //       courseId
      //     );

      //     if (nextLessonProgress && !nextLessonProgress.isUnlocked) {
      //       nextLessonProgress.isUnlocked = true;
      //       await this.lessonProgressRepository.update(nextLessonProgress);
      //       this.logger.log(`✅ Queue bo‘shadi va oxirgi homework asosida keyingi dars (order ${nextLessonProgress.lessonOrder}) ochildi`);
      //     } else {
      //       this.logger.log("⏩ Keyingi dars allaqachon ochilgan yoki mavjud emas");
      //     }
      //   } else {
      //     this.logger.warn("❌ LessonProgress topilmadi, shuning uchun keyingi dars ochilmadi");
      //   }
      // }
      // } else {
      //   this.logger.log("🚫 Queue to‘liq bo‘sh emas, keyingi dars ochilmadi");
      // }


      if (isQueueEmpty) {
        const dailyWatchedCount = await this.lessonProgressService.checkDailyLessonsLimit(userId);
        // if (dailyWatchedCount < 10) {
        //   // 4. Eng so‘nggi watched + unlocked lessonProgress dan keyingisini ochamiz
        //   const lastLessonOrder =
        //     await this.lessonProgressRepository.findLastUnlockedAndWatchedLessonOrder(userId, courseId, queueItem.blockOrder);

        //   if (lastLessonOrder === null) {
        //     this.logger.warn("📭 Foydalanuvchi uchun hech qanday watched & unlocked dars topilmadi");
        //   } else {
        //     const nextLessonProgress = await this.lessonProgressRepository.getLessonProgress(
        //       lastLessonOrder + 1,
        //       userId,
        //       queueItem.blockOrder,
        //       courseId
        //     );

        //     if (nextLessonProgress && !nextLessonProgress.isUnlocked) {
        //       nextLessonProgress.isUnlocked = true;
        //       await this.lessonProgressRepository.update(nextLessonProgress);
        //       this.logger.log(
        //         `✅ Queue bo‘shadi va watched dars asosida keyingi dars (lessonOrder ${nextLessonProgress.lessonOrder}) ochildi`
        //       );
        //     } else {
        //       this.logger.log("⏩ Keyingi dars allaqachon ochilgan yoki mavjud emas");
        //     }
        //   }
        // } else {
        //   this.logger.log(`🚫 Kunlik limit tugagan (${dailyWatchedCount}/10), keyingi dars ertaga ochiladi`);
        // }
      } else {
        this.logger.log("🚫 Queue to‘liq bo‘sh emas, keyingi dars ochilmadi");
      }


      return new ResData(
        "Homework progress successfully updated",
        200,
        homeworkProgress,
        null,
        { isQueueEmpty } // Queue bo'shligini metadata sifatida yuboramiz
      );
    } catch (error) {
      this.logger.error(`Error updating homework progress: ${error.message}`, error.stack);
      throw error;
    }
  }

  async delete(id: ID): Promise<ResData<HomeworkProgress>> {
    try {
      const homeworkProgress = await this.homeworkProgressRepository.findById(id);
      if (!homeworkProgress) {
        return new ResData('Homework progress not found', 404, null);
      }

      // HomeworkProgressRepository delete metodi entity qabul qiladi
      const deletedProgress = await this.homeworkProgressRepository.delete(homeworkProgress);

      return new ResData('Homework progress deleted successfully', 200, deletedProgress);
    } catch (error) {
      console.error(`Error deleting homework progress with ID ${id}:`, error);
      return new ResData('Failed to delete homework progress', 500, null);
    }
  }

  // Foydalanuvchiga ko'rsatiladigan uy vazifalarni olish
  // Oxirgi ko'rilgan darsga tegishli uy vazifani va random tarzda oldingi uy vazifalarni qaytaradi
  async getUserHomeworkVideos(userId: ID, courseId: ID): Promise<ResData<Array<Partial<HomeworkProgress>>>> {
    try {
      // Homework queue jadvalidan foydalanuvchining navbatdagi videolarini olish
      const queueItems = await this.homeworkQueueRepository.findByUserIdAndCourseId(userId, courseId);
      if (!queueItems || queueItems.length === 0) {
        // Agar queue bo'sh bo'lsa, foydalanuvchi uchun uy vazifa videolar yo'q degan xabarni qaytarish
        return new ResData("Foydalanuvchi uchun uy vazifa videolar yo'q", 404, []);
      }

      // Faqat scheduledAt vaqti kelgan homeworklarni filtrlash
      const now = new Date();
      const readyHomeworks = queueItems.filter(item =>
        !item.scheduledAt || new Date(item.scheduledAt) <= now
      );

      if (!readyHomeworks || readyHomeworks.length === 0) {
        // Agar vaqti kelgan homework bo'lmasa
        return new ResData("Foydalanuvchi uchun uy vazifa videolar yo'q", 404, []);
      }

      // Navbatdagi videolarni formatlash
      const formattedVideos = readyHomeworks.map(item => this.formatHomeworkQueueItem(item));


      // Agar videolar orasida 1-moduldan boshqa modul yoki 30-darsdan keyin darslar bo'lsa, to'lov tekshirish
      // const hasLessonsBeyondFree = formattedVideos.some(video =>
      //   (video.blockOrder && video.blockOrder > 1) ||
      //   (video.blockOrder === 1 && video.homeworkOrder && video.homeworkOrder > 30)
      // );

      // if (hasLessonsBeyondFree && queueItems.length > 0) {
      //   // Foydalanuvchi to'lov qilgan-qilmaganini tekshirish
      //   // courseId ni to'g'ridan-to'g'ri queueItems dan olish
      //   const courseId = queueItems[0].courseId;
      //   if (!courseId) {
      //     this.logger.error('Course ID not found in homework progress');
      //     return new ResData("Kurs ma'lumotlari topilmadi", 500, []);
      //   }

      //   const userCourse = await this.userCourseRepository.findByUserIdAndCourseId(userId, courseId);
      //   const isActive = userCourse && userCourse.isActive;

      //   if (!isActive) {
      //     // Agar to'lov qilinmagan bo'lsa
      //     if (formattedVideos.some(video => video.blockOrder && video.blockOrder > 1)) {
      //       return new ResData(
      //         "To access lessons beyond module 1, you need to purchase this course.",
      //         403,
      //         []
      //       );
      //     }

      //     if (formattedVideos.some(video => video.blockOrder === 1 && video.homeworkOrder && video.homeworkOrder > 20)) {
      //       return new ResData(
      //         "To access lessons beyond lesson 20 in module 1, you need to purchase this course.",
      //         403,
      //         []
      //       );
      //     }
      //   }
      // }

      return new ResData("Foydalanuvchi uy vazifa videolari muvaffaqiyatli olindi", 200, formattedVideos);
    } catch (error) {
      this.logger.error(`Error getting user homework videos: ${error.message}`, error.stack);
      return new ResData("Foydalanuvchi uy vazifa videolarini olishda xatolik yuz berdi", 500, []);
    }
  }

  // HomeworkQueue elementini HomeworkProgress formatiga o'zgartirish
  private formatHomeworkQueueItem(queueItem: HomeworkQueue): Partial<HomeworkProgress> {
    return {
      id: queueItem.id,
      homework: queueItem.homework ? {
        id: queueItem.homeworkId,
        videoUrl: queueItem.homework.videoUrl,
        vimeoVideoId: queueItem.homework.vimeoVideoId, // Vimeo video ID
        vimeoEmbedUrl: queueItem.homework.videoUrl ? generateVimeoEmbedUrl(queueItem.homework.videoUrl) : null,
        duration: queueItem.homework.duration,
        title: queueItem.homework.title,
      } as any : null,
      blockId: queueItem.homework?.blockId, // Use homework's blockId instead of moduleId
      blockOrder: queueItem.blockOrder,
      homeworkOrder: queueItem.homeworkOrder,
      courseId: queueItem.courseId,
      userId: queueItem.userId,
      isWatched: false, // Navbatdagi videolar hali ko'rilmagan
      createdAt: queueItem.createdAt,
      lastUpdatedAt: queueItem.lastUpdatedAt
    };
  }

  // Foydalanuvchi ID si bo'yicha uyga vazifa navbatidagi elementlar sonini qaytaradi
  async countQueueItems(userId: ID, courseId: ID): Promise<ResData<{ count: number }>> {
    try {
      const count = await this.homeworkQueueRepository.countQueueItemsByUserId(userId, courseId);
      return new ResData("Foydalanuvchi uchun uyga vazifa navbatidagi elementlar soni", 200, { count });
    } catch (error) {
      this.logger.error(`Error counting queue items for user ${userId}: ${error.message}`, error.stack);
      return new ResData("Uyga vazifa navbatidagi elementlar sonini olishda xatolik yuz berdi", 500, { count: 0 });
    }
  }

  // Foydalanuvchi ID si bo'yicha barcha kurslar uchun uyga vazifa navbatidagi elementlar sonini qaytaradi
  async countAllQueueItems(userId: ID): Promise<ResData<Array<{ courseTitle: string; count: number }>>> {
    try {
      const courseCounts = await this.homeworkQueueRepository.countQueueItemsGroupedByCourse(userId);
      return new ResData("Foydalanuvchi uchun har bir kursdagi uyga vazifa navbatidagi elementlar soni", 200, courseCounts);
    } catch (error) {
      this.logger.error(`Error counting all queue items for user ${userId}: ${error.message}`, error.stack);
      return new ResData("Barcha kurslardagi uyga vazifa navbatidagi elementlar sonini olishda xatolik yuz berdi", 500, []);
    }
  }
}