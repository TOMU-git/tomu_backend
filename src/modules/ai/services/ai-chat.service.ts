import { Injectable, BadRequestException } from "@nestjs/common";
import { Inject } from "@nestjs/common";
import { IAIChatSessionRepository } from "../interfaces/ai-chat-session.repository";
import { IAIChatMessageRepository } from "../interfaces/ai-chat-message.repository";
import { IUserAIProfileRepository } from "../interfaces/user-ai-profile.repository";
import { IUserCourseProgressRepository } from "../interfaces/user-course-progress.repository";
import { GPTService } from "./gpt.service";
import { TTSService } from "./tts.service";
import { WhisperService } from "./whisper.service";
import { ChromaService } from "./chroma.service";
import { AIChatMessage } from "../entities/ai-chat-message.entity";
import { AIChatSession } from "../entities/ai-chat-session.entity";
import { ID } from "src/common/types/type";
import { TranslationService } from "./translation.service";
import { AI_ERROR_MESSAGES } from "../constants/error-messages";
import { SessionForbiddenException } from "../exceptions/session-forbidden.exception";
import { AI_LIMITS } from "../constants/ai-constants";
import { LessonProgress } from "src/modules/lesson-progress/entities/lesson-progress.entity";
import { ILessonProgressService } from "src/modules/lesson-progress/interfaces/lesson-progress.service";
import { ArabicTextUtils } from "../utils/arabic-text.util";
import { AIChatMessageFactory } from "./ai-chat-message-factory.service";
import { VoiceProcessingPipeline, VoiceInput } from "./voice-processing-pipeline.service";

/**
 * AIChatService
 * -------------------------------------------------------
 * Maqsad:
 *  - Text va voice chat so'rovlarini yagona pipeline orqali qayta ishlash
 *  - Kontekst yig'ish (UserAIProfile, UserCourseProgress, Chroma)
 *  - Limit siyosati (moduleLimit/useStrictMode)ga rioya qilish
 *  - Xabarlarni saqlash va sessiya lifecycle ni yuritish
 */
@Injectable()
export class AIChatService {
    constructor(
        @Inject('IAIChatSessionRepository') private readonly sessionRepo: IAIChatSessionRepository,
        @Inject('IAIChatMessageRepository') private readonly messageRepo: IAIChatMessageRepository,
        @Inject('IUserAIProfileRepository') private readonly profileRepo: IUserAIProfileRepository,
        @Inject('IUserCourseProgressRepository') private readonly progressRepo: IUserCourseProgressRepository,
        private readonly gpt: GPTService,
        private readonly tts: TTSService,
        private readonly whisper: WhisperService,
        private readonly chroma: ChromaService,
        private readonly translation: TranslationService,
        @Inject('ILessonProgressService') private readonly lessonProgressService: ILessonProgressService,
        private readonly messageFactory: AIChatMessageFactory,
        private readonly voicePipeline: VoiceProcessingPipeline,
    ) { }

    /**
     * Sessiya yaratish yoki mavjudini qaytarish (title/til ixtiyoriy)
     */
    async createSession(userId: ID, courseId?: ID, sessionLanguage?: string, sessionTitle?: string): Promise<AIChatSession> {
        const session = new AIChatSession();
        session.userId = Number(userId);
        session.courseId = courseId ? Number(courseId) : null;
        session.sessionLanguage = sessionLanguage || 'uzbek';
        session.sessionTitle = sessionTitle || null;
        session.isActive = true;
        session.lastActivityAt = new Date();
        return await this.sessionRepo.create(session);
    }

    /**
     * Voice chat oqimi (audio -> STT -> GPT -> TTS)
     * Pipeline pattern orqali boshqariladi
     */
    async sendVoiceMessage(params: {
        userId: ID;
        sessionId: ID;
        audioBuffer: Buffer;
        courseId?: ID;
        language?: string;
    }): Promise<AIChatMessage> {
        const { userId, sessionId, audioBuffer, courseId, language } = params;

        // Validation
        if (!audioBuffer || audioBuffer.length === 0) {
            throw new BadRequestException(AI_ERROR_MESSAGES.AUDIO_NOT_FOUND);
        }

        // Session validation
        const session = await this.sessionRepo.findOneById(Number(sessionId));
        if (!session) {
            throw new BadRequestException(AI_ERROR_MESSAGES.SESSION_NOT_FOUND);
        }
        if (session.userId !== Number(userId)) {
            throw new SessionForbiddenException(AI_ERROR_MESSAGES.SESSION_NOT_FOUND);
        }

        // Pipeline input
        const pipelineInput: VoiceInput = {
            userId,
            sessionId,
            audioBuffer,
            courseId,
            language,
            session,
        };

        // User ma'lumotlarini console ga chiqarish
        await this.logUserInfo(userId, courseId ?? session.courseId);

        // Pipeline execution
        const result = await this.voicePipeline.execute(pipelineInput);

        // Save message and update session
        const saved = await this.messageRepo.create(result.message);
        result.session.lastActivityAt = new Date();
        await this.sessionRepo.update(result.session);

        return saved;
    }

    /**
     * Sessiya xabarlarini olish
     */
    async getMessages(sessionId: ID): Promise<AIChatMessage[]> {
        return this.messageRepo.findBySessionIdOrdered(Number(sessionId));
    }

    // -------------------- Ichki yordamchi metodlar --------------------

    /**
     * Kontekst yig'ish: foydalanuvchi darajasi va kelgan darsigacha bo'lgan materiallar
     */
    private async buildContext(params: { userId: number; courseId?: ID }): Promise<any> {
        const { userId, courseId } = params;

        // 1. Foydalanuvchi AI profili (til, moduleLimit, useStrictMode)
        const profile = await this.getUserAIProfile(userId);

        // 2. Kurs progressi (hozirgi dars, tugallanganlar, kurs tili)
        const courseProgress = await this.getUserCourseProgress(userId, courseId);

        // 3. Dars progressi (ko'rilgan/unlocked darslar)
        const lessonProgresses = await this.getLessonProgresses(userId, courseId);

        // 4. Chroma kontekst (kurs materiallari) - faqat kelgan darsigacha
        const chromaContext = await this.getChromaContext(userId, courseId, profile);

        return {
            profile,
            courseProgress,
            lessonProgresses,
            chromaContext,
            // Foydalanuvchi darajasi uchun qo'shimcha ma'lumotlar
            userLevel: this.buildUserLevel(courseProgress, lessonProgresses)
        };
    }

    /**
     * Foydalanuvchi AI profili olish
     */
    private async getUserAIProfile(userId: number): Promise<any> {
        return await this.profileRepo.findByUserId(userId);
    }

    /**
     * Foydalanuvchi kurs progressi olish
     */
    private async getUserCourseProgress(userId: number, courseId?: ID): Promise<any> {
        return courseId ? await this.progressRepo.findByUserIdAndCourseId(userId, Number(courseId)) : null;
    }

    /**
     * Dars progresslari olish
     */
    private async getLessonProgresses(userId: number, courseId?: ID): Promise<LessonProgress[]> {
        if (!courseId) return [];

        try {
            const lessonProgressResult = await this.lessonProgressService.getVideos(userId, courseId);
            if (lessonProgressResult.statusCode === 200) {
                return lessonProgressResult.data || [];
            }
        } catch (error) {
            // Dars progressi topilmadi, bo'sh massiv qoldiramiz
            console.warn(`Lesson progress not found for user ${userId}, course ${courseId}:`, error.message);
        }
        return [];
    }

    /**
     * Chroma kontekst olish (kurs materiallari)
     */
    private async getChromaContext(userId: number, courseId?: ID, profile?: any): Promise<any[]> {
        if (!courseId) return [];

        if (profile?.useStrictMode) {
            // Strict mode: faqat moduleLimit ichidagi materiallar
            const maxModule = profile?.moduleLimit || 7;
            return await this.chroma.searchContext({
                userId,
                courseId: Number(courseId),
                moduleLimit: maxModule
            });
        } else {
            // General mode: barcha kurs materiallari, lekin current lesson ustunlik
            return await this.chroma.searchContext({
                userId,
                courseId: Number(courseId)
            });
        }
    }

    /**
     * Foydalanuvchi darajasi ma'lumotlarini yig'ish
     * - currentLessonId/currentLessonOrder
     * - completedLessons/completedBlocks
     * - watched/unlocked lessons
     */
    private buildUserLevel(courseProgress: any, lessonProgresses: LessonProgress[]): any {
        return {
            currentLessonId: courseProgress?.currentLessonId,
            currentLessonOrder: courseProgress?.currentLessonOrder,
            completedLessons: courseProgress?.completedLessons || [],
            completedBlocks: courseProgress?.completedBlocks || [],
            courseLanguage: courseProgress?.courseLanguage,
            watchedLessons: (lessonProgresses || [])
                .filter(lp => lp?.isWatched)
                .map(lp => lp?.lesson?.id),
            unlockedLessons: (lessonProgresses || [])
                .filter(lp => lp?.isUnlocked)
                .map(lp => lp?.lesson?.id),
        };
    }

    /**
     * Foydalanuvchi ma'lumotlarini console ga chiqarish (test uchun)
     */
    private async logUserInfo(userId: ID, courseId?: ID): Promise<void> {
        try {
            console.log('\n👤 ===== USER INFO =====');
            console.log(`🆔 User ID: ${userId}`);

            if (courseId) {
                console.log(`📚 Course ID: ${courseId}`);

                // AI Profile
                const profile = await this.profileRepo.findByUserId(Number(userId));
                if (profile) {
                    console.log(`🎯 AI Profile:`);
                    console.log(`   - Preferred Language: ${profile.preferredLanguage || 'uzbek'}`);
                    console.log(`   - Module Limit: ${profile.moduleLimit || 7}`);
                    console.log(`   - Strict Mode: ${profile.useStrictMode ? 'ON' : 'OFF'}`);
                } else {
                    console.log(`⚠️ AI Profile: Not found`);
                }

                // Course Progress
                const courseProgress = await this.progressRepo.findByUserIdAndCourseId(Number(userId), Number(courseId));
                if (courseProgress) {
                    console.log(`📈 Course Progress:`);
                    console.log(`   - Current Lesson ID: ${courseProgress.currentLessonId || 'N/A'}`);
                    console.log(`   - Current Lesson Order: ${courseProgress.currentLessonOrder || 0}`);
                    console.log(`   - Course Language: ${courseProgress.courseLanguage || 'N/A'}`);
                    console.log(`   - Completed Lessons: ${courseProgress.completedLessons?.length || 0}`);
                    console.log(`   - Completed Blocks: ${courseProgress.completedBlocks?.length || 0}`);
                } else {
                    console.log(`⚠️ Course Progress: Not found`);
                }

                // Lesson Progress - Course 2 uchun blockId topish kerak
                try {
                    // Avval Course 2 uchun blockId ni topamiz
                    const courseProgress = await this.progressRepo.findByUserIdAndCourseId(Number(userId), Number(courseId));
                    if (courseProgress && courseProgress.currentBlockId) {
                        const lessonProgressResult = await this.lessonProgressService.getVideos(Number(userId), courseProgress.currentBlockId);
                        if (lessonProgressResult.statusCode === 200 && lessonProgressResult.data) {
                            const lessons = lessonProgressResult.data;
                            const watchedCount = lessons.filter(lp => lp.isWatched).length;
                            const unlockedCount = lessons.filter(lp => lp.isUnlocked).length;

                            console.log(`📖 Lesson Progress:`);
                            console.log(`   - Total Lessons: ${lessons.length}`);
                            console.log(`   - Watched: ${watchedCount}`);
                            console.log(`   - Unlocked: ${unlockedCount}`);

                            // Eng oxirgi ko'rilgan dars
                            const lastWatched = lessons
                                .filter(lp => lp.isWatched)
                                .sort((a, b) => b.lessonOrder - a.lessonOrder)[0];
                            if (lastWatched) {
                                console.log(`   - Last Watched: Lesson ${lastWatched.lessonOrder}`);
                            }
                        } else {
                            console.log(`⚠️ Lesson Progress: Failed to load`);
                        }
                    } else {
                        console.log(`⚠️ Course Progress not found for lesson progress lookup`);
                    }
                } catch (error) {
                    console.log(`⚠️ Lesson Progress: Error - ${error.message}`);
                }
            } else {
                console.log(`📚 Course ID: Not specified`);
            }

            console.log('========================\n');
        } catch (error) {
            console.log(`❌ Error logging user info: ${error.message}`);
        }
    }

    /**
     * Limit siyosatini baholash: foydalanuvchi darajasi va kelgan darsigacha bo'lgan materiallar
     */
    private evaluateWithinLimit(context: any): boolean {
        const profile = context?.profile;
        const userLevel = context?.userLevel;

        if (!profile?.useStrictMode) {
            // General mode: barcha materiallar ruxsat etilgan
            return true;
        }

        // Strict mode: faqat moduleLimit ichidagi materiallar
        const maxModule = profile?.moduleLimit || 7;
        const currentOrder = userLevel?.currentLessonOrder || 0;

        // Foydalanuvchi hozirgi dars tartibi moduleLimit dan kichik yoki teng bo'lsa, within limit
        return currentOrder <= maxModule;
    }

    /**
     * Audit uchun kontekstni kesish
     */
    private truncateContext(context: any): any {
        try {
            const json = JSON.stringify(context);
            if (json.length <= AI_LIMITS.CONTEXT_JSON_MAX) return context;
            return { note: 'context truncated', size: json.length };
        } catch {
            return { note: 'context not serializable' };
        }
    }

    /**
     * Material audiosi mavjud bo'lsa, birinchi mos audioUrl ni qaytaradi
     */
    private pickMaterialAudio(context: any): string | null {
        const chunks: Array<any> = context?.chromaContext || context?.chroma || [];
        const found = chunks.find((c) => !!c.audioUrl);
        return found?.audioUrl ?? null;
    }

}


