import { Injectable, Inject, forwardRef } from "@nestjs/common";
import { TTSService } from "../tts.service";
import { AIChatService } from "../ai-chat.service";
import { PipelineStep, VoiceInput, VoiceOutput } from "./pipeline.types";
import { AIChatMessage } from "../../entities/ai-chat-message.entity";
import { AIChatSession } from "../../entities/ai-chat-session.entity";

/**
 * Context Step: Context building using full buildContext logic
 */
@Injectable()
export class ContextStep implements PipelineStep {
    constructor(
        @Inject(forwardRef(() => AIChatService))
        private readonly aiChatService: AIChatService, // AIChatService'dan buildContext ishlatish uchun
        private readonly tts: TTSService // TTS for audio generation
    ) { }

    async execute(input: VoiceInput & { validatedText: string }): Promise<VoiceInput | VoiceOutput> {
        // User textini RAG query sifatida ishlatish uchun olish
        const userText = input.validatedText || '';

        // AIChatService'dan to'liq kontekst olish (profile, courseProgress, lessonProgress bilan)
        // User textini query sifatida yuborish - RAG search'ni aniqroq qiladi
        let fullContext: any;
        try {
            const courseId = input.courseId || input.session?.courseId;
            const courseIdNum = courseId ? Number(courseId) : undefined;

            console.log(`🔍 Building context for userId=${input.userId}, courseId=${courseIdNum}...`);
            fullContext = await this.aiChatService.buildContext({
                userId: Number(input.userId),
                courseId: courseIdNum,
                userQuery: userText, // User so'rovini RAG query sifatida yuborish
            });
            console.log(`✅ Context built successfully`);
        } catch (error: any) {
            console.error(`❌ Error building context:`, error.message);
            console.error(`❌ Error stack:`, error.stack);
            throw error;
        }

        const courseProgress = fullContext?.courseProgress;
        const userLevel = fullContext?.userLevel;

        // User ko'rgan eng oxirgi dars tartib raqami
        const lastWatchedLessonOrder = userLevel?.currentLessonOrder || 0;
        console.log(`📊 User progress: Last watched lesson order = ${lastWatchedLessonOrder}`);

        // Context'dan barcha darslarni olish
        const allLessons = fullContext.chromaContext || [];

        // Agar user text kelmagan darslardan bo'lsa, maxsus javob qaytarish
        // Strict check: Faqat GPT javobiga qarab tekshiramiz, chunki biz xavfni oldini olishga harakat qilamiz
        // Lekin user har qanday gapirishi mumkin, shuning uchun yaxshiroqroq yondashish kerak
        const possibleLessons = this.findPossibleFutureLessons(userText, allLessons, lastWatchedLessonOrder);

        if (possibleLessons.futureLessons.length > 0) {
            console.log(`⚠️ User gapirishga harakat qilayotgan darslar: ${possibleLessons.futureLessons.join(', ')}`);
            console.log(`📊 Current lesson: ${lastWatchedLessonOrder}`);

            // Maxsus javob yaratish
            const message = await this.createFutureLessonMessage(input, lastWatchedLessonOrder, Math.min(...possibleLessons.futureLessons));
            return { message, session: input.session };
        }

        // Get conversation history for context
        let conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];
        try {
            console.log(`📜 Getting conversation history for session ${input.sessionId}...`);
            const previousMessages = await this.aiChatService.getMessages(Number(input.sessionId));
            console.log(`✅ Retrieved ${previousMessages.length} previous messages`);

            // Format conversation history for GPT
            conversationHistory = previousMessages
                .filter(msg => {
                    // User messages: originalText bo'lishi kerak
                    // AI messages: aiResponseText bo'lishi kerak
                    const content = msg.senderType === 'user' ? msg.originalText : msg.aiResponseText;
                    return content && content.trim().length > 0;
                })
                .slice(-10) // Limit to last 10 messages
                .map(msg => ({
                    role: msg.senderType === 'user' ? 'user' as const : 'assistant' as const,
                    content: (msg.senderType === 'user' ? msg.originalText : msg.aiResponseText) || '',
                }));
            console.log(`📜 Formatted ${conversationHistory.length} messages for conversation history`);
        } catch (error: any) {
            console.error(`❌ Error getting conversation history:`, error.message);
            console.error(`⚠️  Continuing without conversation history`);
            conversationHistory = [];
        }

        return {
            ...input,
            context: allLessons,
            conversationHistory, // Add conversation history
            lastWatchedLessonOrder, // User progress - kelgan dars tartibi
        } as VoiceInput & {
            context: any;
            conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
            lastWatchedLessonOrder: number;
        };
    }

    private findPossibleFutureLessons(text: string, lessons: any[], currentOrder: number): { mentioned: number[], futureLessons: number[] } {
        const mentioned: number[] = [];

        // User textidagi maxsus so'zlarni olish (ismlar, predmetlar)
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

        // Kelmagan darslarni ajratish
        const futureLessons = mentioned.filter(l => l > currentOrder);

        return { mentioned, futureLessons };
    }

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

    private async createFutureLessonMessage(
        input: VoiceInput,
        currentLessonOrder: number,
        mentionedLessonOrder: number
    ): Promise<AIChatMessage> {
        const message = new AIChatMessage();
        message.sessionId = input.session.id as unknown as any;
        message.session = { id: input.session.id } as AIChatSession;
        message.senderType = 'ai';
        message.originalText = input.validatedText;
        message.isWithinLimit = true;
        message.messageLanguage = input.session.sessionLanguage;
        message.contextUsed = { note: `future-lesson-warning: current=${currentLessonOrder}, mentioned=${mentionedLessonOrder}` };

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


