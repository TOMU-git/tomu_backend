import { Injectable, BadRequestException } from "@nestjs/common";
import { Inject } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
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
import { InvalidSessionException } from "../exceptions";
import { AI_LIMITS } from "../constants/ai-constants";
import { LessonProgress } from "src/modules/lesson-progress/entities/lesson-progress.entity";
import { ILessonProgressService } from "src/modules/lesson-progress/interfaces/lesson-progress.service";
import { ArabicTextUtils } from "../utils/arabic-text.util";
import { AIChatMessageFactory } from "./ai-chat-message-factory.service";
import { VoiceProcessingPipeline, VoiceInput } from "./voice-processing-pipeline.service";
import { UserAIProfile } from "../entities/user-ai-profile.entity";
import { LimitCheckService } from "./limit-check.service";
import { CostCalculationService } from "./cost-calculation.service";
import { LimitExceededException } from "../exceptions/limit-exceeded.exception";

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
    private readonly accessGeneral: boolean;

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
        private readonly costCalculator: CostCalculationService, // Cost estimation uchun
        private readonly configService: ConfigService, // ACCESS_GENERAL flag uchun
    ) {
        // Environment variable'dan erkin rejim flag'ini o'qish
        this.accessGeneral = this.configService.get<string>("ACCESS_GENERAL") === "true";
    }

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
     * Smart Session: Mavjud faol sessiyani qaytarish yoki yangi yaratish
     * Bu metod har safar AI button bosilganda yangi sessiya yaratilishining oldini oladi
     * 
     * Avtomatik aniqlash:
     * - Agar mavjud faol sessiya bo'lsa (bir xil courseId va sessionLanguage bilan) → qaytaradi
     * - Agar mavjud sessiya bo'lmasa → yangi yaratadi
     * 
     * @param userId - Foydalanuvchi ID
     * @param courseId - Kurs ID (ixtiyoriy)
     * @param sessionLanguage - Sessiya tili (default: 'ar')
     * @param sessionTitle - Sessiya sarlavhasi (ixtiyoriy)
     * @returns Mavjud yoki yangi yaratilgan sessiya
     */
    async getOrCreateSession(
        userId: ID,
        courseId?: ID,
        sessionLanguage?: string,
        sessionTitle?: string
    ): Promise<AIChatSession> {
        const finalLanguage = sessionLanguage || 'ar';

        // Mavjud faol sessiyani topish
        // courseId va sessionLanguage bo'yicha filtrlash
        let existingSession: AIChatSession | null = null;

        if (courseId) {
            // Kurs uchun maxsus sessiyalar - bir xil courseId va sessionLanguage bo'lgan faol sessiya
            const sessions = await this.sessionRepo.findByUserIdAndCourseId(Number(userId), Number(courseId));
            existingSession = sessions.find(s => s.isActive && s.sessionLanguage === finalLanguage) || null;
        } else {
            // Umumiy sessiya (courseId = null bo'lgan) - bir xil sessionLanguage bo'lgan faol sessiya
            const allSessions = await this.sessionRepo.findByUserId(Number(userId));
            existingSession = allSessions.find(s =>
                s.isActive &&
                s.courseId === null &&
                s.sessionLanguage === finalLanguage
            ) || null;
        }

        // Agar mavjud faol sessiya topilsa, uni qaytarish
        if (existingSession) {
            // lastActivityAt ni yangilash
            existingSession.lastActivityAt = new Date();
            const updated = await this.sessionRepo.update(existingSession);

            // Xabarlarni yuklash va qaytarish (oxirgi 15 ta)
            // // console.log(`[getOrCreateSession] Loading messages for session ${updated.id}...`);
            const allMessages = await this.messageRepo.findBySessionIdOrdered(updated.id as number);
            updated.messages = allMessages.slice(-15); // Oxirgi 15 ta message
            // // console.log(`[getOrCreateSession] Loaded ${updated.messages.length} messages for session ${updated.id}`);
            return updated;
        }

        // Mavjud sessiya topilmasa, yangi yaratish
        const newSession = await this.createSession(userId, courseId, finalLanguage, sessionTitle);

        // Yangi sessiya uchun bo'sh messages array qo'shish
        newSession.messages = [];
        return newSession;
    }

    /**
     * Foydalanuvchi limit holatini tekshirish
     * Session yaratishda ishlatiladi
     * @param userId - Foydalanuvchi ID
     * @param courseId - Kurs ID (optional - agar berilmasa, barcha kurslar bo'yicha umumiy limit ko'rsatiladi)
     */
    async checkUserLimitStatus(userId: ID, courseId?: number | null): Promise<{
        canProceed: boolean;
        currentCost: number;
        limit: number;
        remaining: number;
    }> {
        // Agar courseId berilgan bo'lsa, shu kurs uchun limit tekshiramiz
        // Agar berilmagan bo'lsa, umumiy limit tekshiramiz (barcha kurslar bo'yicha)
        const finalCourseId = courseId !== undefined ? courseId : null;
        const limitCheck = await this.limitCheck.checkMonthlyLimit(userId, finalCourseId);
        return {
            canProceed: limitCheck.canProceed,
            currentCost: limitCheck.currentCost,
            limit: limitCheck.limit,
            remaining: limitCheck.remaining,
        };
    }

    /**
     * Text chat oqimi (text -> GPT -> TTS)
     * Pipeline pattern orqali boshqariladi (STT bosqichini o'tkazib yuboradi)
     * courseId va language session'dan olinadi
     */
    async sendTextMessage(params: {
        userId: ID;
        sessionId: ID;
        text: string;
    }): Promise<AIChatMessage> {
        const { userId, sessionId, text } = params;

        // Validation
        if (!text || text.trim().length === 0) {
            throw new BadRequestException('Text xabar bo\'sh bo\'lishi mumkin emas');
        }

        // Session validation
        const session = await this.sessionRepo.findOneById(Number(sessionId));
        if (!session) {
            throw new BadRequestException(AI_ERROR_MESSAGES.SESSION_NOT_FOUND);
        }
        if (session.userId !== Number(userId)) {
            throw new InvalidSessionException({
                sessionId: Number(sessionId),
                userId: Number(userId),
                reason: 'forbidden'
            });
        }

        // Session'dan courseId va language ni olish
        const finalCourseId = session.courseId || undefined;
        const finalLanguage = session.sessionLanguage || 'ar';

        // Pre-flight limit check
        try {
            const estimatedCost = this.costCalculator.estimateCost({
                textLength: text.length,
            });
            const courseIdForLimit = session.courseId || null;
            const limitCheck = await this.limitCheck.checkMonthlyLimit(userId, courseIdForLimit, estimatedCost.totalCost);
            if (!limitCheck.canProceed) {
                throw new LimitExceededException({
                    currentCost: limitCheck.currentCost,
                    limit: limitCheck.limit,
                    remaining: limitCheck.remaining,
                    courseId: courseIdForLimit,
                    month: new Date().toISOString().slice(0, 7),
                });
            }
        } catch (error: any) {
            if (error instanceof LimitExceededException) {
                throw error;
            }
        }

        // Pipeline input - text bilan (STT bosqichini o'tkazib yuboramiz)
        const pipelineInput: VoiceInput & { transcribedText: string } = {
            userId,
            sessionId,
            audioBuffer: Buffer.from(''), // Bo'sh buffer (ishlatilmaydi)
            courseId: finalCourseId,
            language: finalLanguage,
            session,
            transcribedText: text.trim(), // To'g'ridan-to'g'ri text
        };

        // Foydalanuvchi xabarini saqlash
        const userMessage = await this.messageFactory.createUserMessage(
            Number(sessionId),
            text.trim()
        );
        const savedUserMessage = await this.messageRepo.create(userMessage);

        // Pipeline execution - STT bosqichini o'tkazib yuborish uchun alohida execute
        // AI javob vaqtini o'lchash
        const aiResponseStartTime = Date.now();
        const result = await this.voicePipeline.executeWithText(pipelineInput);
        const aiResponseTime = Date.now() - aiResponseStartTime;

        // 2. Userni text console ga chiqar
        console.log('User text:', text.trim());
        const userTextLatin = ArabicTextUtils.transliterateArabic(text.trim());
        console.log('User text (latin):', userTextLatin);

      

        // 1. AI javob qaytarishiga qancha vaqt ketganini chiqarib qo'y
        console.log(`AI javob vaqti: ${aiResponseTime}ms (${(aiResponseTime / 1000).toFixed(2)}s)`);

        // AI javobini saqlash
        const saved = await this.messageRepo.create(result.message);

        result.session.lastActivityAt = new Date();
        await this.sessionRepo.update(result.session);

        // Cost tracking
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
            // Cost tracking xatosi request'ni to'xtatmaydi
        }

        return saved;
    }

    /**
     * Voice chat oqimi (audio -> STT -> GPT -> TTS)
     * Pipeline pattern orqali boshqariladi
     * courseId va language session'dan olinadi
     */
    async sendVoiceMessage(params: {
        userId: ID;
        sessionId: ID;
        audioBuffer: Buffer;
        mimetype?: string; // Audio MIME type
    }): Promise<AIChatMessage> {
        const { userId, sessionId, audioBuffer, mimetype } = params;

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
            throw new InvalidSessionException({
                sessionId: Number(sessionId),
                userId: Number(userId),
                reason: 'forbidden'
            });
        }

        // Session'dan courseId va language ni olish (session yaratilganda berilgan)
        const finalCourseId = session.courseId;
        const finalLanguage = session.sessionLanguage;

        // Pre-flight limit check - message saqlashdan OLDIN tekshirish
        // Bu limit oshib ketgan holatda message saqlanishini oldini oladi
        // Har bir kurs uchun alohida limit tekshiriladi
        try {
            const estimatedCost = this.costCalculator.estimateCost({
                audioBufferSize: audioBuffer.length,
            });
            const courseId = session.courseId || null; // null = umumiy chat
            const limitCheck = await this.limitCheck.checkMonthlyLimit(userId, courseId, estimatedCost.totalCost);
            if (!limitCheck.canProceed) {
                // Limit oshib ketgan bo'lsa, exception tashlash
                throw new LimitExceededException({
                    currentCost: limitCheck.currentCost,
                    limit: limitCheck.limit,
                    remaining: limitCheck.remaining,
                    courseId: courseId,
                    month: new Date().toISOString().slice(0, 7),
                });
            }
        } catch (error: any) {
            // LimitExceededException'ni re-throw qilish
            if (error instanceof LimitExceededException) {
                throw error;
            }
            // Boshqa xatolar uchun log (lekin pipeline'ni davom ettirish)
            // console.warn('⚠️  Pre-flight limit check xatosi (devam etiladi):', error.message);
        }

        // Pipeline input - session'dan olingan ma'lumotlarni ishlatish
        const pipelineInput: VoiceInput = {
            userId,
            sessionId,
            audioBuffer,
            courseId: finalCourseId,
            language: finalLanguage,
            session,
        };

        // Foydalanuvchi audio faylini saqlash
        let userAudioUrl: string | null = null;
        try {
            // Audio faylni saqlash
            userAudioUrl = await this.messageFactory.saveUserAudio(
                audioBuffer,
                mimetype || 'audio/webm' // MIME type yoki default
            );
        } catch (error: any) {
            // Audio saqlash xatosi request'ni to'xtatmaydi
            console.error(`[AI Chat Service] Error saving user audio: ${error.message}`);
        }

        // Pipeline execution - AI javob vaqtini o'lchash
        const aiResponseStartTime = Date.now();
        const result = await this.voicePipeline.execute(pipelineInput);
        const aiResponseTime = Date.now() - aiResponseStartTime;

        // Foydalanuvchi xabarini saqlash (STT natijasi va audio URL)
        // Pipeline'dan transcribedText olish
        const userText = result.transcribedText || (pipelineInput as any).transcribedText || '';

        // 1. AI javob qaytarishiga qancha vaqt ketganini chiqarib qo'y
        console.log(`AI javob vaqti: ${aiResponseTime}ms (${(aiResponseTime / 1000).toFixed(2)}s)`);

        // 2. Userni text console ga chiqar
        console.log('User text:', userText);
        if (userText) {
            const userTextLatin = ArabicTextUtils.transliterateArabic(userText);
            console.log('User text (latin):', userTextLatin);

            // 3. User matnining tarjimasini chiqarish
            try {
                const userTextTranslation = await this.translation.translateToUzbek(userText);
                if (userTextTranslation) {
                    console.log('User text (uzbek):', userTextTranslation);
                }
            } catch (error) {
                console.warn('Translation failed for user text:', error);
            }
        }
        if (userText) {
            // User audio duration'ni usage'dan olish (Whisper'dan)
            const userAudioDuration = (result as any).usage?.whisper?.duration || null;

            const userMessage = await this.messageFactory.createUserMessage(
                Number(sessionId),
                userText,
                userAudioUrl || undefined,
                userAudioDuration // User audio duration
            );
            await this.messageRepo.create(userMessage);
        }

        // Debug: AI message OLDIN saqlash
        console.log(`[AIChatService] AI message BEFORE save:`, {
            audioDuration: result.message.audioDuration,
            audioUrl: result.message.audioUrl,
            senderType: result.message.senderType
        });

        // AI javobini saqlash
        const saved = await this.messageRepo.create(result.message);

        // Debug: AI message KEYIN saqlash
        console.log(`[AIChatService] AI message AFTER save:`, {
            id: saved.id,
            audioDuration: saved.audioDuration,
            audioUrl: saved.audioUrl,
            senderType: saved.senderType
        });

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
            // console.error('❌ Cost tracking error after message save:', error.message);
        }

        return saved;
    }

    /**
     * Sessiya xabarlarini olish
     * Sessiya mavjudligini va egasini tekshiradi
     */
    async getMessages(sessionId: ID, userId: ID): Promise<AIChatMessage[]> {
        // // console.log(`[getMessages] Request: sessionId=${sessionId}, userId=${userId}`);

        // Sessiya mavjudligini tekshirish
        const session = await this.sessionRepo.findOneById(Number(sessionId));
        if (!session) {
            // console.warn(`[getMessages] ❌ Session not found: ${sessionId}`);
            throw new BadRequestException(AI_ERROR_MESSAGES.SESSION_NOT_FOUND);
        }

        // // console.log(`[getMessages] ✅ Session found: id=${session.id}, userId=${session.userId}, isActive=${session.isActive}`);

        // Sessiya egasini tekshirish
        if (session.userId !== Number(userId)) {
            // console.warn(`[getMessages] ❌ Session owner mismatch. Request userId=${userId}, Session userId=${session.userId}, sessionId=${sessionId}`);
            throw new InvalidSessionException({
                sessionId: Number(sessionId),
                userId: Number(userId),
                reason: 'forbidden'
            });
        }

        // Xabarlarni olish
        // // console.log(`[getMessages] 🔍 Querying messages for session ${sessionId}...`);
        const messages = await this.messageRepo.findBySessionIdOrdered(Number(sessionId));
        // console.log(`[AI Chat Service] Found ${messages.length} messages for session ${sessionId}`);

        // Debug: Agar xabarlar bo'lsa, birinchi xabarni ko'rsatish
        // if (messages.length > 0) {
        //     // console.log(`[getMessages] 📝 First message: id=${messages[0].id}, senderType=${messages[0].senderType}, hasText=${!!messages[0].originalText || !!messages[0].aiResponseText}`);
        // } else {
        //     // console.log(`[getMessages] ⚠️ No messages found for session ${sessionId}. This is normal if no messages have been sent yet.`);
        // }

        return messages;
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
        // ACCESS_GENERAL=true bo'lsa: materiallardan qidirmaslik
        if (this.accessGeneral) {
            // console.log(`🌐 ACCESS_GENERAL rejimi: ChromaDB qidiruvi o'tkazib yuborildi`);
            return [];
        }

        if (!courseId) return [];

        const currentLessonOrder = courseProgress?.currentLessonOrder || 0;
        const useStrictMode = profile?.useStrictMode ?? true; // Default: strict mode
        const moduleLimit = profile?.moduleLimit || 7;

        // console.log(`📚 Getting Chroma context:`);
        // console.log(`   - User progress: currentLessonOrder = ${currentLessonOrder}`);
        // console.log(`   - Profile: useStrictMode = ${useStrictMode}, moduleLimit = ${moduleLimit}`);
        // console.log(`   - User query: "${userQuery || '(none)'}"`);

        // IMPORTANT: Agar currentLessonOrder 0 bo'lsa (hech qanday dars ko'rilmagan),
        // lekin user 1-darsdan gapirishi mumkin - shuning uchun kamida 1-darsni include qilamiz
        // Yoki agar currentLessonOrder 1 yoki undan katta bo'lsa, shu darsgacha include qilamiz
        const effectiveMaxLessonOrder = currentLessonOrder > 0 ? currentLessonOrder : 1;
        const effectiveStrict = useStrictMode && currentLessonOrder > 0; // 0 bo'lsa strict mode o'chiriladi

        // console.log(`   - Effective maxLessonOrder = ${effectiveMaxLessonOrder} (original: ${currentLessonOrder})`);
        // console.log(`   - Effective strict mode = ${effectiveStrict} (original: ${useStrictMode})`);

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

        // console.log(`📚 Chroma context retrieved: ${results.length} chunks`);
        if (results.length > 0) {
            const lessonOrders = [...new Set(results.map(r => r.lessonOrder))].sort((a, b) => a - b);
            // console.log(`   - Lesson orders: ${lessonOrders.join(', ')}`);
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
