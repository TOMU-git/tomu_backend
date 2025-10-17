import { Injectable } from "@nestjs/common";
import { LessonProgress } from "src/modules/lesson-progress/entities/lesson-progress.entity";
import { UserCourseProgress } from "../entities/user-course-progress.entity";
import { ID } from "src/common/types/type";

/**
 * UserProgressCalculator
 * -------------------------------------------------------
 * Maqsad: UserCourseProgress hisoblash logikasi
 * 
 * Asosiy vazifalar:
 *  - Current lesson order hisoblash
 *  - Completed lessons/blocks ro'yxatini tayyorlash
 *  - Next lesson/block aniqlash
 *  - Progress statistikalarini hisoblash
 */
@Injectable()
export class UserProgressCalculator {

    /**
     * LessonProgress ma'lumotlaridan UserCourseProgress uchun ma'lumotlar hisoblash
     * @param lessonProgresses - Barcha lesson progresslari
     * @param currentLessonId - Hozirgi dars ID
     * @param currentLessonOrder - Hozirgi dars tartibi
     * @param currentBlockId - Hozirgi blok ID
     * @param courseLanguage - Kurs tili
     * @returns UserCourseProgress uchun hisoblangan ma'lumotlar
     */
    calculateUserCourseProgressData(
        lessonProgresses: LessonProgress[],
        currentLessonId: ID,
        currentLessonOrder: number,
        currentBlockId: ID,
        courseLanguage: string = 'arabic'
    ): {
        currentLessonId: ID;
        currentLessonOrder: number;
        currentBlockId: ID;
        courseLanguage: string;
        completedLessons: number[];
        completedBlocks: number[];
        totalWatchedLessons: number;
        totalUnlockedLessons: number;
        lastWatchedLessonOrder: number;
        nextLessonOrder: number;
    } {
        // Watched lessons ro'yxatini olish
        const watchedLessons = lessonProgresses
            .filter(lp => lp.isWatched)
            .map(lp => lp.lesson?.id)
            .filter(Boolean) as number[];

        // Unlocked lessons ro'yxatini olish
        const unlockedLessons = lessonProgresses
            .filter(lp => lp.isUnlocked)
            .map(lp => lp.lesson?.id)
            .filter(Boolean) as number[];

        // Completed blocks ro'yxatini olish (barcha darslari watched bo'lgan bloklar)
        const completedBlocks = this.calculateCompletedBlocks(lessonProgresses);

        // Eng oxirgi ko'rilgan dars tartibini topish
        const lastWatchedLessonOrder = this.findLastWatchedLessonOrder(lessonProgresses);

        // Keyingi dars tartibini hisoblash
        const nextLessonOrder = this.calculateNextLessonOrder(lessonProgresses, currentLessonOrder);

        return {
            currentLessonId,
            currentLessonOrder,
            currentBlockId,
            courseLanguage,
            completedLessons: watchedLessons,
            completedBlocks,
            totalWatchedLessons: watchedLessons.length,
            totalUnlockedLessons: unlockedLessons.length,
            lastWatchedLessonOrder,
            nextLessonOrder,
        };
    }

    /**
     * Completed blocks ro'yxatini hisoblash
     * @param lessonProgresses - Barcha lesson progresslari
     * @returns Completed block ID lari
     */
    private calculateCompletedBlocks(lessonProgresses: LessonProgress[]): number[] {
        const blockMap = new Map<number, { total: number; watched: number }>();

        // Har bir blok uchun darslar sonini va ko'rilgan darslar sonini hisoblash
        lessonProgresses.forEach(lp => {
            if (lp.blockId && lp.lesson) {
                const blockId = lp.blockId;
                if (!blockMap.has(blockId)) {
                    blockMap.set(blockId, { total: 0, watched: 0 });
                }

                const blockData = blockMap.get(blockId)!;
                blockData.total++;
                if (lp.isWatched) {
                    blockData.watched++;
                }
            }
        });

        // Barcha darslari ko'rilgan bloklarni topish
        const completedBlocks: number[] = [];
        blockMap.forEach((data, blockId) => {
            if (data.total > 0 && data.watched === data.total) {
                completedBlocks.push(blockId);
            }
        });

        return completedBlocks;
    }

    /**
     * Eng oxirgi ko'rilgan dars tartibini topish
     * @param lessonProgresses - Barcha lesson progresslari
     * @returns Eng oxirgi ko'rilgan dars tartibi
     */
    private findLastWatchedLessonOrder(lessonProgresses: LessonProgress[]): number {
        const watchedLessons = lessonProgresses
            .filter(lp => lp.isWatched && lp.lessonOrder)
            .sort((a, b) => b.lessonOrder - a.lessonOrder);

        return watchedLessons.length > 0 ? watchedLessons[0].lessonOrder : 0;
    }

    /**
     * Keyingi dars tartibini hisoblash
     * @param lessonProgresses - Barcha lesson progresslari
     * @param currentLessonOrder - Hozirgi dars tartibi
     * @returns Keyingi dars tartibi
     */
    private calculateNextLessonOrder(lessonProgresses: LessonProgress[], currentLessonOrder: number): number {
        const unlockedLessons = lessonProgresses
            .filter(lp => lp.isUnlocked && lp.lessonOrder > currentLessonOrder)
            .sort((a, b) => a.lessonOrder - b.lessonOrder);

        return unlockedLessons.length > 0 ? unlockedLessons[0].lessonOrder : currentLessonOrder + 1;
    }

    /**
     * UserCourseProgress ni yangilash uchun minimal ma'lumotlar
     * @param currentLessonId - Hozirgi dars ID
     * @param currentLessonOrder - Hozirgi dars tartibi
     * @param currentBlockId - Hozirgi blok ID
     * @param courseLanguage - Kurs tili
     * @returns Minimal update ma'lumotlari
     */
    createMinimalUpdateData(
        currentLessonId: ID,
        currentLessonOrder: number,
        currentBlockId: ID,
        courseLanguage: string = 'arabic'
    ): {
        currentLessonId: ID;
        currentLessonOrder: number;
        currentBlockId: ID;
        courseLanguage: string;
    } {
        return {
            currentLessonId,
            currentLessonOrder,
            currentBlockId,
            courseLanguage,
        };
    }

    /**
     * Progress statistikalarini hisoblash
     * @param userCourseProgress - UserCourseProgress entity
     * @param lessonProgresses - Barcha lesson progresslari
     * @returns Progress statistikalar
     */
    calculateProgressStats(
        userCourseProgress: UserCourseProgress,
        lessonProgresses: LessonProgress[]
    ): {
        completionPercentage: number;
        watchedLessonsCount: number;
        totalLessonsCount: number;
        completedBlocksCount: number;
        totalBlocksCount: number;
        currentModule: number;
        isOnTrack: boolean;
    } {
        const totalLessons = lessonProgresses.length;
        const watchedLessons = lessonProgresses.filter(lp => lp.isWatched).length;
        const completionPercentage = totalLessons > 0 ? Math.round((watchedLessons / totalLessons) * 100) : 0;

        const totalBlocks = new Set(lessonProgresses.map(lp => lp.blockId)).size;
        const completedBlocks = userCourseProgress.completedBlocks?.length || 0;

        // Module hisoblash (har 30 dars = 1 module)
        const currentModule = Math.ceil(userCourseProgress.currentLessonOrder / 30);

        // Track da ekanligini tekshirish (keyingi dars mavjudmi)
        const nextLessonExists = lessonProgresses.some(lp =>
            lp.lessonOrder === userCourseProgress.currentLessonOrder + 1 && lp.isUnlocked
        );

        return {
            completionPercentage,
            watchedLessonsCount: watchedLessons,
            totalLessonsCount: totalLessons,
            completedBlocksCount: completedBlocks,
            totalBlocksCount: totalBlocks,
            currentModule,
            isOnTrack: nextLessonExists || userCourseProgress.currentLessonOrder >= totalLessons,
        };
    }
}
