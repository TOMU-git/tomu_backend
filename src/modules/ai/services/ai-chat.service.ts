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
     * Faqat ovoz orqali muloqot, text kiritish mumkin emas
     */
    async sendVoiceMessage(params: {
        userId: ID;
        sessionId: ID;
        audioBuffer: Buffer;
        courseId?: ID;
    }): Promise<AIChatMessage> {
        const { userId, sessionId, audioBuffer, courseId } = params;
        if (!audioBuffer || audioBuffer.length === 0) throw new BadRequestException(AI_ERROR_MESSAGES.AUDIO_NOT_FOUND);

        const session = await this.sessionRepo.findOneById(Number(sessionId));
        if (!session) throw new BadRequestException(AI_ERROR_MESSAGES.SESSION_NOT_FOUND);
        if (session.userId !== Number(userId)) throw new SessionForbiddenException(AI_ERROR_MESSAGES.SESSION_NOT_FOUND);

        // STT
        const text = await this.whisper.speechToText({ audio: audioBuffer });

        // Kontekst va limit
        const context = await this.buildContext({ userId: Number(userId), courseId: courseId ?? session.courseId });
        const withinLimit = this.evaluateWithinLimit(context);

        // GPT
        const aiResponse = await this.gpt.generate({
            prompt: text,
            context,
            language: context.profile?.preferredLanguage || session.sessionLanguage,
            strict: context.profile?.useStrictMode ?? true,
        });

        const aiResponseUz = await this.translation.translateToUzbek(aiResponse || '');

        const message = new AIChatMessage();
        message.sessionId = Number(sessionId);
        message.senderType = 'ai';
        message.originalText = text;
        message.aiResponseText = aiResponse;
        message.aiResponseUzbek = aiResponseUz;
        message.isWithinLimit = withinLimit;
        message.messageLanguage = session.sessionLanguage;
        message.contextUsed = this.truncateContext(context);

        // Audio strategiyasi: materialda audio bo'lsa, TTS o'rniga uni qaytaramiz
        const materialAudio = this.pickMaterialAudio(context);
        if (materialAudio) {
            message.audioUrl = materialAudio;
        } else {
            message.audioUrl = await this.tts.textToSpeech({ text: aiResponseUz || aiResponse || '', language: 'uzbek' });
        }

        const saved = await this.messageRepo.create(message);
        session.lastActivityAt = new Date();
        await this.sessionRepo.update(session);
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
        const profile = await this.profileRepo.findByUserId(userId);

        // 2. Kurs progressi (hozirgi dars, tugallanganlar, kurs tili)
        const courseProgress = courseId ? await this.progressRepo.findByUserIdAndCourseId(userId, Number(courseId)) : null;

        // 3. Dars progressi (ko'rilgan/unlocked darslar)
        let lessonProgresses: LessonProgress[] = [];
        if (courseId) {
            try {
                const lessonProgressResult = await this.lessonProgressService.getVideos(userId, courseId);
                if (lessonProgressResult.statusCode === 200) {
                    lessonProgresses = lessonProgressResult.data || [];
                }
            } catch (error) {
                // Dars progressi topilmadi, bo'sh massiv qoldiramiz
                console.warn(`Lesson progress not found for user ${userId}, course ${courseId}:`, error.message);
            }
        }

        // 4. Chroma kontekst (kurs materiallari) - faqat kelgan darsigacha
        let chromaContext: any[] = [];
        if (courseId && profile?.useStrictMode) {
            // Strict mode: faqat moduleLimit ichidagi materiallar
            const maxModule = profile?.moduleLimit || 7;
            chromaContext = await this.chroma.searchContext({
                userId,
                courseId: Number(courseId),
                moduleLimit: maxModule
            });
        } else if (courseId) {
            // General mode: barcha kurs materiallari, lekin current lesson ustunlik
            chromaContext = await this.chroma.searchContext({
                userId,
                courseId: Number(courseId)
            });
        }

        return {
            profile,
            courseProgress,
            lessonProgresses,
            chromaContext,
            // Foydalanuvchi darajasi uchun qo'shimcha ma'lumotlar
            userLevel: {
                currentLessonId: courseProgress?.currentLessonId,
                currentLessonOrder: courseProgress?.currentLessonOrder,
                completedLessons: courseProgress?.completedLessons || [],
                completedBlocks: courseProgress?.completedBlocks || [],
                courseLanguage: courseProgress?.courseLanguage,
                watchedLessons: lessonProgresses.filter(lp => lp.isWatched).map(lp => lp.lesson?.id),
                unlockedLessons: lessonProgresses.filter(lp => lp.isUnlocked).map(lp => lp.lesson?.id),
            }
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
}


