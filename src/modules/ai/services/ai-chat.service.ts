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
import { UserAIProfile } from "../entities/user-ai-profile.entity";

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
        session.sessionLanguage = sessionLanguage || 'ar';
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
        const chromaContext = await this.getChromaContext(userId, courseId, courseProgress, profile);

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
        let profile = await this.profileRepo.findByUserId(userId);

        // Agar profil yo'q bo'lsa, avtomatik yaratish
        if (!profile) {
            profile = new UserAIProfile();
            profile.userId = userId;
            profile.preferredLanguage = 'arabic'; // Arabic kurs uchun
            profile.moduleLimit = 7;
            profile.useStrictMode = true;
            profile.learningGoals = [];
            profile.weakAreas = [];

            profile = await this.profileRepo.create(profile);
            console.log(`✅ AI Profile auto-created for user ${userId}`);
        }

        return profile;
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
            // Avval course progress orqali currentBlockId ni topish
            const courseProgress = await this.progressRepo.findByUserIdAndCourseId(Number(userId), Number(courseId));
            if (!courseProgress || !courseProgress.currentBlockId) {
                console.warn(`Course progress or currentBlockId not found for user ${userId}, course ${courseId}`);
                return [];
            }

            const blockId = courseProgress.currentBlockId;
            const lessonProgressResult = await this.lessonProgressService.getVideos(userId, blockId);
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
    private async getChromaContext(
        userId: number,
        courseId?: ID,
        courseProgress?: any,
        profile?: any
    ): Promise<any[]> {
        if (!courseId) return [];

        // Course progress dan current lesson order ni olish (parameter orqali)
        console.log(`🔍 [DEBUG] courseProgress (from parameter):`, JSON.stringify(courseProgress, null, 2));

        const currentLessonOrder = courseProgress?.currentLessonOrder;
        console.log(`🔍 [DEBUG] currentLessonOrder extracted: ${currentLessonOrder}`);

        if (profile?.useStrictMode && currentLessonOrder) {
            // Strict mode: faqat kelgan darsigacha bo'lgan materiallar
            console.log(`🔒 Strict Mode: Filtering lessons up to order ${currentLessonOrder}`);
            return await this.chroma.searchContext({
                userId,
                courseId: Number(courseId),
                language: 'ar',
                maxLessonOrder: currentLessonOrder,
                strict: true
            });
        } else {
            // General mode yoki currentLessonOrder yo'q bo'lsa: barcha kurs materiallari
            if (profile?.useStrictMode && !currentLessonOrder) {
                console.warn(`⚠️ Strict mode enabled but currentLessonOrder is ${currentLessonOrder}. Using general mode.`);
            }
            return await this.chroma.searchContext({
                userId,
                courseId: Number(courseId),
                language: 'ar'
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

                // AI Profile - auto-create if not exists
                const profile = await this.getUserAIProfile(Number(userId));
                if (profile) {
                    console.log(`🎯 AI Profile:`);
                    console.log(`   - Preferred Language: ${profile.preferredLanguage || 'ar'}`);
                    console.log(`   - Module Limit: ${profile.moduleLimit || 7}`);
                    console.log(`   - Strict Mode: ${profile.useStrictMode ? 'ON' : 'OFF'}`);
                } else {
                    console.log(`⚠️ AI Profile: Failed to create`);
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

                    if (!courseProgress) {
                        console.log(`⚠️ Lesson Progress: Course progress not found`);
                    } else if (!courseProgress.currentBlockId) {
                        console.log(`⚠️ Lesson Progress: currentBlockId is null/undefined`);
                        console.log(`   - Suggestion: User needs to start the course first`);
                    } else {
                        console.log(`🔍 Fetching lesson progress for blockId: ${courseProgress.currentBlockId}`);
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
                            console.log(`⚠️ Lesson Progress: API returned statusCode ${lessonProgressResult.statusCode}`);
                        }
                    }
                } catch (error) {
                    console.log(`⚠️ Lesson Progress: Error - ${error.message}`);
                    console.log(`   - Stack: ${error.stack}`);
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


