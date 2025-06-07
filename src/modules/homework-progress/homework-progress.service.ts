// src/modules/homework-progress/homework-progress.service.ts
import { Inject, Injectable } from "@nestjs/common";
import { IHomeworkProgressService } from "./interfaces/homework-progress.service";
import { HomeworkProgressRepository } from "./repositories/homework-progress.repository";
import { HomeworkWatchRecordRepository } from "./repositories/homework-watch-record.repository";
import { HomeworkQueueRepository } from "./repositories/homework-queue.repository";
import { ILessonProgressRepository } from "../lesson-progress/interfaces/lesson-progress.repository";
import { ResData } from "src/lib/resData";
import { ID } from "src/common/types/type";
import { HomeworkProgress } from "./entities/homework-progress.entity";
import { HomeworkWatchRecord } from "./entities/homework-watch-record.entity";
import { HomeworkQueue } from "./entities/homework-queue.entity";
import { HomeworkNotFoundException } from "../homework/exception/homework.exception";
import { LessonNotWatchedException } from "./exception/homework-progress.exception";
import { SchedulerRegistry } from "@nestjs/schedule";
import { CronJob } from "cron";
import { UpdateHomeworkProgressDto } from "./dto/update-homework-progress.dto";
import { IHomeworkQueue } from "./interfaces/homework-queue.interface";

// Nestjs/schedule va cron packagelarini o'rnatish kerak bo'lishi mumkin:
// npm install --save @nestjs/schedule cron

@Injectable()
export class HomeworkProgressService implements IHomeworkProgressService {
  constructor(
    @Inject("IHomeworkProgressRepository")
    private readonly homeworkProgressRepository: HomeworkProgressRepository,

    private readonly homeworkWatchRecordRepository: HomeworkWatchRecordRepository,
    private readonly homeworkQueueRepository: HomeworkQueueRepository,

    @Inject("ILessonProgressRepository")
    private readonly lessonProgressRepository: ILessonProgressRepository,

    private readonly schedulerRegistry: SchedulerRegistry,
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
      console.error("Error initializing homework scheduler:", error);
    }
  }

  private async processHomeworkQueue() {
    try {
      const users = await this.getAllActiveUsers();
      
      for (const user of users) {
        await this.scheduleHomeworkForUser(user.id);
      }
    } catch (error) {
      console.error("Error processing homework queue:", error);
    }
  }

  private async getAllActiveUsers() {
    // Active userlarni User repositoriydan olish kerak
    // Bu oddiy misol, asl implementatsiya User repositoriyga bog'liq
    try {
      // Ushbu metod User service yoki repositoriyga murojaat qilishi kerak
      // Hozircha shunchaki mock data qaytaramiz
      return [
        { id: 1, name: 'User 1' },
        { id: 2, name: 'User 2' },
        { id: 3, name: 'User 3' }
      ];
    } catch (error) {
      console.error('Error getting active users:', error);
      return [];
    }
  }

  // Foydalanuvchi uchun yangi uy vazifa jadvallash
  private async scheduleHomeworkForUser(userId: ID) {
    // Ochilmagan uy vazifa sonini tekshirish
    const pendingCount = await this.homeworkQueueRepository.countPendingHomeworksByUser(userId);
    if (pendingCount >= 20) {
      return; // Limit oshgan
    }

    // Joriy modul va unga mos keladigan modullardan uy vazifalarni topish
    const currentModule = await this.getCurrentUserModule(userId);
    const eligibleModules = this.getEligibleModules(currentModule);
    
    // Uy vazifalarni tavsiya qilish
    const recommendations = await this.getHomeworkRecommendations(userId, eligibleModules);
    if (!recommendations.length) {
      return;
    }

    // Keyingi uy vazifani jadvalga qo'shish
    const nextDeliveryTime = new Date();
    nextDeliveryTime.setMinutes(nextDeliveryTime.getMinutes() + 30);
    
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
  async scheduleHomeworkForLesson(userId: ID, lessonId: ID): Promise<ResData<any>> {
    try {
      // Dars uchun uyga vazifa topish
      const homework = await this.findHomeworkByLessonId(lessonId);
      
      if (!homework) {
        return new ResData("Dars uchun uyga vazifa topilmadi", 404, null);
      }
      
      // Uyga vazifa allaqachon rejalashtirilganligini tekshirish
      const existingQueues = await this.homeworkQueueRepository.findScheduledHomeworksByUser(userId);
      const existingQueue = existingQueues.find(q => q.homeworkId === homework.id);
      
      if (existingQueue) {
        return new ResData("Uyga vazifa allaqachon rejalashtirilgan", 200, existingQueue);
      }
      
      // Lesson progressdan ma'lumotlarni olish
      const lessonProgress = await this.lessonProgressRepository.findById(lessonId);
      if (!lessonProgress) {
        return new ResData("Dars progressi topilmadi", 404, null);
      }
      
      // Yangi uyga vazifa rejasini yaratish
      const queueItem = await this.homeworkQueueRepository.addToQueue({
        userId,
        homeworkId: homework.id,
        moduleId: lessonProgress.blockId,
        lessonId: lessonId,
        isScheduled: true,
        scheduledAt: new Date(), // Darhol yuborish uchun hozirgi vaqt
        priority: 200 // Eng yuqori prioritet
      });
      
      // Uyga vazifani darhol yuborish uchun getUserHomeworkVideos metodini chaqiramiz
      await this.getUserHomeworkVideos(userId);
      
      return new ResData("Uyga vazifa muvaffaqiyatli rejalashtirildi", 200, queueItem);
    } catch (error) {
      console.error(`Dars ${lessonId} uchun uyga vazifani rejalashtirish xatoligi:`, error);
      return new ResData("Uyga vazifani rejalashtirish xatoligi", 500, null);
    }
  }

  // Joriy modulni aniqlash
  private async getCurrentUserModule(userId: ID): Promise<number> {
    // Joriy modulni aniqlash (lesson-progress repositoriydan olinishi kerak)
    try {
      // LessonProgressRepository orqali barcha ko'rilgan darslarni olish
      const watchedLessons = await this.lessonProgressRepository.findAllWatchedLessonsByUser(userId);
      
      if (!watchedLessons || watchedLessons.length === 0) {
        return 1; // Default module if no lessons watched
      }
      
      // Eng so'nggi ko'rilgan darsni olish (lastUpdatedAt bo'yicha tartiblash)
      const sortedLessons = [...watchedLessons].sort((a, b) => 
        new Date(b.lastUpdatedAt).getTime() - new Date(a.lastUpdatedAt).getTime());
      const latestLesson = sortedLessons[0];
      
      // Module ID-ni olish
      if (latestLesson?.blockId) {
        return latestLesson.blockId; // blockId ni module ID sifatida ishlatamiz
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
    moduleIds: number[]
  ): Promise<HomeworkQueue[]> {
    // Dars ko'rilgan, lekin uy vazifa kam ko'rilgan homeworklarni olish
    const watchedLessons = await this.lessonProgressRepository.findAllWatchedLessonsByUser(userId);
    const watchRecords = await this.homeworkWatchRecordRepository.getHomeworksWithWatchCount(
      userId,
      moduleIds
    );
    
    // Eng oxirgi ko'rilgan darsni topish - barcha ko'rilgan darslardan eng oxirgisini olish
    const allWatchedLessons = await this.lessonProgressRepository.findAllWatchedLessonsByUser(userId);
    // Ko'rilgan darslarni lastUpdatedAt bo'yicha tartiblash
    const latestWatchedLesson = allWatchedLessons.length > 0 ? 
      allWatchedLessons.sort((a, b) => 
        new Date(b.lastUpdatedAt).getTime() - new Date(a.lastUpdatedAt).getTime())[0] : null;
    
    // Dars ko'rilgan, lekin uy vazifa ko'rilmagan yoki kam ko'rilgan
    const recommendations = [];
    
    for (const lesson of watchedLessons) {
      // Tegishli uy vazifani topish
      const lessonId = lesson.lesson?.id;
      if (!lessonId) {
        continue; // Lesson ID topilmasa, keyingi darsga o'tish
      }
      
      const homework = await this.findHomeworkByLessonId(lessonId);
      if (!homework) {
        continue; // Uy vazifa topilmasa, keyingi darsga o'tish
      }
      
      // Uy vazifa ko'rilish sonini tekshirish
      const watchRecord = watchRecords.find(wr => wr.homeworkId === homework.id);
      if (!watchRecord || watchRecord.watchCount < 10) {
        // Modul bo'yicha prioritet
        let modulePriority = 0;
        const moduleDiff = moduleIds[0] - homework.moduleId;
        
        if (moduleDiff === 0) {
          modulePriority = 100; // Joriy modul
        } else if (moduleDiff === 1) {
          modulePriority = 80; // Oldingi modul
        } else if (moduleDiff === 2) {
          modulePriority = 60; // 2 modul oldin
        }
        
        // Ko'rilish soni bo'yicha prioritet
        const watchCountPriority = (10 - (watchRecord?.watchCount || 0)) * 10;
        
        // Eng oxirgi ko'rilgan dars uchun qo'shimcha prioritet
        let latestLessonPriority = 0;
        if (latestWatchedLesson && lessonId === latestWatchedLesson.lesson?.id) {
          latestLessonPriority = 200; // Eng oxirgi ko'rilgan darsning uyga vazifasiga eng yuqori prioritet
        }
        
        // Navbatga qo'shish
        const queueItem = await this.homeworkQueueRepository.addToQueue({
          userId,
          homeworkId: homework.id,
          moduleId: homework.moduleId,
          // LessonProgress entitysida lesson obyekti bor, lessonId emas
          lessonId: lesson.lesson?.id,
          priority: modulePriority + watchCountPriority + latestLessonPriority
        });
        
        recommendations.push(queueItem);
      }
    }
    
    return recommendations;
  }

  private async findHomeworkByLessonId(lessonId: ID) {
    try {
      // Homework repositoriydan lesson ID bo'yicha uy vazifalarni qidirish
      // Bu yerda HomeworkRepository ishlatilishi kerak
      // Hozir mavjud bo'lmagani uchun mock data qaytaramiz
      return {
        id: 100 + Number(lessonId),
        title: `Homework for Lesson ${lessonId}`,
        moduleId: Math.floor(Number(lessonId) / 10) + 1, // Mock module ID
        description: 'Watch this homework video',
        videoUrl: 'https://example.com/homework-video',
        createdAt: new Date(),
        updatedAt: new Date()
      };
    } catch (error) {
      console.error(`Error finding homework for lesson ${lessonId}:`, error);
      return null;
    }
  }

  // Foydalanuvchiga ko'rsatiladigan uy vazifalarni olish
  async getUserHomeworks(userId: ID): Promise<ResData<HomeworkProgress[]>> {
    // Jadvalga qo'shilgan uy vazifalarni olish
    const scheduledHomeworks = await this.homeworkQueueRepository.findScheduledHomeworksByUser(userId);
    
    if (!scheduledHomeworks.length) {
      return new ResData("No scheduled homeworks found", 404, []);
    }
    
    // Uy vazifa progresslarini olish
    const homeworkProgresses = [];
    
    for (const item of scheduledHomeworks) {
      // Tegishli dars ko'rilganligini tekshirish
      const isLessonWatched = await this.checkIfLessonWatched(userId, item.lessonId);
      if (!isLessonWatched) {
        continue; // Dars ko'rilmagan bo'lsa, o'tkazib yuborish
      }
      
      // Uy vazifa progressini olish
      const progress = await this.homeworkProgressRepository.findOneByUserAndHomework(
        userId,
        item.homeworkId
      );
      
      if (progress) {
        homeworkProgresses.push(progress);
      }
    }
    
    return new ResData("Homeworks retrieved successfully", 200, homeworkProgresses);
  }

  // Dars ko'rilganligini tekshirish
  private async checkIfLessonWatched(userId: ID, lessonId: ID): Promise<boolean> {
    const lessonProgress = await this.lessonProgressRepository.findOneByUserAndLesson(
      userId,
      lessonId
    );
    
    // LessonProgress obyektida isWatched property bo'lishi kerak
    return lessonProgress?.isWatched || false;
  }
  
  // IHomeworkProgressService interfaceini to'liq implementatsiya qilish
  
  // Barcha HomeworkProgress yozuvlarini qaytaradi
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

  // ID va DTO bo'yicha HomeworkProgress yozuvini yangilaydi
  async update(dto: UpdateHomeworkProgressDto): Promise<ResData<HomeworkProgress>> {
    try {
      // Avval yangilanayotgan progress yozuvini topish kerak
      const existingProgress = await this.homeworkProgressRepository.findById(dto.id);
      if (!existingProgress) {
        return new ResData('Homework progress not found', 404, null);
      }
      
      // Mavjud obyektni yangilash
      Object.assign(existingProgress, dto);
      
      // HomeworkProgressRepository update metodi entity qabul qiladi
      const updatedProgress = await this.homeworkProgressRepository.update(existingProgress);
      
      return new ResData('Homework progress updated successfully', 200, updatedProgress);
    } catch (error) {
      console.error(`Error updating homework progress:`, error);
      return new ResData('Failed to update homework progress', 500, null);
    }
  }

  // ID bo'yicha HomeworkProgress yozuvini o'chiradi
  async delete(id: ID): Promise<ResData<HomeworkProgress>> {
    try {
      // Avval o'chirilayotgan homeworkProgress'ni topamiz
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

  // Foydalanuvchi ID, block ID bo'yicha HomeworkProgress yozuvlarini qaytaradi
  async getVideos(userID: ID, blockId: ID): Promise<ResData<Array<Partial<HomeworkProgress>>>> {
    try {
      // HomeworkProgressRepository da findByBlocIdAndUserId metodi mavjud
      const homeworkProgresses = await this.homeworkProgressRepository.findByBlocIdAndUserId(blockId, userID);
      
      // Faqat kerakli fieldlarni ajratib olish (any tipidan foydalanib)
      const partialProgresses = homeworkProgresses.map((progress: any) => {
        return {
          id: progress.id,
          videoUrl: progress.videoUrl || progress.homework?.videoUrl,
          title: progress.title || progress.homework?.title,
          description: progress.description || progress.homework?.description,
          isWatched: progress.isWatched,
          watchCount: progress.countWatched
        };
      });
      
      return new ResData('Homework videos retrieved successfully', 200, partialProgresses);
    } catch (error) {
      console.error(`Error getting homework videos for user ${userID} and block ${blockId}:`, error);
      return new ResData('Failed to retrieve homework videos', 500, []);
    }
  }

  // Uy vazifani ko'rilgan deb belgilash
  async markHomeworkAsWatched(userId: ID, homeworkId: ID): Promise<ResData<HomeworkProgress>> {
    // Uy vazifani topish
    const homework = await this.homeworkProgressRepository.findOneByUserAndHomework(
      userId,
      homeworkId
    );
    
    if (!homework) {
      throw new HomeworkNotFoundException();
    }
    
    // Tegishli dars ko'rilganligini tekshirish
    // Homework obyektidan lesson ID ni olish
    // TypeScript xatoliklarni chetlab o'tish uchun any tipidan foydalanamiz
    const homeworkAny = homework as any;
    let lessonId;
    
    // Agar homework.lesson.id mavjud bo'lsa, uni ishlating
    if (homeworkAny.homework && homeworkAny.homework.lessonId) {
      lessonId = homeworkAny.homework.lessonId;
    }
    // Agar homework.lessonId mavjud bo'lsa, uni ishlating
    else if (homeworkAny.lessonId) {
      lessonId = homeworkAny.lessonId;
    }
    // Homework.lesson.id variantini tekshirish
    else if (homeworkAny.lesson && homeworkAny.lesson.id) {
      lessonId = homeworkAny.lesson.id;
    }
    // Yana boshqa variantlar ham bo'lishi mumkin
    else {
      throw new Error('Lesson ID not found for this homework');
    }
    
    const isLessonWatched = await this.checkIfLessonWatched(userId, lessonId);
    if (!isLessonWatched) {
      throw new LessonNotWatchedException();
    }
    
    // Ko'rilganlik hisoblagichini yangilash
    let watchRecord = await this.homeworkWatchRecordRepository.findByUserAndHomework(
      userId,
      homeworkId
    );
    
    if (!watchRecord) {
      watchRecord = await this.homeworkWatchRecordRepository.create({
        userId,
        homeworkId,
        moduleId: (homework as any).homework?.moduleId || (homework as any).moduleId || 0,
        lessonId: lessonId,
        watchCount: 1,
        lastWatchedAt: new Date()
      });
    } else {
      watchRecord = await this.homeworkWatchRecordRepository.update(
        userId,
        homeworkId,
        {
          watchCount: Math.min(watchRecord.watchCount + 1, 10),
          lastWatchedAt: new Date()
        }
      );
    }
    
    // Uy vazifa progressini yangilash
    homework.isWatched = true;
    homework.countWatched = watchRecord.watchCount;
    
    const updatedProgress = await this.homeworkProgressRepository.update(homework);
    
    return new ResData("Homework marked as watched", 200, updatedProgress);
  }

  // Foydalanuvchi uchun uy vazifa videolarini olish
  // Agar schedule bo'lmasa, foydalanuvchi ko'rgan modullar asosida yangi schedule yaratadi
  async getUserHomeworkVideos(userId: ID): Promise<ResData<Array<Partial<HomeworkProgress>>>> {
    try {
      // 1. Foydalanuvchi uchun rejalashtirilgan uy vazifalarni olish
      let scheduledHomeworks = await this.homeworkQueueRepository.findScheduledHomeworksByUser(userId);
      
      // 2. Agar rejalashtirilgan uy vazifalar bo'lmasa, yangi rejalashtirishni boshlash
      if (!scheduledHomeworks.length) {
        console.log(`Foydalanuvchi ${userId} uchun rejalashtirilgan uy vazifalar topilmadi. Yangi schedule yaratiladi.`);
        
        // 2.1 Foydalanuvchi ko'rgan darslarni olish
        const watchedLessons = await this.lessonProgressRepository.findAllWatchedLessonsByUser(userId);
        
        if (!watchedLessons.length) {
          return new ResData("Foydalanuvchi hali birorta ham dars ko'rmagan", 404, []);
        }
        
        // 2.2 Ko'rilgan darslar uchun uy vazifalarni olish va schedule qilish
        // Modullar tartibidan qat'iy nazar, faqat ko'rilgan darslar uchun uy vazifalarni qaytarish
        for (const lesson of watchedLessons) {
          try {
            // Dars uchun uy vazifa topish
            const homework = await this.findHomeworkByLessonId(lesson.id);
            
            if (homework) {
              // Uy vazifa allaqachon rejalashtirilganligini tekshirish
              const existingQueues = await this.homeworkQueueRepository.findScheduledHomeworksByUser(userId);
              const existingQueue = existingQueues.find(q => q.homeworkId === homework.id);
              
              if (!existingQueue) {
                // Yangi uy vazifa rejasini yaratish
                await this.homeworkQueueRepository.addToQueue({
                  userId,
                  homeworkId: homework.id,
                  moduleId: lesson.blockId,
                  lessonId: lesson.id,
                  isScheduled: true,
                  scheduledAt: new Date(),
                  priority: 1
                });
              }
            }
          } catch (error) {
            console.error(`Lesson ${lesson.id} uchun uy vazifalarni olishda xatolik:`, error);
            // Xatolikni yutib, keyingi darsga o'tish
          }
        }
        
        // 2.3 Yangi rejalashtirilgan uy vazifalarni olish
        scheduledHomeworks = await this.homeworkQueueRepository.findScheduledHomeworksByUser(userId);
        
        if (!scheduledHomeworks.length) {
          return new ResData("Uy vazifalar rejalashtirildi, lekin hech qanday uy vazifa topilmadi", 404, []);
        }
      }
      
      // 3. Uy vazifa progresslarini olish
      const homeworkProgresses = [];
      
      for (const item of scheduledHomeworks) {
        // 3.1 Tegishli dars ko'rilganligini tekshirish
        const isLessonWatched = item.lessonId ? 
          await this.checkIfLessonWatched(userId, item.lessonId) : true;
        
        if (!isLessonWatched) {
          continue; // Dars ko'rilmagan bo'lsa, o'tkazib yuborish
        }
        
        // 3.2 Uy vazifa progressini olish
        let progress = await this.homeworkProgressRepository.findOneByUserAndHomework(
          userId,
          item.homeworkId
        );
        
        // 3.3 Agar progress mavjud bo'lmasa, yangi progress yaratish
        if (!progress) {
          // Uy vazifani olish
          const homework = item.homework;
          
          if (homework) {
            // Yangi progress yaratish
            const newProgress = new HomeworkProgress();
            newProgress.userId = userId;
            
            // Lesson progressdan ma'lumotlarni olish
            if (item.lessonId) {
              const lessonProgress = await this.lessonProgressRepository.findById(item.lessonId);
              if (lessonProgress) {
                newProgress.blockId = lessonProgress.blockId;
                newProgress.blockOrder = lessonProgress.blockOrder;
                newProgress.homeworkOrder = lessonProgress.lessonOrder;
                newProgress.courseId = lessonProgress.courseId;
              } else {
                // Agar lesson progress topilmasa, moduleId ni blockId sifatida ishlatamiz
                newProgress.blockId = item.moduleId;
                newProgress.homeworkOrder = 1; // Default qiymat
              }
            } else {
              // Agar lessonId bo'lmasa, moduleId ni blockId sifatida ishlatamiz
              newProgress.blockId = item.moduleId;
              newProgress.homeworkOrder = 1; // Default qiymat
            }
            
            newProgress.homework = homework;
            newProgress.isWatched = false;
            newProgress.countWatched = 0;
            
            // Yangi progressni saqlash
            progress = await this.homeworkProgressRepository.create(newProgress);
          }
        }
        
        // Faqat ko'rilmagan uyga vazifalarni qaytarish
        if (progress && !progress.isWatched) {
          // 3.4 Kerakli ma'lumotlarni ajratib olish
          homeworkProgresses.push({
            id: progress.id,
            videoUrl: progress.homework?.videoUrl,
            title: progress.homework?.title,
            blockId: progress.blockId,
            blockOrder: progress.blockOrder,
            homeworkOrder: progress.homeworkOrder,
            isWatched: progress.isWatched,
            countWatched: progress.countWatched,
            createdAt: progress.createdAt,
            lastUpdatedAt: progress.lastUpdatedAt
          });
        }
      }
      
      // 4. Natijani qaytarish
      if (!homeworkProgresses.length) {
        return new ResData("Foydalanuvchi uchun ko'rilmagan uyga vazifalar topilmadi", 404, []);
      }
      
      return new ResData("Foydalanuvchi uyga vazifa videolari muvaffaqiyatli olindi", 200, homeworkProgresses);
    } catch (error) {
      console.error(`Foydalanuvchi ${userId} uchun uy vazifa videolarini olishda xatolik:`, error);
      return new ResData("Uy vazifa videolarini olishda xatolik yuz berdi", 500, []);
    }
  }
}