import { Injectable, Inject, forwardRef } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { TTSService } from "../tts.service";
import { AIChatService } from "../ai-chat.service";
import { PipelineStep, VoiceInput, VoiceOutput } from "./pipeline.types";
import { AIChatMessage } from "../../entities/ai-chat-message.entity";
import { AIChatSession } from "../../entities/ai-chat-session.entity";
import { AI_LIMITS } from "../../constants/ai-constants";

/**
 * Context Step: Kontekst yaratish
 * 
 * Foydalanuvchi progress, dars materiallari va suhbat tarixini yig'ib, 
 * GPT uchun kontekst tayyorlaydi
 */
@Injectable()
export class ContextStep implements PipelineStep {
    private readonly accessGeneral: boolean;

    constructor(
        @Inject(forwardRef(() => AIChatService))
        private readonly aiChatService: AIChatService, // buildContext metodini ishlatish uchun
        private readonly tts: TTSService, // Audio yaratish uchun TTS
        private readonly configService: ConfigService // ACCESS_GENERAL flag uchun
    ) {
        // Environment variable'dan erkin rejim flag'ini o'qish
        this.accessGeneral = this.configService.get<string>("ACCESS_GENERAL") === "true";
    }

    async execute(input: VoiceInput & { validatedText: string }): Promise<VoiceInput | VoiceOutput> {
        // Foydalanuvchi matnini RAG query sifatida olish
        const userText = input.validatedText || '';

        // ACCESS_GENERAL=true bo'lsa: faqat materiallardan qidirmaslik
        // Lekin conversation history'ni yig'ish kerak (GPT uchun context)
        if (this.accessGeneral) {
            console.log(`🌐 ACCESS_GENERAL rejimi: materiallardan qidirilmaydi, erkin suhbat`);

            // Suhbat tarixini olish (erkin rejimda ham kerak!)
            let conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];
            try {
                const previousMessages = await this.aiChatService.getMessages(Number(input.sessionId), Number(input.userId));

                // ✅ FILTRLANGAN Suhbat tarixi: faqat material-based javoblar
                conversationHistory = previousMessages
                    .filter(msg => {
                        const content = msg.aiResponseText;
                        if (!content || content.trim().length === 0) {
                            return false;
                        }

                        // Fallback javoblarni olib tashlash
                        const isFallback =
                            content.includes('عَفْوًا') || // "Kechirasiz" fallback
                            content.includes('لَمْ أَسْمَعْ') || // "Eshitmadim" fallback
                            content.includes('لَمْ أَفْهَمْ') || // "Tushunmadim" fallback
                            content.includes('أَنَا لَمْ أَتَعَلَّمْ'); // "O'rganmadim" fallback

                        return !isFallback;
                    })
                    .slice(-AI_LIMITS.MAX_CONVERSATION_HISTORY)
                    .map(msg => ({
                        role: msg.senderType === 'user' ? 'user' as const : 'assistant' as const,
                        content: msg.aiResponseText || '',
                    }));
            } catch (error: any) {
                // Conversation history olishda xato bo'lsa, bo'sh array bilan davom etamiz
                conversationHistory = [];
            }

            console.log(`💬 Conversation history: ${conversationHistory.length} ta xabar`);

            return {
                ...input,
                context: [], // Bo'sh context - materiallar yo'q
                conversationHistory, // ✅ Conversation history QOLADI
                lastWatchedLessonOrder: 0, // 0 - hech qanday material yo'q
                profile: null, // Profile'ni ham ignore qilamiz
            } as VoiceInput & {
                context: any;
                conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
                lastWatchedLessonOrder: number;
                profile?: any;
            };
        }

        // To'liq kontekst olish (foydalanuvchi profili, progress, dars materiallari)
        // User textini query sifatida yuborish - RAG qidiruvni aniqroq qiladi
        let fullContext: any;
        try {
            const courseId = input.courseId || input.session?.courseId;
            const courseIdNum = courseId ? Number(courseId) : undefined;

            fullContext = await this.aiChatService.buildContext({
                userId: Number(input.userId),
                courseId: courseIdNum,
                userQuery: userText, // RAG qidiruv uchun foydalanuvchi so'rovi
            });
        } catch (error: any) {
            throw error;
        }

        const courseProgress = fullContext?.courseProgress;
        const userLevel = fullContext?.userLevel;
        const profile = fullContext?.profile;

        // Foydalanuvchi ko'rgan eng oxirgi dars tartib raqami
        const lastWatchedLessonOrder = userLevel?.currentLessonOrder || 0;

        // Kontekstdan barcha dars materiallarini olish
        const allLessons = fullContext.chromaContext || [];

        // Console log: Context yuklandi
        console.log(`📚 Context: ${allLessons.length} ta material chunk, progress: lesson ${lastWatchedLessonOrder}`);

        // Foydalanuvchi hali ko'rmagan darslar haqida gapirishga harakat qilayotganini tekshirish
        const possibleLessons = this.findPossibleFutureLessons(userText, allLessons, lastWatchedLessonOrder);

        // Agar topilgan ma'lumotlardan eng kichik lessonOrder <= currentOrder bo'lsa,
        // demak foydalanuvchi bu darsga kelgan va xabar chiqmasligi kerak
        if (possibleLessons.futureLessons.length > 0) {
            const minMentionedOrder = possibleLessons.mentioned.length > 0
                ? Math.min(...possibleLessons.mentioned)
                : Infinity;

            // Agar eng kichik mentioned order <= lastWatchedLessonOrder bo'lsa,
            // demak foydalanuvchi bu darsga kelgan, shuning uchun future lesson xabarini chiqarmaymiz
            if (minMentionedOrder <= lastWatchedLessonOrder) {
                // Foydalanuvchi kelgan dars haqida gapiryapti, xabar chiqarmaymiz
            } else {
                // Maxsus javob yaratish (hali kelmagan dars haqida)
                const message = await this.createFutureLessonMessage(input, lastWatchedLessonOrder, Math.min(...possibleLessons.futureLessons));
                return { message, session: input.session };
            }
        }

        // Suhbat tarixini olish (kontekst uchun)
        let conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];
        try {
            const previousMessages = await this.aiChatService.getMessages(Number(input.sessionId), Number(input.userId));

            // ✅ FILTRLANGAN Suhbat tarixi: faqat material-based javoblar
            conversationHistory = previousMessages
                .filter(msg => {
                    // Foydalanuvchi va AI xabarlari ikkalasi ham aiResponseText dan o'qiladi
                    const content = msg.aiResponseText;
                    if (!content || content.trim().length === 0) {
                        return false;
                    }

                    // Fallback javoblarni olib tashlash
                    const isFallback =
                        content.includes('عَفْوًا') || // "Kechirasiz" fallback
                        content.includes('لَمْ أَسْمَعْ') || // "Eshitmadim" fallback
                        content.includes('لَمْ أَفْهَمْ') || // "Tushunmadim" fallback
                        content.includes('أَنَا لَمْ أَتَعَلَّمْ'); // "O'rganmadim" fallback

                    return !isFallback;
                })
                .slice(-AI_LIMITS.MAX_CONVERSATION_HISTORY)
                .map(msg => ({
                    role: msg.senderType === 'user' ? 'user' as const : 'assistant' as const,
                    content: msg.aiResponseText || '',
                }));
        } catch (error: any) {
            // Conversation history olishda xato bo'lsa, bo'sh array bilan davom etamiz
            conversationHistory = [];
        }

        return {
            ...input,
            context: allLessons, // Dars materiallari
            conversationHistory, // Suhbat tarixi
            lastWatchedLessonOrder, // Foydalanuvchi progress - ko'rgan dars tartibi
            profile, // Foydalanuvchi profili
        } as VoiceInput & {
            context: any;
            conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
            lastWatchedLessonOrder: number;
            profile?: any;
        };
    }

    /**
     * Foydalanuvchi matnida eslatilgan darslarni topish
     * Hali ko'rilmagan darslarni aniqlash uchun
     */
    private findPossibleFutureLessons(text: string, lessons: any[], currentOrder: number): { mentioned: number[], futureLessons: number[] } {
        const mentioned: number[] = [];

        // Foydalanuvchi matnidagi maxsus so'zlarni olish (ismlar, predmetlar)
        const specialWords = this.extractSpecialWords(text);
        const userText = text.toLowerCase();

        // Har bir lesson'ni text bilan solishtiramiz
        for (const lesson of lessons) {
            if (!lesson.text) continue;

            const lessonText = lesson.text.toLowerCase();

            // To'liq matn solishtirish
            if (userText.includes(lessonText) || lessonText.includes(userText)) {
                if (!mentioned.includes(lesson.lessonOrder)) {
                    mentioned.push(lesson.lessonOrder);
                    continue;
                }
            }

            // Maxsus so'zlarni tekshirish
            for (const word of specialWords) {
                if (lessonText.includes(word)) {
                    if (!mentioned.includes(lesson.lessonOrder)) {
                        mentioned.push(lesson.lessonOrder);
                    }
                }
            }
        }

        // Hali ko'rilmagan darslarni ajratish
        const futureLessons = mentioned.filter(l => l > currentOrder);

        return { mentioned, futureLessons };
    }

    /**
     * Matndan maxsus so'zlarni ajratish (ismlar, predmetlar)
     */
    private extractSpecialWords(text: string): string[] {
        // Ismlar, narsa nomlari va muhim so'zlarni ajratish
        const words: string[] = [];
        const cleanText = text.toLowerCase().trim();

        // Haqiqiy atamalar (Fotima, Amina va boshqa ismlar)
        const isms = [
            'فَاطِمَة', 'فاطمة',
            'آمِنَة', 'أمينة',
            'مَرْيَم', 'مريم',
            'زَيْنَب', 'زينب'
        ];

        for (const ism of isms) {
            if (cleanText.includes(ism) || cleanText.includes(ism.replace(/َ/g, '').replace(/ُ/g, '').replace(/ِ/g, ''))) {
                words.push(ism);
            }
        }

        // Arab matnidan asosiy so'zlarni ajratish (vorud qilingan narsalar)
        if (cleanText.includes('زَهْرَة') || cleanText.includes('زهرة')) {
            words.push('زَهْرَة');
        }
        if (cleanText.includes('بُرْتُقَال') || cleanText.includes('برتقال')) {
            words.push('بُرْتُقَال');
        }
        if (cleanText.includes('فَسْل') || cleanText.includes('فصل')) {
            words.push('فَسْل');
        }

        return words;
    }

    /**
     * Hali ko'rilmagan dars haqida maxsus xabar yaratish
     */
    private async createFutureLessonMessage(
        input: VoiceInput,
        currentLessonOrder: number,
        mentionedLessonOrder: number
    ): Promise<AIChatMessage> {
        // Validatsiya
        if (!input.sessionId) {
            throw new Error(`[ContextStep] Invalid sessionId: ${input.sessionId}`);
        }

        const message = new AIChatMessage();

        // Xabar xususiyatlarini o'rnatish
        message.sessionId = Number(input.sessionId);
        message.senderType = 'ai';
        message.originalText = input.validatedText;
        message.isWithinLimit = true;

        // Hali kelmagan dars haqida javob
        message.aiResponseText = 'لَحْنِ بَعْدُ لَمْ تَصِلْ إِلَى هَٰذَا الدَّرْسِ.';
        message.aiResponseUzbek = 'Siz hali bu darsga kelmagansiz.';

        // TTS audio yaratish
        message.audioUrl = await this.tts.textToSpeech({
            text: message.aiResponseText,
            language: 'ar'
        });

        return message;
    }
}


