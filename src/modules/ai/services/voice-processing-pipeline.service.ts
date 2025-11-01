import { Injectable, BadRequestException, Inject, forwardRef } from "@nestjs/common";
import { WhisperService, WhisperResponse } from "./whisper.service";
import { GPTService, GPTResponse } from "./gpt.service";
import { TTSService, TTSResponse } from "./tts.service";
import { ChromaService } from "./chroma.service";
import { TranslationService } from "./translation.service";
import { AIChatMessageFactory } from "./ai-chat-message-factory.service";
import { AIChatService } from "./ai-chat.service";
import { ArabicTextUtils } from "../utils/arabic-text.util";
import { AI_ERROR_MESSAGES } from "../constants/error-messages";
import { AI_FALLBACK_MESSAGES } from "../constants/error-messages";
import { SessionForbiddenException } from "../exceptions/session-forbidden.exception";
import { AIChatSession } from "../entities/ai-chat-session.entity";
import { AIChatMessage } from "../entities/ai-chat-message.entity";
import { ID } from "src/common/types/type";
import { LimitCheckService } from "./limit-check.service";

/**
 * Voice Processing Pipeline
 * -------------------------------------------------------
 * Maqsad: Voice chat oqimini pipeline pattern orqali boshqarish
 * Audio -> STT -> Validation -> Context -> GPT -> TTS -> Response
 */

export interface VoiceInput {
    userId: ID;
    sessionId: ID;
    audioBuffer: Buffer;
    courseId?: ID;
    language?: string;
    session: AIChatSession;
    validatedText?: string;
    // Cost tracking ma'lumotlari
    usage?: {
        whisper?: {
            duration: number; // seconds
        };
        gpt?: {
            promptTokens: number;
            completionTokens: number;
            totalTokens: number;
        };
        tts?: {
            characters: number;
        };
    };
}

export interface VoiceOutput {
    message: AIChatMessage;
    session: AIChatSession;
}

export interface PipelineStep {
    execute(input: VoiceInput): Promise<VoiceInput | VoiceOutput>;
}

@Injectable()
export class VoiceProcessingPipeline {
    constructor(
        private readonly whisper: WhisperService,
        private readonly gpt: GPTService,
        private readonly tts: TTSService,
        private readonly chroma: ChromaService,
        private readonly translation: TranslationService,
        private readonly messageFactory: AIChatMessageFactory,
        @Inject(forwardRef(() => AIChatService))
        private readonly aiChatService: AIChatService, // AIChatService injection for buildContext
        private readonly limitCheck: LimitCheckService, // Cost tracking uchun
    ) { }

    /**
     * Pipeline ni bajarish
     */
    async execute(input: VoiceInput): Promise<VoiceOutput> {
        const pipelineStart = Date.now();
        console.log("\n⏱️  Pipeline boshlandi...");

        // Usage tracking uchun initializatsiya
        const inputWithUsage: VoiceInput = {
            ...input,
            usage: {},
        };

        const steps: PipelineStep[] = [
            new STTStep(this.whisper),
            new ValidationStep(this.tts),
            new ContextStep(this.aiChatService, this.tts),
            new GPTStep(this.gpt, this.translation),
            new ResponseStep(this.messageFactory, this.tts),
        ];

        let currentInput: VoiceInput | VoiceOutput = inputWithUsage;

        for (const step of steps) {
            try {
                const stepName = step.constructor.name;
                console.log(`\n🔄 Executing step: ${stepName}`);
                currentInput = await step.execute(currentInput as VoiceInput);
                console.log(`✅ Step ${stepName} completed successfully`);

                // Agar step VoiceOutput qaytarsa, pipeline tugadi
                if ('message' in currentInput) {
                    const output = currentInput as VoiceOutput;

                    // Usage ma'lumotlarini olish
                    const usage = (currentInput as any).usage || inputWithUsage.usage || {};

                    // Cost tracking message.id bo'lmasa ham ishlashi uchun
                    // (message hali saqlanmagan bo'lishi mumkin)
                    // Bu holatda messageId null bo'ladi va keyin update qilinadi

                    const totalTime = Date.now() - pipelineStart;
                    console.log(`\n✅ Pipeline tugadi. Umumiy vaqt: ${totalTime}ms (${(totalTime / 1000).toFixed(1)}s)\n`);

                    // Usage ma'lumotlarini output'ga qo'shish (keyin trackCost'da ishlatish uchun)
                    return {
                        ...output,
                        usage, // Usage ma'lumotlarini qo'shish
                    } as VoiceOutput & { usage?: VoiceInput['usage'] };
                }
            } catch (error: any) {
                const stepName = step.constructor.name;
                console.error(`\n❌ Error in step ${stepName}:`, error.message);
                console.error(`❌ Error stack:`, error.stack);
                console.error(`❌ Error details:`, JSON.stringify(error, null, 2));
                throw error;
            }
        }

        throw new Error('Pipeline failed to produce output');
    }

}

/**
 * STT Step: Audio -> Text
 */
class STTStep implements PipelineStep {
    constructor(private readonly whisper: WhisperService) { }

    async execute(input: VoiceInput): Promise<VoiceInput> {
        const sttLang = (input.language && typeof input.language === 'string' && input.language.trim())
            ? input.language.trim()
            : 'ar';

        // Usage ma'lumotlarini olish uchun speechToTextWithUsage ishlatamiz
        const whisperResult = await this.whisper.speechToTextWithUsage({
            audio: input.audioBuffer,
            language: sttLang
        });

        // Usage ma'lumotlarini to'plash
        const usage = input.usage || {};
        usage.whisper = {
            duration: whisperResult.duration || 0,
        };

        return {
            ...input,
            transcribedText: whisperResult.text,
            usage,
        } as VoiceInput & { transcribedText: string };
    }
}

/**
 * Validation Step: Text validation va fallback
 */
class ValidationStep implements PipelineStep {
    constructor(private readonly tts: TTSService) { }

    async execute(input: VoiceInput & { transcribedText: string }): Promise<VoiceInput | VoiceOutput> {
        const trimmed = (input.transcribedText || "").trim();

        // STT bo'sh yoki qisqa bo'lsa
        if (!trimmed || trimmed.length < 2) {
            const message = await this.createFallbackMessage(input, trimmed, 'empty');
            return { message, session: input.session };
        }

        // Arab tilidan boshqa til bo'lsa
        if (!ArabicTextUtils.isArabicText(trimmed)) {
            const message = await this.createFallbackMessage(input, trimmed, 'non-arabic');
            return { message, session: input.session };
        }

        return {
            ...input,
            validatedText: trimmed,
        } as VoiceInput & { validatedText: string };
    }

    private async createFallbackMessage(
        input: VoiceInput,
        text: string,
        type: 'empty' | 'non-arabic'
    ): Promise<AIChatMessage> {
        const message = new AIChatMessage();
        message.sessionId = input.session.id as unknown as any;
        message.session = { id: input.session.id } as AIChatSession;
        message.senderType = 'ai';
        message.originalText = text;
        message.isWithinLimit = true;
        message.messageLanguage = input.session.sessionLanguage;
        message.contextUsed = { note: `${type}-transcript-fallback` };

        if (type === 'empty') {
            console.log("👂 Bo'sh audio aniqlandi, maxsus javob yuborilmoqda.");
            message.aiResponseText = 'عَفْوًا، لَمْ أَسْمَعْ شَيْئًا. هَلْ يُمْكِنُكَ التَّحَدُّثُ؟';
            message.aiResponseUzbek = 'Kechirasiz, hech narsa eshitmadim. Gapira olasizmi?';
        } else {
            console.log("🚫 Arab tilidan boshqa til aniqlandi, maxsus javob yuborilmoqda.");
            message.aiResponseText = 'مِنْ فَضْلِكَ، تَحَدَّثْ بِالْعَرَبِيَّةِ فَقَطْ.';
            message.aiResponseUzbek = 'Iltimos, faqat arab tilida gapiring.';
        }

        // TTS audio yaratish
        message.audioUrl = await this.tts.textToSpeech({
            text: message.aiResponseText,
            language: 'ar'
        });

        return message;
    }
}

/**
 * Context Step: Context building using full buildContext logic
 */
class ContextStep implements PipelineStep {
    constructor(
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

/**
 * GPT Step: AI response generation
 */
class GPTStep implements PipelineStep {
    constructor(
        private readonly gpt: GPTService,
        private readonly translation: TranslationService,
    ) { }

    async execute(input: VoiceInput & { validatedText: string; context: any; conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>; lastWatchedLessonOrder?: number }): Promise<VoiceInput> {
        // User input logging
        console.log("\n🧠 GPTStep: Starting execution...");
        console.log(`   Context type: ${Array.isArray(input.context) ? 'array' : typeof input.context}`);
        console.log(`   Context length: ${Array.isArray(input.context) ? input.context.length : 'N/A'}`);
        console.log(`   Conversation history length: ${input.conversationHistory?.length || 0}`);
        console.log(`   Last watched lesson order: ${input.lastWatchedLessonOrder || 0}`);

        const userLatin = ArabicTextUtils.transliterateArabic(input.validatedText || "");

        console.log("\n👤 User:");
        console.log("   Arab: " + input.validatedText);
        console.log("   Lotin: " + userLatin);

        // 1) Kontekstga tayangan leksik tuzatish va echo-avoidance
        const userText = this.applyContextAwareCorrection(input.validatedText || '', input.context);
        const lastWatchedLessonOrder = input.lastWatchedLessonOrder || 0;

        // Normalization funksiyalari - punctuation va diacritics'ni olib tashlash
        const stripDiacritics = (t: string) => t.replace(/[\u064B-\u065F\u0670\u0640]/g, '');
        const stripPunctuation = (t: string) => t.replace(/[،,\.\?؟!;؛]/g, '').trim();
        const normalize = (t: string) => {
            const cleaned = stripPunctuation(stripDiacritics(t));
            return ArabicTextUtils.normalizeArabic(cleaned);
        };
        const splitSentences = (t: string): string[] => {
            const cleaned = (t || '').trim();
            if (!cleaned) return [];
            return cleaned
                .split(/(?<=[\.\!؟])\s+/)
                .map(s => s.trim())
                .filter(s => s.length > 0);
        };

        const normalizedUser = normalize(userText);
        let nextSentenceFromMaterial = '';
        let materialLessonOrder: number | null = null; // Materialdan olingan javob qaysi darsdan
        let bestMatchNextSentence = '';
        let bestMatchScore = 0;
        let bestMatchLessonOrder: number | null = null;

        const wordSet = (t: string) => new Set(normalize(t).split(/\s+/).filter(Boolean));
        const jaccard = (a: Set<string>, b: Set<string>) => {
            if (a.size === 0 || b.size === 0) return 0;
            let inter = 0;
            for (const w of a) if (b.has(w)) inter++;
            const uni = new Set<string>([...a, ...b]).size;
            return inter / uni;
        };
        const userWords = wordSet(userText);

        // 1) BIRINCHI NAVBATDA: Materiallardan qidirish
        console.log(`\n🔍 Searching materials for user query: "${userText}"`);
        console.log(`   Context contains ${input.context?.length || 0} lesson chunks`);

        if (Array.isArray(input.context)) {
            for (const lesson of input.context) {
                const lessonText: string = (lesson && (lesson.text || lesson.content || '')) as string;
                const lessonOrder = lesson?.lessonOrder || 0;
                if (!lessonText) continue;

                console.log(`   📚 Checking lesson ${lessonOrder}: "${lessonText.substring(0, 50)}${lessonText.length > 50 ? '...' : ''}"`);

                const sentences = splitSentences(lessonText);
                console.log(`      Split into ${sentences.length} sentences`);

                for (let i = 0; i < sentences.length; i++) {
                    const s = sentences[i];
                    if (!s) continue;
                    const normalizedSentence = normalize(s);

                    // To'liq yoki kuchli moslik (punctuation va diacritics'ni e'tiborsiz qoldirib)
                    const isExactMatch = normalizedSentence === normalizedUser;
                    const sentenceIncludesUser = normalizedSentence.includes(normalizedUser);
                    const userIncludesSentence = normalizedUser.includes(normalizedSentence);

                    // Qo'shimcha: User gapining asosiy qismi (faqat so'zlar) material bilan mos keladimi?
                    const userWordsArray = normalizedUser.split(/\s+/).filter(Boolean);
                    const sentenceWordsArray = normalizedSentence.split(/\s+/).filter(Boolean);
                    const userWordsInSentence = userWordsArray.filter(w => sentenceWordsArray.includes(w)).length;
                    const wordsMatchRatio = userWordsArray.length > 0 ? userWordsInSentence / userWordsArray.length : 0;
                    const isWordsMatch = wordsMatchRatio >= 0.8 && userWordsArray.length >= 3; // 80%+ so'zlar mos va kamida 3 so'z

                    if (isExactMatch || sentenceIncludesUser || userIncludesSentence || isWordsMatch) {
                        console.log(`      ✅ Match found at sentence ${i + 1}: "${s}"`);
                        console.log(`         User normalized: "${normalizedUser}"`);
                        console.log(`         Sentence normalized: "${normalizedSentence}"`);
                        console.log(`         Match type: ${isExactMatch ? 'exact' : sentenceIncludesUser ? 'sentence includes user' : userIncludesSentence ? 'user includes sentence' : `words match (${(wordsMatchRatio * 100).toFixed(0)}%)`}`);

                        const candidate = sentences[i + 1];
                        if (candidate && candidate.length > 1) {
                            console.log(`      ✅ Next sentence found: "${candidate}" (from lesson ${lessonOrder})`);
                            nextSentenceFromMaterial = candidate;
                            materialLessonOrder = lessonOrder;
                            break;
                        } else {
                            console.log(`      ⚠️  No next sentence found after match`);
                        }
                    }

                    // Fuzzy moslik: Jaccard bo'yicha yaqin gapni eslab qolamiz
                    const score = jaccard(userWords, wordSet(s));
                    if (score > bestMatchScore) {
                        bestMatchScore = score;
                        bestMatchNextSentence = sentences[i + 1] || '';
                        bestMatchLessonOrder = lessonOrder;
                        if (score > 0.3) {
                            console.log(`      📊 Good fuzzy match (score: ${score.toFixed(2)}): "${s}" -> next: "${bestMatchNextSentence}"`);
                        }
                    }
                }
                if (nextSentenceFromMaterial) {
                    console.log(`   ✅ Material match found in lesson ${lessonOrder}`);
                    break;
                }
            }

            if (!nextSentenceFromMaterial) {
                console.log(`   ⚠️  No exact material match found. Best fuzzy match score: ${bestMatchScore.toFixed(2)}`);
            }
        }

        let aiResponse = '';
        let aiResponseUz = '';
        let gptTime = 0;
        let gptUsage: GPTResponse['usage'] | undefined;

        // 2) AGAR MATERIALDAN TOPILDI - kelgan darslarni tekshirish
        if (nextSentenceFromMaterial) {
            // Agar topilgan javob kelmagan darsda bo'lsa
            if (materialLessonOrder !== null && materialLessonOrder > lastWatchedLessonOrder) {
                console.log(`⚠️  Material topildi, lekin kelmagan darsda (lesson ${materialLessonOrder} > ${lastWatchedLessonOrder})`);
                aiResponse = AI_FALLBACK_MESSAGES.FUTURE_LESSON_RESPONSE.arabic;
                aiResponseUz = AI_FALLBACK_MESSAGES.FUTURE_LESSON_RESPONSE.uzbek;
                gptUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
            } else {
                // Kelgan darslardan - to'g'ri javob
                // Lekin echo va mantiqiy validatsiyani tekshirish kerak
                console.log(`\n🔍 Validating material response for echo...`);
                console.log(`   User: "${userText}"`);
                console.log(`   Material: "${nextSentenceFromMaterial}"`);
                const materialResponseIsEcho = this.detectEcho(nextSentenceFromMaterial, userText, normalizedUser, userWords);
                const materialIsLogical = this.validateLogicalResponse(nextSentenceFromMaterial, userText, normalizedUser);

                if (materialResponseIsEcho || !materialIsLogical) {
                    // Materialdan javob echo yoki mantiqsiz bo'lsa, GPT ga so'rov
                    if (materialResponseIsEcho) {
                        console.log(`⚠️  Material response is ECHO, asking GPT instead`);
                    } else {
                        console.log(`⚠️  Material response is not logical, asking GPT instead`);
                    }
                    const gptStart = Date.now();
                    const gptResult = await this.gpt.generateWithUsage({
                        prompt: userText,
                        context: input.context,
                        language: 'ar',
                        strict: false,
                        conversationHistory: input.conversationHistory || [],
                    });
                    gptTime = Date.now() - gptStart;
                    aiResponse = gptResult.text;
                    gptUsage = gptResult.usage;

                    // GPT javobini ham tekshirish
                    console.log(`\n🔍 Validating GPT response (after material echo) for echo...`);
                    const gptIsEcho = this.detectEcho(aiResponse, userText, normalizedUser, userWords);
                    const gptIsLogical = this.validateLogicalResponse(aiResponse, userText, normalizedUser);

                    if (gptIsEcho || !gptIsLogical) {
                        // GPT ham mantiqsiz javob berdi - tushunmadim
                        if (gptIsEcho) {
                            console.log(`❌ GPT also echoed! Using NOT_UNDERSTOOD fallback.`);
                        } else {
                            console.log(`❌ GPT response not logical! Using NOT_UNDERSTOOD fallback.`);
                        }
                        aiResponse = AI_FALLBACK_MESSAGES.NOT_UNDERSTOOD.arabic;
                        aiResponseUz = AI_FALLBACK_MESSAGES.NOT_UNDERSTOOD.uzbek;
                    } else {
                        console.log(`✅ GPT response is valid.`);
                    }
                } else {
                    // Materialdan javob to'g'ri
                    console.log(`✅ Material response is valid (no echo, logical).`);
                    aiResponse = nextSentenceFromMaterial;
                    gptUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
                }
            }
        }
        // 3) AGAR YAQIN MATCH BO'LSA (50%+) - yordamlash
        else if (bestMatchScore >= 0.5 && bestMatchNextSentence && bestMatchNextSentence.length > 1) {
            // Kelmagan darsda bo'lsa ham yordam beramiz (lekin e'tiborli)
            if (bestMatchLessonOrder !== null && bestMatchLessonOrder > lastWatchedLessonOrder) {
                console.log(`⚠️  Yaqin match topildi, lekin kelmagan darsda`);
                aiResponse = AI_FALLBACK_MESSAGES.FUTURE_LESSON_RESPONSE.arabic;
                aiResponseUz = AI_FALLBACK_MESSAGES.FUTURE_LESSON_RESPONSE.uzbek;
                gptUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
            } else {
                // Yordamlash - shunday demoqchimisiz?
                // Bu echo emas, chunki "shunday demoqchimisan" pattern qo'shilgan
                const helpResponse = AI_FALLBACK_MESSAGES.CLOSE_MATCH_HELP.arabic + bestMatchNextSentence;
                const helpIsLogical = this.validateLogicalResponse(bestMatchNextSentence, userText, normalizedUser);

                if (helpIsLogical) {
                    aiResponse = helpResponse;
                    aiResponseUz = AI_FALLBACK_MESSAGES.CLOSE_MATCH_HELP.uzbek + bestMatchNextSentence;
                    gptUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
                } else {
                    // Yordamlash ham mantiqsiz - GPT ga so'rov
                    console.log(`⚠️  Yaqin match mantiqsiz, GPT ga so'rov`);
                    const gptStart = Date.now();
                    const gptResult = await this.gpt.generateWithUsage({
                        prompt: userText,
                        context: input.context,
                        language: 'ar',
                        strict: false,
                        conversationHistory: input.conversationHistory || [],
                    });
                    gptTime = Date.now() - gptStart;
                    aiResponse = gptResult.text;
                    gptUsage = gptResult.usage;
                }
            }
        }
        // 4) AGAR MATERIALDAN TOPILMADI - GPT ga so'rov
        else {
            const gptStart = Date.now();
            const gptResult = await this.gpt.generateWithUsage({
                prompt: userText,
                context: input.context,
                language: 'ar',
                strict: false,
                conversationHistory: input.conversationHistory || [],
            });
            gptTime = Date.now() - gptStart;
            aiResponse = gptResult.text;
            gptUsage = gptResult.usage;

            // GPT javobini tekshirish
            const unsure = (aiResponse || '').includes('لَسْتُ مُتَأَكِّدًا') ||
                (aiResponse || '').toLowerCase().includes('not sure') ||
                (aiResponse || '').toLowerCase().includes('لا أعرف');

            // Echo tekshiruvi - kuchaytirilgan (STRICT MODE)
            console.log(`\n🔍 Validating GPT response for echo...`);
            console.log(`   User: "${userText}"`);
            console.log(`   GPT:  "${aiResponse}"`);
            const responseIsEcho = this.detectEcho(aiResponse, userText, normalizedUser, userWords);
            if (responseIsEcho) {
                console.log(`   ❌ Echo detected! Using fallback message.`);
            } else {
                console.log(`   ✅ No echo detected.`);
            }

            // Mantiqiy validatsiya - javob user so'roviga mantiqan mos keladimi?
            const isLogicalResponse = this.validateLogicalResponse(aiResponse, userText, normalizedUser);
            if (!isLogicalResponse) {
                console.log(`   ⚠️  Response is not logical.`);
            }

            // GPT javobida kelmagan materiallardan so'zlarni tekshirish
            const hasFutureLessonWords = this.checkFutureLessonWords(aiResponse, input.context, lastWatchedLessonOrder);
            if (hasFutureLessonWords) {
                console.log(`   ⚠️  Response contains future lesson words.`);
            }

            // STRICT CHECK: GPT javobini materiallar bilan to'liq solishtirish
            // Agar javob materiallar ichida aniq topilmasa, bu materialda yo'q javob
            const responseExistsInMaterials = this.checkResponseExistsInMaterials(aiResponse, input.context);
            if (!responseExistsInMaterials) {
                console.log(`   ⚠️  Response "${aiResponse}" does NOT exist in lesson materials (dialogue).`);
            } else {
                console.log(`   ✅ Response exists in lesson materials.`);
            }

            // AGAR TUSHUNMAGAN, ECHO YOKI MANTIQIY EMAS YOKI MATERIALDA YO'Q
            if (!aiResponse || unsure || responseIsEcho || !isLogicalResponse || hasFutureLessonWords || !responseExistsInMaterials) {
                // Echo yoki mantiqsiz javob - tushunmadim
                if (responseIsEcho) {
                    console.log(`\n🚫 GPT echoed user text. Using NOT_UNDERSTOOD fallback.`);
                    aiResponse = AI_FALLBACK_MESSAGES.NOT_UNDERSTOOD.arabic;
                    aiResponseUz = AI_FALLBACK_MESSAGES.NOT_UNDERSTOOD.uzbek;
                }
                // Javob materiallarda yo'q - STRICT MODE
                else if (!responseExistsInMaterials) {
                    console.log(`\n⚠️  GPT response does NOT exist in lesson materials. Using NO_MATERIAL_RESPONSE fallback.`);
                    // User gapini uzbek tilida qo'shib yuborish
                    try {
                        const userTextUz = await this.translation.translateToUzbek(userText);
                        aiResponse = AI_FALLBACK_MESSAGES.NO_MATERIAL_RESPONSE.arabic;
                        aiResponseUz = `${AI_FALLBACK_MESSAGES.NO_MATERIAL_RESPONSE.uzbek} (${userTextUz})`;
                    } catch (e) {
                        aiResponse = AI_FALLBACK_MESSAGES.NO_MATERIAL_RESPONSE.arabic;
                        aiResponseUz = AI_FALLBACK_MESSAGES.NO_MATERIAL_RESPONSE.uzbek;
                    }
                }
                // Tushunilmagan holat
                else if (unsure || !aiResponse || aiResponse.trim().length < 5) {
                    console.log(`\n⚠️  GPT response is unsure or too short. Using NOT_UNDERSTOOD fallback.`);
                    aiResponse = AI_FALLBACK_MESSAGES.NOT_UNDERSTOOD.arabic;
                    aiResponseUz = AI_FALLBACK_MESSAGES.NOT_UNDERSTOOD.uzbek;
                }
                // Kelmagan materiallardan foydalangan yoki boshqa muammo
                else {
                    console.log(`\n⚠️  GPT response has other issues. Using NO_MATERIAL_RESPONSE fallback.`);
                    // User gapini uzbek tilida qo'shib yuborish
                    try {
                        const userTextUz = await this.translation.translateToUzbek(userText);
                        aiResponse = AI_FALLBACK_MESSAGES.NO_MATERIAL_RESPONSE.arabic;
                        aiResponseUz = `${AI_FALLBACK_MESSAGES.NO_MATERIAL_RESPONSE.uzbek} (${userTextUz})`;
                    } catch (e) {
                        aiResponse = AI_FALLBACK_MESSAGES.NO_MATERIAL_RESPONSE.arabic;
                        aiResponseUz = AI_FALLBACK_MESSAGES.NO_MATERIAL_RESPONSE.uzbek;
                    }
                }
            }
        }

        const aiResponseLatin = ArabicTextUtils.transliterateArabic(aiResponse || "");
        console.log("\n🤖 AI:");
        console.log("   Arab: " + aiResponse);
        console.log("   Lotin: " + aiResponseLatin);
        if (aiResponseUz) {
            console.log("   Uzbek: " + aiResponseUz);
        }
        console.log("   ⏱️  GPT vaqti: " + gptTime + "ms");

        // Usage ma'lumotlarini to'plash
        const usage = input.usage || {};
        if (gptUsage) {
            usage.gpt = {
                promptTokens: gptUsage.promptTokens || 0,
                completionTokens: gptUsage.completionTokens || 0,
                totalTokens: gptUsage.totalTokens || 0,
            };
        }

        return {
            ...input,
            aiResponse,
            aiResponseUz: aiResponseUz || '', // Uzbek matn
            usage,
        } as VoiceInput & { aiResponse: string; aiResponseUz: string };
    }

    /**
     * GPT javobida kelmagan darslardagi so'zlar borligini tekshirish
     */
    private checkFutureLessonWords(response: string, context: any[], lastWatchedOrder: number): boolean {
        if (!response || !Array.isArray(context)) return false;

        const normalize = (t: string) => ArabicTextUtils.normalizeArabic(t.replace(/[\u064B-\u065F\u0670]/g, ''));
        const normalizedResponse = normalize(response);
        const responseWords = new Set(normalizedResponse.split(/\s+/).filter(Boolean));

        // Har bir kelmagan darsdagi so'zlarni solishtirish
        for (const lesson of context) {
            const lessonOrder = lesson?.lessonOrder || 0;
            if (lessonOrder <= lastWatchedOrder) continue; // Kelgan darslar - skip

            const lessonText = (lesson?.text || lesson?.content || '') as string;
            if (!lessonText) continue;

            const normalizedLesson = normalize(lessonText);
            const lessonWords = new Set(normalizedLesson.split(/\s+/).filter(Boolean));

            // Umumiy so'zlar topilsa
            for (const word of responseWords) {
                if (word.length > 3 && lessonWords.has(word)) { // 3+ harfli so'zlar
                    return true; // Kelmagan darsdan so'z topildi
                }
            }
        }

        return false;
    }

    /**
     * GPT javobini materiallar bilan to'liq solishtirish
     * Agar javob materiallar (dialogue) ichida aniq topilmasa, false qaytaradi
     * Bu GPT'ning materiallarda yo'q javob yaratishini oldini oladi
     */
    private checkResponseExistsInMaterials(response: string, context: any[]): boolean {
        if (!response || !Array.isArray(context) || context.length === 0) {
            return false; // Materiallar yo'q bo'lsa, javob ham materialda yo'q
        }

        const stripDiacritics = (t: string) => t.replace(/[\u064B-\u065F\u0670\u0640]/g, '').replace(/[،,.]/g, '').trim();
        const normalize = (t: string) => ArabicTextUtils.normalizeArabic(stripDiacritics(t));
        const normalizedResponse = normalize(response);

        // Har bir material (dialogue turn) bilan solishtirish
        for (const lesson of context) {
            const lessonText = (lesson?.text || lesson?.content || '') as string;
            if (!lessonText) continue;

            const normalizedLesson = normalize(lessonText);

            // To'liq moslik (punctuation va diacritics'ni e'tiborsiz qoldirib)
            if (normalizedResponse === normalizedLesson) {
                return true; // Javob materiallarda topildi
            }

            // Yaqin moslik - response material text'ning qismi yoki aksincha
            // (faqat kichik farq bilan - punctuation/diacritics)
            if (normalizedResponse.length > 0 && normalizedLesson.length > 0) {
                const lengthDiff = Math.abs(normalizedResponse.length - normalizedLesson.length);
                const similarity = this.calculateSimilarity(normalizedResponse, normalizedLesson);

                // Agar 90%+ o'xshashlik va uzunlik farqi kichik bo'lsa
                if (similarity > 0.9 && lengthDiff < 5) {
                    return true; // De facto bir xil
                }
            }
        }

        return false; // Javob materiallarda topilmadi
    }

    /**
     * Ikki text o'rtasidagi o'xshashlikni hisoblash (Jaccard similarity)
     */
    private calculateSimilarity(text1: string, text2: string): number {
        const words1 = new Set(text1.split(/\s+/).filter(Boolean));
        const words2 = new Set(text2.split(/\s+/).filter(Boolean));

        if (words1.size === 0 || words2.size === 0) return 0;

        let intersection = 0;
        for (const word of words1) {
            if (words2.has(word)) intersection++;
        }

        const union = new Set([...words1, ...words2]).size;
        return intersection / union;
    }

    /**
     * Echo detection - user gapini takrorlash
     * Faqat xato gapirganda "shunday demoqchimisan" deb qaytarishi mumkin
     * STRICT MODE: Qattiq echo detection - faqat vergul yoki diacritics farqi bilan ham echo hisoblanadi
     */
    private detectEcho(response: string, originalUserText: string, normalizedUser: string, userWords: Set<string>): boolean {
        if (!response || !originalUserText) return false;

        const stripDiacritics = (t: string) => t.replace(/[\u064B-\u065F\u0670\u0640]/g, '').replace(/[،,]/g, '').trim();
        const normalize = (t: string) => ArabicTextUtils.normalizeArabic(stripDiacritics(t));
        const normalizedResponse = normalize(response);
        const normalizedUserCleaned = normalize(originalUserText);

        // 1. To'liq takrorlash (diacritics va punctuation'dan tashqari)
        if (normalizedResponse === normalizedUserCleaned) {
            console.log(`🚫 Echo detected: Exact match (ignoring diacritics/punctuation)`);
            return true;
        }

        // 2. User gapining katta qismini takrorlash (>70% o'xshashlik va response uzunligi user dan 1.5x katta emas)
        const responseWords = new Set(normalizedResponse.split(/\s+/).filter(Boolean));
        if (responseWords.size > 0 && userWords.size > 0) {
            let commonWords = 0;
            for (const word of userWords) {
                if (responseWords.has(word)) commonWords++;
            }
            const similarity = commonWords / userWords.size;
            // 70% dan yuqori o'xshashlik va response user gapidan ko'p farq qilmasa
            if (similarity > 0.7 && responseWords.size <= userWords.size * 1.5) {
                // Agar "shunday demoqchimisan" yoki "هل تقصد" pattern bo'lsa, echo emas
                const helpPattern = normalize(AI_FALLBACK_MESSAGES.CLOSE_MATCH_HELP?.arabic || '');
                const helpPatterns = [
                    normalize('هل تقصد'),
                    normalize('هَلْ تَقْصِدُ'),
                    normalize('أتقصد'),
                    normalize('shunday'),
                ];
                const hasHelpPattern = helpPatterns.some(pattern =>
                    normalizedResponse.includes(pattern) && pattern.length > 0
                );
                if (!hasHelpPattern && helpPattern.length === 0) {
                    console.log(`🚫 Echo detected: High similarity (${(similarity * 100).toFixed(0)}%), common words: ${commonWords}/${userWords.size}`);
                    return true;
                }
            }
        }

        // 3. User gapini to'g'ridan-to'g'ri takrorlash (faqat punctuation/diacritics farqi bilan)
        const userTextLower = normalizedUserCleaned.toLowerCase();
        const responseLower = normalizedResponse.toLowerCase();

        // Agar user gapining uzunligi 5+ bo'lsa va javob uni to'liq o'z ichiga olsa
        if (userTextLower.length > 5 && responseLower.includes(userTextLower)) {
            // Lekin "shunday demoqchimisan" deb qo'shgan bo'lsa, bu echo emas
            const helpPatterns = [
                normalize('هل تقصد'),
                normalize('هَلْ تَقْصِدُ'),
                normalize('أتقصد'),
                normalize('shunday'),
            ];
            const hasHelpPattern = helpPatterns.some(pattern =>
                normalizedResponse.includes(pattern) && pattern.length > 0
            );
            // Response uzunligi user gapidan ko'p farq qilmasa (faqat punctuation/diacritics farqi)
            const lengthRatio = responseLower.length / userTextLower.length;
            if (!hasHelpPattern && lengthRatio <= 1.3) {
                console.log(`🚫 Echo detected: User text fully contained in response (length ratio: ${lengthRatio.toFixed(2)})`);
                return true; // Echo
            }
        }

        // 4. STRICT CHECK: Agar response faqat user gapidagi so'zlarni qayta tartib bilan qo'ygan bo'lsa
        // (masalan: "مَا هَذَا يَا فَرِيد؟" -> "مَا هَذَا، يَا فَرِيدُ؟")
        const responseWordArray = Array.from(responseWords);
        const userWordArray = Array.from(userWords);

        // Agar response'dagi barcha so'zlar user gapida bo'lsa va yangi so'z qo'shilmagan bo'lsa
        if (userWordArray.length > 0 && responseWordArray.length > 0) {
            const allResponseWordsInUser = responseWordArray.every(word => userWords.has(word));
            const allUserWordsInResponse = userWordArray.every(word => responseWords.has(word));

            // Agar response faqat user so'zlarini qayta tartib bilan ishlatgan bo'lsa
            if (allResponseWordsInUser && allUserWordsInResponse && responseWords.size === userWords.size) {
                // Faqat vergul yoki diacritics qo'shgan bo'lsa, bu echo
                const lengthDiff = Math.abs(normalizedResponse.length - normalizedUserCleaned.length);
                if (lengthDiff < 10) { // Faqat kichik farq (punctuation/diacritics)
                    console.log(`🚫 Echo detected: Response only reorders user words (same word set, length diff: ${lengthDiff})`);
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Mantiqiy javob validatsiyasi
     * AI javobi user so'roviga mantiqan mos keladimi?
     */
    private validateLogicalResponse(response: string, userText: string, normalizedUser: string): boolean {
        if (!response || response.trim().length < 3) return false;

        const stripDiacritics = (t: string) => t.replace(/[\u064B-\u065F\u0670]/g, '');
        const normalize = (t: string) => ArabicTextUtils.normalizeArabic(stripDiacritics(t));
        const normalizedResponse = normalize(response);

        // 1. Javob bo'sh yoki juda qisqa bo'lmasligi kerak
        if (normalizedResponse.length < 5) return false;

        // 2. User gapidan farq qilishi kerak (echo bo'lmasligi kerak)
        if (normalizedResponse === normalizedUser) return false;

        // 3. Javobda mantiqiy so'zlar bo'lishi kerak (faqat "ha", "yo'q" kabi qisqa javoblar ham bo'lishi mumkin)
        // Lekin agar user savol bersa, javob ham bo'lishi kerak
        const isQuestion = userText.includes('?') ||
            userText.includes('؟') ||
            userText.toLowerCase().startsWith('hal') ||
            userText.toLowerCase().startsWith('هل');

        if (isQuestion) {
            // Savol bo'lsa, javob aniq bo'lishi kerak (yo'q, bo'sh javob emas)
            if (normalizedResponse.length < 10 && !normalizedResponse.match(/نعم|لا|هذا|هذه|هؤلاء/)) {
                return false; // Mantiqiy javob emas
            }
        }

        // 4. Javob mantiqiy strukturaga ega bo'lishi kerak
        // Agar javob faqat so'zlar ketma-ketligi bo'lsa (tushunarsiz), bu mantiqsiz
        const hasLogicalStructure = normalizedResponse.includes(' ') ||
            normalizedResponse.length > 15; // Yoki yaxshi formatlangan gap

        return hasLogicalStructure;
    }

    private buildNormalizedWordSet(context: any[]): Set<string> {
        const stripDiacritics = (t: string) => t.replace(/[\u064B-\u065F\u0670]/g, '');
        const normalize = (t: string) => ArabicTextUtils.normalizeArabic(stripDiacritics(t));
        const words = new Set<string>();
        if (!Array.isArray(context)) return words;
        for (const lesson of context) {
            const txt: string = (lesson && (lesson.text || lesson.content || '')) as string;
            if (!txt) continue;
            const normalized = normalize(txt);
            for (const w of normalized.split(/\s+/)) {
                if (w) words.add(w);
            }
        }
        return words;
    }

    private applyContextAwareCorrection(text: string, context: any): string {
        const stripDiacritics = (t: string) => t.replace(/[\u064B-\u065F\u0670]/g, '');
        const normalize = (t: string) => ArabicTextUtils.normalizeArabic(stripDiacritics(t));
        const normalizedWords = this.buildNormalizedWordSet(Array.isArray(context) ? context : []);
        const confusionPairs: Array<[string, string]> = [
            ['غ', 'و'],
            ['ض', 'د'],
        ];

        const original = text || '';
        const normalized = normalize(original);
        const tokens = normalized.split(/\s+/);
        const originalTokens = original.split(/\s+/);

        let changed = false;
        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];
            if (!token || normalizedWords.has(token)) continue;

            // generate candidates by swapping confusion pairs
            const candidates = new Set<string>();
            candidates.add(token);
            for (const [a, b] of confusionPairs) {
                candidates.add(token.replace(new RegExp(a, 'g'), b));
                candidates.add(token.replace(new RegExp(b, 'g'), a));
            }
            // check candidates in vocabulary
            let replacement: string | null = null;
            for (const cand of candidates) {
                if (normalizedWords.has(cand)) { replacement = cand; break; }
            }
            if (replacement) {
                // Replace in original token roughly (keep original spacing/punct)
                originalTokens[i] = originalTokens[i]
                    .replace(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+/g, replacement);
                changed = true;
            }
        }

        return changed ? originalTokens.join(' ') : original;
    }
}

/**
 * Response Step: Final message creation
 */
class ResponseStep implements PipelineStep {
    constructor(
        private readonly messageFactory: AIChatMessageFactory,
        private readonly tts: TTSService, // TTS service to'g'ridan-to'g'ri
    ) { }

    async execute(input: VoiceInput & {
        validatedText: string;
        context: any;
        aiResponse: string;
        aiResponseUz: string;
    }): Promise<VoiceOutput> {
        // TTS audio yaratish (usage ma'lumotlari bilan)
        const ttsResult = await this.tts.textToSpeechWithUsage({
            text: input.aiResponse,
            language: 'ar',
        });

        // Usage ma'lumotlarini to'plash
        const usage = input.usage || {};
        usage.tts = {
            characters: ttsResult.characters || 0,
        };

        const message = await this.messageFactory.createResponseMessage(
            input.session,
            input.validatedText,
            input.aiResponse,
            input.aiResponseUz,
            true, // withinLimit
            input.context,
            ttsResult.audioUrl // audioUrl
        );

        // Usage ma'lumotlarini message bilan birga qaytarish
        // (Pipeline'dan trackCost metodida ishlatish uchun)
        return {
            message,
            session: input.session,
            usage: usage, // Pipeline'da ishlatish uchun
        } as VoiceOutput & { usage?: VoiceInput['usage'] };
    }
}
