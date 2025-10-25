import { Injectable, Logger } from "@nestjs/common";
import { Inject } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource } from "typeorm";
import { IUserCourseProgressRepository } from "../interfaces/user-course-progress.repository";
import { UserCourseProgress } from "../entities/user-course-progress.entity";
import { ID } from "src/common/types/type";
import { ResData } from "src/lib/resData";

/**
 * UserCourseProgressService
 * -------------------------------------------------------
 * Maqsad: UserCourseProgress CRUD va business logic
 * 
 * Asosiy vazifalar:
 *  - UserCourseProgress yaratish/update qilish
 *  - LessonProgress o'zgarishlarini sinxronlash
 *  - Current lesson/block hisoblash
 *  - Completed lessons/blocks ro'yxatini yangilash
 */
@Injectable()
export class UserCourseProgressService {
    private readonly logger = new Logger(UserCourseProgressService.name);

    constructor(
        @Inject('IUserCourseProgressRepository')
        private readonly userCourseProgressRepo: IUserCourseProgressRepository,
        @InjectRepository(UserCourseProgress)
        private readonly userCourseProgressRepository: Repository<UserCourseProgress>,
        private readonly dataSource: DataSource,
    ) { }

    /**
     * UserCourseProgress upsert (create if not exists, update if exists)
     * @param userId - Foydalanuvchi ID
     * @param courseId - Kurs ID
     * @param lessonProgressData - LessonProgress ma'lumotlari
     * @returns Upsert qilingan UserCourseProgress
     */
    async upsertFromLessonProgress(
        userId: ID,
        courseId: ID,
        lessonProgressData: {
            currentLessonId: ID;
            currentLessonOrder: number;
            currentBlockId: ID;
            courseLanguage?: string;
        }
    ): Promise<ResData<UserCourseProgress>> {
        try {
            // Mavjud progressni topish
            const existingProgress = await this.userCourseProgressRepo.findByUserIdAndCourseId(userId, courseId);

            if (existingProgress) {
                // Update mavjud progress
                return await this.updateFromLessonProgress(existingProgress, lessonProgressData);
            } else {
                // Yangi progress yaratish
                return await this.createFromLessonProgress(userId, courseId, lessonProgressData);
            }
        } catch (error) {
            this.logger.error(`UserCourseProgress upsert failed: ${error.message}`, error.stack);
            return new ResData<UserCourseProgress>(
                `UserCourseProgress upsert failed: ${error.message}`,
                500,
                null
            );
        }
    }

    /**
     * Yangi UserCourseProgress yaratish
     */
    private async createFromLessonProgress(
        userId: ID,
        courseId: ID,
        lessonProgressData: {
            currentLessonId: ID;
            currentLessonOrder: number;
            currentBlockId: ID;
            courseLanguage?: string;
        }
    ): Promise<ResData<UserCourseProgress>> {
        try {
            const progress = new UserCourseProgress();
            progress.userId = Number(userId);
            progress.courseId = Number(courseId);
            progress.currentLessonId = Number(lessonProgressData.currentLessonId);
            progress.currentLessonOrder = lessonProgressData.currentLessonOrder;
            progress.currentBlockId = Number(lessonProgressData.currentBlockId);
            progress.courseLanguage = lessonProgressData.courseLanguage || 'arabic';
            progress.completedLessons = [Number(lessonProgressData.currentLessonId)];
            progress.completedBlocks = [];
            progress.isActive = true;

            const created = await this.userCourseProgressRepo.create(progress);

            this.logger.log(`UserCourseProgress created for user ${userId}, course ${courseId}`);
            return new ResData<UserCourseProgress>("UserCourseProgress created", 201, created);
        } catch (error) {
            this.logger.error(`UserCourseProgress creation failed: ${error.message}`, error.stack);
            return new ResData<UserCourseProgress>(
                `UserCourseProgress creation failed: ${error.message}`,
                500,
                null
            );
        }
    }

    /**
     * Mavjud UserCourseProgress ni yangilash
     */
    private async updateFromLessonProgress(
        existingProgress: UserCourseProgress,
        lessonProgressData: {
            currentLessonId: ID;
            currentLessonOrder: number;
            currentBlockId: ID;
            courseLanguage?: string;
        }
    ): Promise<ResData<UserCourseProgress>> {
        try {
            // Current lesson order yangilash (faqat oshirish)
            if (lessonProgressData.currentLessonOrder > existingProgress.currentLessonOrder) {
                existingProgress.currentLessonOrder = lessonProgressData.currentLessonOrder;
                existingProgress.currentLessonId = Number(lessonProgressData.currentLessonId);
                existingProgress.currentBlockId = Number(lessonProgressData.currentBlockId);
            }

            // Completed lessons ro'yxatini yangilash
            const completedLessons = existingProgress.completedLessons || [];
            const newLessonId = Number(lessonProgressData.currentLessonId);

            if (!completedLessons.includes(newLessonId)) {
                completedLessons.push(newLessonId);
                existingProgress.completedLessons = completedLessons;
            }

            // Course language yangilash (agar berilgan bo'lsa)
            if (lessonProgressData.courseLanguage) {
                existingProgress.courseLanguage = lessonProgressData.courseLanguage;
            }

            const updated = await this.userCourseProgressRepo.update(existingProgress);

            this.logger.log(`UserCourseProgress updated for user ${existingProgress.userId}, course ${existingProgress.courseId}`);
            return new ResData<UserCourseProgress>("UserCourseProgress updated", 200, updated);
        } catch (error) {
            this.logger.error(`UserCourseProgress update failed: ${error.message}`, error.stack);
            return new ResData<UserCourseProgress>(
                `UserCourseProgress update failed: ${error.message}`,
                500,
                null
            );
        }
    }

    /**
     * Transaction ichida UserCourseProgress upsert
     * @param queryRunner - TypeORM QueryRunner
     * @param userId - Foydalanuvchi ID
     * @param courseId - Kurs ID
     * @param lessonProgressData - LessonProgress ma'lumotlari
     * @returns Upsert qilingan UserCourseProgress
     */
    async upsertFromLessonProgressInTransaction(
        queryRunner: any,
        userId: ID,
        courseId: ID,
        lessonProgressData: {
            currentLessonId: ID;
            currentLessonOrder: number;
            currentBlockId: ID;
            courseLanguage?: string;
        }
    ): Promise<UserCourseProgress> {
        // Mavjud progressni topish
        const existingProgress = await queryRunner.manager.findOne(UserCourseProgress, {
            where: { userId: Number(userId), courseId: Number(courseId) }
        });

        if (existingProgress) {
            // Update mavjud progress
            if (lessonProgressData.currentLessonOrder > existingProgress.currentLessonOrder) {
                existingProgress.currentLessonOrder = lessonProgressData.currentLessonOrder;
                existingProgress.currentLessonId = Number(lessonProgressData.currentLessonId);
                existingProgress.currentBlockId = Number(lessonProgressData.currentBlockId);
            }

            const completedLessons = existingProgress.completedLessons || [];
            const newLessonId = Number(lessonProgressData.currentLessonId);

            if (!completedLessons.includes(newLessonId)) {
                completedLessons.push(newLessonId);
                existingProgress.completedLessons = completedLessons;
            }

            if (lessonProgressData.courseLanguage) {
                existingProgress.courseLanguage = lessonProgressData.courseLanguage;
            }

            return await queryRunner.manager.save(UserCourseProgress, existingProgress);
        } else {
            // Yangi progress yaratish
            const progress = new UserCourseProgress();
            progress.userId = Number(userId);
            progress.courseId = Number(courseId);
            progress.currentLessonId = Number(lessonProgressData.currentLessonId);
            progress.currentLessonOrder = lessonProgressData.currentLessonOrder;
            progress.currentBlockId = Number(lessonProgressData.currentBlockId);
            progress.courseLanguage = lessonProgressData.courseLanguage || 'arabic';
            progress.completedLessons = [Number(lessonProgressData.currentLessonId)];
            progress.completedBlocks = [];
            progress.isActive = true;

            return await queryRunner.manager.save(UserCourseProgress, progress);
        }
    }

    /**
     * Transaction ichida UserCourseProgress ni to'liq hisoblash va yangilash
     * @param queryRunner - TypeORM QueryRunner
     * @param userId - Foydalanuvchi ID
     * @param courseId - Kurs ID
     * @param lessonProgresses - Barcha lesson progresslari
     * @param currentLessonId - Hozirgi dars ID
     * @param currentLessonOrder - Hozirgi dars tartibi
     * @param currentBlockId - Hozirgi blok ID
     * @param courseLanguage - Kurs tili
     * @returns Yangilangan UserCourseProgress
     */
    async recalculateAndUpsertInTransaction(
        queryRunner: any,
        userId: ID,
        courseId: ID,
        lessonProgresses: any[],
        currentLessonId: ID,
        currentLessonOrder: number,
        currentBlockId: ID,
        courseLanguage: string = 'arabic'
    ): Promise<UserCourseProgress> {
        // Progress ma'lumotlarini hisoblash
        const progressData = {
            currentLessonId,
            currentLessonOrder,
            currentBlockId,
            courseLanguage,
        };

        // Transaction ichida upsert
        return await this.upsertFromLessonProgressInTransaction(
            queryRunner,
            userId,
            courseId,
            progressData
        );
    }

    /**
     * UserCourseProgress ni olish
     */
    async getByUserIdAndCourseId(userId: ID, courseId: ID): Promise<ResData<UserCourseProgress | null>> {
        try {
            const progress = await this.userCourseProgressRepo.findByUserIdAndCourseId(userId, courseId);
            return new ResData<UserCourseProgress | null>("Success", 200, progress);
        } catch (error) {
            this.logger.error(`Get UserCourseProgress failed: ${error.message}`, error.stack);
            return new ResData<UserCourseProgress | null>(
                `Get UserCourseProgress failed: ${error.message}`,
                500,
                null
            );
        }
    }
}
