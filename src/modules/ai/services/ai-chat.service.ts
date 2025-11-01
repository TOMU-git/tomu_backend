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
import { LimitCheckService } from "./limit-check.service";

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
        private readonly limitCheck: LimitCheckService, // Cost tracking uchun
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

        // Pipeline execution
        const result = await this.voicePipeline.execute(pipelineInput);

        // Save message and update session
        const saved = await this.messageRepo.create(result.message);
        result.session.lastActivityAt = new Date();
        await this.sessionRepo.update(result.session);

        // Cost tracking - message saqlangandan keyin (id mavjud bo'ladi)
        try {
            const usage = (result as any).usage;
            if (usage) {
                await this.trackCostAfterSave({
                    userId: Number(userId),
                    sessionId: saved.sessionId,
                    messageId: saved.id as unknown as number,
                    usage,
                });
            }
        } catch (error: any) {
            // Cost tracking xatosi request'ni to'xtatmaydi, faqat log qilamiz
            console.error('❌ Cost tracking error after message save:', error.message);
        }

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
    async buildContext(params: { userId: number; courseId?: ID; userQuery?: string }): Promise<any> {
        const { userId, courseId, userQuery } = params;

        // 1. Foydalanuvchi AI profili (til, moduleLimit, useStrictMode)
        const profile = await this.getUserAIProfile(userId);

        // 2. Kurs progressi (hozirgi dars, tugallanganlar, kurs tili)
        const courseProgress = await this.getUserCourseProgress(userId, courseId);

        // 3. Dars progressi (ko'rilgan/unlocked darslar)
        const lessonProgresses = await this.getLessonProgresses(userId, courseId);

        // 4. Chroma kontekst (kurs materiallari) - user query bilan RAG search
        const chromaContext = await this.getChromaContext(userId, courseId, courseProgress, profile, userQuery);

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
                return [];
            }

            const blockId = courseProgress.currentBlockId;
            const lessonProgressResult = await this.lessonProgressService.getVideos(userId, blockId);
            if (lessonProgressResult.statusCode === 200) {
                return lessonProgressResult.data || [];
            }
        } catch (error) {
            // Dars progressi topilmadi, bo'sh massiv qoldiramiz
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
        profile?: any,
        userQuery?: string // User so'rovi - RAG query uchun
    ): Promise<any[]> {
        if (!courseId) return [];

        const currentLessonOrder = courseProgress?.currentLessonOrder || 0;
        const useStrictMode = profile?.useStrictMode ?? true; // Default: strict mode
        const moduleLimit = profile?.moduleLimit || 7;

        console.log(`📚 Getting Chroma context:`);
        console.log(`   - User progress: currentLessonOrder = ${currentLessonOrder}`);
        console.log(`   - Profile: useStrictMode = ${useStrictMode}, moduleLimit = ${moduleLimit}`);
        console.log(`   - User query: "${userQuery || '(none)'}"`);

        // IMPORTANT: Agar currentLessonOrder 0 bo'lsa (hech qanday dars ko'rilmagan),
        // lekin user 1-darsdan gapirishi mumkin - shuning uchun kamida 1-darsni include qilamiz
        // Yoki agar currentLessonOrder 1 yoki undan katta bo'lsa, shu darsgacha include qilamiz
        const effectiveMaxLessonOrder = currentLessonOrder > 0 ? currentLessonOrder : 1;
        const effectiveStrict = useStrictMode && currentLessonOrder > 0; // 0 bo'lsa strict mode o'chiriladi

        console.log(`   - Effective maxLessonOrder = ${effectiveMaxLessonOrder} (original: ${currentLessonOrder})`);
        console.log(`   - Effective strict mode = ${effectiveStrict} (original: ${useStrictMode})`);

        // User so'rovini query sifatida ishlatish - bu RAG search'ni aniqroq qiladi
        // Agar userQuery bo'lmasa, umumiy query ishlatiladi
        const results = await this.chroma.searchContext({
            userId,
            courseId: Number(courseId),
            language: 'ar',
            query: userQuery || undefined, // User textini RAG query sifatida yuborish
            strict: effectiveStrict, // Strict mode: faqat kelgan darslar (lekin 0 bo'lsa o'chiriladi)
            maxLessonOrder: effectiveStrict ? effectiveMaxLessonOrder : undefined, // Strict mode: kelgan darsgacha
            moduleLimit: effectiveStrict ? moduleLimit : undefined, // Module limit
        });

        console.log(`📚 Chroma context retrieved: ${results.length} chunks`);
        if (results.length > 0) {
            const lessonOrders = [...new Set(results.map(r => r.lessonOrder))].sort((a, b) => a - b);
            console.log(`   - Lesson orders: ${lessonOrders.join(', ')}`);
        }

        return results;
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

    /**
     * Cost tracking - message saqlangandan keyin
     */
    private async trackCostAfterSave(params: {
        userId: number;
        sessionId: number;
        messageId: number;
        usage: VoiceInput['usage'];
    }): Promise<void> {
        if (!params.usage) {
            console.warn('⚠️  Usage ma\'lumotlari yo\'q, cost tracking o\'tkazilmaydi');
            return;
        }

        try {
            await this.limitCheck.saveCostAndCheckLimit({
                userId: params.userId,
                sessionId: params.sessionId,
                messageId: params.messageId,
                gptPromptTokens: params.usage.gpt?.promptTokens,
                gptCompletionTokens: params.usage.gpt?.completionTokens,
                whisperDurationSeconds: params.usage.whisper?.duration,
                ttsCharacters: params.usage.tts?.characters,
            });
        } catch (error: any) {
            // LimitExceededException - bu expected error
            // Boshqa xatolar uchun log
            if (error.constructor.name !== 'LimitExceededException') {
                console.error('❌ Unexpected error in cost tracking:', error);
            }
            throw error;
        }
    }

}


