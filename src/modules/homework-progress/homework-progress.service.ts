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

    private readonly schedulerRegistry: SchedulerRegistry,

    @Inject("ILessonRepository")
    private readonly lessonRepository: LessonRepository,

    @Inject("IBlockRepository")
    private readonly blockRepository: BlockRepository,

    @Inject("IHomeworkRepository")
    private readonly homeworkRepository: IHomeworkRepository,

    @Inject("IUserCourseRepository")
    private readonly userCourseRepository: IUserCourseRepository,
  ) {
    // Schedule service initialization
    this.initializeSchedulers();
  }

  // Har 30 minutda yangi uy vazifalarni berish uchun scheduler
  private initializeSchedulers() {
    try {
      const job = new CronJob("*/60 * * * *", () => {
        this.processHomeworkQueue();
      });

      this.schedulerRegistry.addCronJob("homeworkScheduler", job);
      job.start();
    } catch (error) {
      console.error("Error initializing homework scheduler:", error);
    }
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

      // Oxirgi 30 kunda dars ko'rilganda foydalanuvchilarni olish
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Lesson progress bo'yicha aktiv foydalanuvchilarni olish
      const lessonProgresses = await this.lessonProgressRepository.findAllWatchedLessonsByUser(null, null);

      // Homework progress bo'yicha aktiv foydalanuvchilarni olish
      const homeworkProgresses = await this.homeworkProgressRepository.findAll();

      // Foydalanuvchi ID larini yig'ish
      const userIds = new Set<ID>();

      // Lesson progresslardan foydalanuvchilarni olish
      lessonProgresses.forEach(progress => {
        if (progress.userId) {
          userIds.add(progress.userId);
        }
      });

      // Homework progresslardan foydalanuvchilarni olish
      homeworkProgresses.forEach(progress => {
        if (progress.userId) {
          userIds.add(progress.userId);
        }
      });

      // Foydalanuvchilar ro'yxatini yaratish
      const activeUsers = homeworkProgresses.map(progress => ({
        id: progress.userId,
        courseId: progress.courseId
      }));

      this.logger.log(`Jami ${activeUsers.length} ta aktiv foydalanuvchi topildi`);
      return activeUsers;
    } catch (error) {
      this.logger.error(`Aktiv foydalanuvchilarni olishda xatolik: ${error.message}`, error.stack);
      return [];
    }
  }

  // Foydalanuvchi uchun yangi uy vazifa jadvallash
  private async scheduleHomeworkForUser(userId: ID, courseId: ID) {
    // Ochilmagan uy vazifa sonini tekshirish
    const pendingCount = await this.homeworkQueueRepository.countPendingHomeworksByUser(userId);
    if (pendingCount >= 20) {
      return; // Limit oshgan
    }

    // Joriy modul va unga mos keladigan modullardan uy vazifalarni topish
    const currentModule = await this.getCurrentUserModule(userId, courseId);
    const eligibleModules = this.getEligibleModules(currentModule);

    // Uy vazifalarni tavsiya qilish
    const recommendations = await this.getHomeworkRecommendations(userId, courseId, eligibleModules);
    if (!recommendations.length) {
      return;
    }

    // Keyingi uy vazifani jadvalga qo'shish
    const nextDeliveryTime = new Date();
    nextDeliveryTime.setMinutes(nextDeliveryTime.getMinutes() + 60);

    // HomeworkQueue obyektidan ID olish
    if (!recommendations.length) {
      console.error('No recommendations found');
      return;
    }

    // Birinchi tavsiya qilingan uy vazifani olish
    const queueItem = recommendations[0] as any;
    // TypeORM entity'lari ID sifatida _id yoki id ishlatishi mumkin
    const queueItemId = queueItem?._id || queueItem?.id;
    if (!queueItemId) {
      console.error('Queue item has no valid ID');
      return;
    }

    await this.homeworkQueueRepository.scheduleHomework(
      queueItemId,
      nextDeliveryTime
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
      console.log(homework)

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
    // Joriy modulni aniqlash (lesson-progress repositoriydan olinishi kerak)
    try {
      // LessonProgressRepository orqali barcha ko'rilgan darslarni olish
      const watchedLessons = await this.lessonProgressRepository.findAllWatchedLessonsByUser(userId, courseId);

      if (!watchedLessons || watchedLessons.length === 0) {
        return 1; // Default module if no lessons watched
      }

      // Eng so'nggi ko'rilgan darsni olish (lastUpdatedAt bo'yicha tartiblash)
      const sortedLessons = [...watchedLessons].sort((a, b) =>
        new Date(b.lastUpdatedAt).getTime() - new Date(a.lastUpdatedAt).getTime());
      const latestLesson = sortedLessons[0];

      // Module ID-ni olish
      if (latestLesson?.lesson?.block?.id) {
        return latestLesson.lesson.block.id; // module ID-ni to'g'ri olish
      }

      return 1; // Default module
    } catch (error) {
      console.error(`Error getting current module for user ${userId}:`, error);
      return 1; // Default module on error
    }
  }

  // Tavsiya berilishi mumkin bo'lgan modullarni aniqlash
  private getEligibleModules(currentModule: number): number[] {
    const modules = [currentModule]; // Joriy modul

    // Oldingi 2 ta modul
    for (let i = 1; i <= 2; i++) {
      if (currentModule - i > 0) {
        modules.push(currentModule - i);
      }
    }

    return modules;
  }

  // Uy vazifalarni tavsiya qilish
  private async getHomeworkRecommendations(
    userId: ID,
    courseId: ID,
    moduleIds: number[]
  ): Promise<HomeworkQueue[]> {
    try {
      // Dars ko'rilgan darslarni olish
      const watchedLessons = await this.lessonProgressRepository.findAllWatchedLessonsByUser(userId, courseId);
      if (!watchedLessons || watchedLessons.length === 0) {
        this.logger.log(`No watched lessons found for user ${userId}`);
        return [];
      }

      // Foydalanuvchining barcha homework progresslarini olish (mavjud metoddan foydalanib)
      const allHomeworkProgresses = await this.homeworkProgressRepository.findByUserId(userId);

      // Eng oxirgi ko'rilgan darsni topish
      let latestWatchedLesson = null;
      if (watchedLessons.length > 0) {
        latestWatchedLesson = watchedLessons.reduce((latest, current) => {
          const currentDate = current.lastUpdatedAt || current.createdAt;
          const latestDate = latest?.lastUpdatedAt || latest?.createdAt;

          if (!latest || (currentDate && latestDate && currentDate > latestDate)) {
            return current;
          }
          return latest;
        }, null);
      }

      // Tavsiya qilinadigan uy vazifalarni saqlash uchun array
      const recommendationCandidates = [];

      // Har bir ko'rilgan dars uchun uy vazifalar topish
      for (const lessonProgress of watchedLessons) {
        const lessonId = lessonProgress?.lesson?.id;
        // Agar lessonId mavjud bo'lmasa, keyingisiga o'tish
        if (!lessonId) continue;

        const moduleId = lessonProgress?.lesson?.block?.id;
        const courseId = lessonProgress?.lesson?.block?.course?.id;

        // Darsga tegishli uy vazifalarni topish
        // Haqiqiy metodga moslashish - repository interfaceni tekshirib ko'ring
        const homeworks = await this.homeworkRepository.findHomeworksByBlockId(moduleId);
        if (!homeworks || homeworks.length === 0) continue;

        for (const homework of homeworks) {
          // Uy vazifa allaqachon progress jadvalida bor-yo'qligini tekshirish
          const existingProgress = allHomeworkProgresses.find(
            progress => (progress.homework?.id === homework.id)
          );

          // Agar uy vazifa allaqachon ko'rilgan bo'lsa yoki countWatched >= 10 bo'lsa, o'tkazib yuborish
          if (existingProgress && existingProgress.countWatched >= 10) {
            continue;
          }

          // Modul prioriteti - moduleIds bilan solishtirish
          let modulePriority = 0;
          if (moduleId && moduleIds.includes(moduleId)) {
            modulePriority = 100; // Joriy modul uchun eng yuqori prioritet
          } else if (moduleId) {
            // Modullar soni bo'yicha prioritet hisoblash
            const moduleLessons = watchedLessons.filter(l => l.lesson?.block?.id === moduleId);
            modulePriority = moduleLessons.length * 10;
          }

          // Ko'rish soni prioriteti - qancha kam ko'rilgan bo'lsa, shuncha yuqori
          const watchCount = existingProgress ? existingProgress.countWatched : 0;
          const watchCountPriority = 100 - (watchCount * 10); // 0 dan 100 gacha

          // Eng oxirgi ko'rilgan dars uchun qo'shimcha prioritet
          let latestLessonPriority = 0;
          if (latestWatchedLesson && latestWatchedLesson.lesson?.id === lessonId) {
            latestLessonPriority = 200; // Eng oxirgi ko'rilgan darsning uyga vazifasiga eng yuqori prioritet
          }

          // Candidate qo'shish
          recommendationCandidates.push({
            userId,
            homeworkId: homework.id,
            priority: modulePriority + watchCountPriority + latestLessonPriority,
            homework,
            courseId: courseId || homework.block?.course?.id || (homework.block && homework.block.course.id) || 0
          });
        }
      }

      // Agar kandidatlar bo'lmasa, bo'sh massiv qaytarish
      if (recommendationCandidates.length === 0) {
        this.logger.log(`No homework recommendations found for user ${userId}`);
        return [];
      }

      // Prioritet bo'yicha saralash - lekin eng oxirgi ko'rilgan darsning prioritetini hisobga olmaslik
      // Buning uchun vaqtinchalik prioritetni hisoblash
      const sortedCandidates = recommendationCandidates.map(c => ({
        ...c,
        tempPriority: c.priority > 200 ? c.priority - 200 : c.priority // Eng oxirgi darsning qo'shimcha prioritetini olib tashlash
      })).sort((a, b) => b.tempPriority - a.tempPriority);

      // Eng yuqori prioritetli uy vazifani olish
      let selectedCandidates = [];

      // Tasodifiy tanlash uchun eng yuqori 5 ta prioritetli kandidatlarni olish
      const topCandidates = sortedCandidates.slice(0, Math.min(5, sortedCandidates.length));

      // Tasodifiy indeks tanlash
      const randomIndex = Math.floor(Math.random() * topCandidates.length);

      // Tasodifiy kandidatni olish
      selectedCandidates = [topCandidates[randomIndex]];

      // Navbatga qo'shish
      const recommendations = [];
      for (const candidate of selectedCandidates) {
        // Uy vazifa allaqachon navbatda borligini tekshirish
        const existingQueueItem = await this.homeworkQueueRepository.findByUserIdAndHomeworkId(
          userId,
          candidate.homeworkId
        );

        if (!existingQueueItem) {
          // courseId mavjudligini tekshirish
          if (!candidate.courseId) {
            this.logger.error('Course ID not found in homework progress');
            return [];
          }

          try {
            const queueItem = await this.homeworkQueueRepository.addToQueue({
              userId,
              homeworkId: candidate.homeworkId,
              priority: candidate.priority,
              courseId: candidate.courseId
            });

            recommendations.push(queueItem);
          } catch (error) {
            this.logger.error(`Error adding homework to queue: ${error.message}`, error.stack);
          }
        }
      }

      return recommendations;
    } catch (error) {
      this.logger.error(`Error getting homework recommendations: ${error.message}`, error.stack);
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
      // HomeworkQueue dan video ma'lumotlarini olish
      // dto.id is the queue item ID, not the homework ID
      const queueItem = await this.homeworkQueueRepository.findById(id)

      console.log("queueItem", queueItem)

      if (!queueItem) {
        this.logger.error(`Homework queue item not found: queueId=${id}`);
        throw new NotFoundException('Homework queue item not found');
      }

      const userId = queueItem.userId;

      // Kerakli maydonlar mavjudligini tekshirish
      if (!queueItem.courseId) {
        this.logger.error(`Course ID not found in queue item: queueId=${id}`);
        throw new BadRequestException('Course ID not found in queue item');
      }

      // HomeworkProgress jadvalida yozuv mavjudligini tekshirish
      let homeworkProgress = await this.homeworkProgressRepository.findOneByUserAndHomework(
        userId,
        queueItem.homeworkId
      );

      console.log("working")
      // Agar yozuv mavjud bo'lmasa, yangi yozuv yaratish
      if (!homeworkProgress) {
        const newProgress = new HomeworkProgress();
        newProgress.userId = userId;
        newProgress.homework = queueItem.homework;
        newProgress.blockId = queueItem.homework?.blockId || 0;
        newProgress.blockOrder = queueItem.blockOrder || queueItem.homework.block?.order || 0; // Queue dan yoki block dan olish
        newProgress.homeworkOrder = queueItem.homeworkOrder || queueItem.homework?.order || 0; // Queue dan yoki homework dan olish
        // Course ID ni to'g'ridan-to'g'ri queueItems dan olish
        if (queueItem.courseId && queueItem.courseId > 0) {
          newProgress.courseId = queueItem.courseId;
        } else if (queueItem.homework?.block?.course?.id) {
          newProgress.courseId = queueItem.homework.block.course.id;
          console.log('Using course ID from block.course:', newProgress.courseId);
        } else {
          // Xatolikni qayd qilish va default qiymat berish
          this.logger.warn(`Course ID not found for homework ${queueItem.homeworkId}, using default value`);
          newProgress.courseId = 0;
        }
        newProgress.isWatched = true;
        newProgress.countWatched = 1;

        homeworkProgress = await this.homeworkProgressRepository.create(newProgress);
      } else {
        // Mavjud yozuvni yangilash
        homeworkProgress.isWatched = true;
        homeworkProgress.countWatched += 1;
        homeworkProgress = await this.homeworkProgressRepository.update(homeworkProgress);
      }

      // Video ko'rilgandan so'ng queue dan o'chirish
      if (!queueItem.id) {
        this.logger.error(`Queue item ID is undefined, cannot remove from queue`);
      } else {
        const deleteResult = await this.homeworkQueueRepository.removeFromQueue(queueItem.id);
        if ((deleteResult as any)?.affected === 0) {
          this.logger.warn(`Queue item with ID ${queueItem.id} was not removed (not found or already deleted)`);
        } else {
          this.logger.log(`Queue item with ID ${queueItem.id} successfully removed`);
        }
      }

      // Uyga vazifa ko'rilgandan so'ng keyingi darsni ochish
      try {
        const blockOrder = homeworkProgress.blockOrder;
        const homeworkOrder = homeworkProgress.homeworkOrder;
        const courseId = homeworkProgress.courseId;

        // Keyingi darsni topish (uyga vazifa tartib raqami bilan bir xil bo'lgan dars)
        const nextLessonProgress = await this.lessonProgressRepository.getLessonProgress(
          homeworkOrder + 1, // Keyingi dars
          userId,
          blockOrder,
          courseId
        );

        if (nextLessonProgress) {
          // Keyingi darsni ochiq qilish
          nextLessonProgress.isUnlocked = true;
          await this.lessonProgressRepository.update(nextLessonProgress);
          this.logger.log(`Keyingi dars (order: ${nextLessonProgress.lessonOrder}) ochiq qilindi`);
        } else {
          this.logger.warn(`Keyingi dars topilmadi: homeworkOrder=${homeworkOrder + 1}, blockOrder=${blockOrder}, courseId=${courseId}`);
        }
      } catch (error) {
        this.logger.error(`Keyingi darsni ochishda xatolik: ${error.message}`, error.stack);
        // Asosiy jarayonni to'xtatmaslik uchun xatoni yutib yuboramiz
      }

      // Yangi videolarni navbatga qo'shish metodi chaqirilmaydi
      // await this.scheduleHomeworkForUser(userId); - bu qator o'chirildi

      return new ResData(
        "Homework progress successfully updated",
        200,
        homeworkProgress
      );
    } catch (error) {
      this.logger.error(`Error updating homework progress: ${error.message}`, error.stack);
      throw error;
    }
  } // ID bo'yicha HomeworkProgress yozuvini o'chiradi

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

      // Navbatdagi videolarni formatlash
      const formattedVideos = queueItems.map(item => this.formatHomeworkQueueItem(item));


      // Agar videolar orasida 1-moduldan boshqa modul yoki 20-darsdan keyin darslar bo'lsa, to'lov tekshirish
      const hasLessonsBeyondFree = formattedVideos.some(video =>
        (video.blockOrder && video.blockOrder > 1) ||
        (video.blockOrder === 1 && video.homeworkOrder && video.homeworkOrder > 20)
      );

      if (hasLessonsBeyondFree && queueItems.length > 0) {
        // Foydalanuvchi to'lov qilgan-qilmaganini tekshirish
        // courseId ni to'g'ridan-to'g'ri queueItems dan olish
        const courseId = queueItems[0].courseId;
        if (!courseId) {
          this.logger.error('Course ID not found in homework progress');
          return new ResData("Kurs ma'lumotlari topilmadi", 500, []);
        }

        const userCourse = await this.userCourseRepository.findByTariffIdAndUserId(userId, courseId);
        const isPaid = userCourse && userCourse.isActive;

        if (!isPaid) {
          // Agar to'lov qilinmagan bo'lsa
          if (formattedVideos.some(video => video.blockOrder && video.blockOrder > 1)) {
            return new ResData(
              "To access lessons beyond module 1, you need to purchase this course.",
              403,
              []
            );
          }

          if (formattedVideos.some(video => video.blockOrder === 1 && video.homeworkOrder && video.homeworkOrder > 20)) {
            return new ResData(
              "To access lessons beyond lesson 20 in module 1, you need to purchase this course.",
              403,
              []
            );
          }
        }
      }

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
        videoUrl: queueItem.homework.videoUrl
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
}