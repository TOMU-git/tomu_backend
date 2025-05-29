// src/modules/homework-progress/homework-progress.service.ts
import { Inject, Injectable } from "@nestjs/common";
import { IHomeworkProgressService } from "./interfaces/homework-progress.service";
import { HomeworkProgressRepository } from "./homework-progress.repository";
import { HomeworkWatchRecordRepository } from "./homework-watch-record.repository";
import { HomeworkQueueRepository } from "./homework-queue.repository";
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
    // Ochilmagan uy vazifalar sonini tekshirish
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

  // Joriy modulni aniqlash
  private async getCurrentUserModule(userId: ID): Promise<number> {
    // Joriy modulni aniqlash (lesson-progress repositoriydan olinishi kerak)
    try {
      // LessonProgressRepository tipini any sifatida ishlatamiz
      // Bu TypeScript xatoliklarni chetlab o'tish uchun
      const repo = this.lessonProgressRepository as any;
      const userLessons = await repo.find({
        where: { userId: userId },
        relations: ['lesson', 'lesson.module'],
        order: { updatedAt: 'DESC' }
      });
      
      if (!userLessons || userLessons.length === 0) {
        return 1; // Default module if no lessons watched
      }
      
      // Eng so'nggi ko'rilgan darsni olish
      const latestLesson = userLessons[0];
      
      // Module ID-ni olish
      if (latestLesson?.lesson?.module?.id) {
        return latestLesson.lesson.module.id;
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
        
        // Navbatga qo'shish
        const queueItem = await this.homeworkQueueRepository.addToQueue({
          userId,
          homeworkId: homework.id,
          moduleId: homework.moduleId,
          // LessonProgress entitysida lesson obyekti bor, lessonId emas
          lessonId: lesson.lesson?.id,
          priority: modulePriority + watchCountPriority
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
}