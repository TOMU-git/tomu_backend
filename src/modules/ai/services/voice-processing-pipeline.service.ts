import { Injectable, BadRequestException, Inject, forwardRef } from "@nestjs/common";
import { WhisperService } from "./whisper.service";
import { GPTService } from "./gpt.service";
import { TTSService } from "./tts.service";
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
    ) { }

    /**
     * Pipeline ni bajarish
     */
    async execute(input: VoiceInput): Promise<VoiceOutput> {
        const pipelineStart = Date.now();
        console.log("\n⏱️  Pipeline boshlandi...");

        const steps: PipelineStep[] = [
            new STTStep(this.whisper),
            new ValidationStep(this.tts),
            new ContextStep(this.aiChatService, this.tts),
            new GPTStep(this.gpt, this.translation),
            new ResponseStep(this.messageFactory),
        ];

        let currentInput: VoiceInput | VoiceOutput = input;

        for (const step of steps) {
            currentInput = await step.execute(currentInput as VoiceInput);

            // Agar step VoiceOutput qaytarsa, pipeline tugadi
            if ('message' in currentInput) {
                const totalTime = Date.now() - pipelineStart;
                console.log(`\n✅ Pipeline tugadi. Umumiy vaqt: ${totalTime}ms (${(totalTime / 1000).toFixed(1)}s)\n`);
                return currentInput as VoiceOutput;
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

        const text = await this.whisper.speechToText({ audio: input.audioBuffer, language: sttLang });

        return {
            ...input,
            transcribedText: text,
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
        // AIChatService'dan to'liq kontekst olish (profile, courseProgress, lessonProgress bilan)
        const fullContext = await this.aiChatService['buildContext']({
            userId: Number(input.userId),
            courseId: Number(input.courseId || input.session.courseId),
        });

        const courseProgress = fullContext.courseProgress;
        const userLevel = fullContext.userLevel;

        // User ko'rgan eng oxirgi dars tartib raqami
        const lastWatchedLessonOrder = userLevel?.currentLessonOrder || 0;
        console.log(`📊 User progress: Last watched lesson order = ${lastWatchedLessonOrder}`);

        // Context'dan barcha darslarni olish
        const allLessons = fullContext.chromaContext || [];

        // User textida qanday so'zlar borligini tekshirish
        const userText = input.validatedText || '';

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

        return {
            ...input,
            context: allLessons,
        } as VoiceInput & { context: any };
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

    async execute(input: VoiceInput & { validatedText: string; context: any }): Promise<VoiceInput> {
        // User input logging
        const userLatin = ArabicTextUtils.transliterateArabic(input.validatedText || "");

        console.log("\n👤 User:");
        console.log("   Arab: " + input.validatedText);
        console.log("   Lotin: " + userLatin);

        // 1) Kontekstga tayangan leksik tuzatish va echo-avoidance
        const userText = this.applyContextAwareCorrection(input.validatedText || '', input.context);

        const stripDiacritics = (t: string) => t.replace(/[\u064B-\u065F\u0670]/g, '');
        const normalize = (t: string) => ArabicTextUtils.normalizeArabic(stripDiacritics(t));
        const splitSentences = (t: string): string[] => {
            const cleaned = (t || '').trim();
            if (!cleaned) return [];
            // Arabcha va umumiy punktuatsiya bo'yicha bo'lamiz
            return cleaned
                .split(/(?<=[\.\!؟])\s+/)
                .map(s => s.trim())
                .filter(s => s.length > 0);
        };

        const normalizedUser = normalize(userText);
        let nextSentenceFromMaterial = '';
        let bestMatchNextSentence = '';
        let bestMatchScore = 0;

        const wordSet = (t: string) => new Set(normalize(t).split(/\s+/).filter(Boolean));
        const jaccard = (a: Set<string>, b: Set<string>) => {
            if (a.size === 0 || b.size === 0) return 0;
            let inter = 0;
            for (const w of a) if (b.has(w)) inter++;
            const uni = new Set<string>([...a, ...b]).size;
            return inter / uni;
        };
        const userWords = wordSet(userText);

        if (Array.isArray(input.context)) {
            for (const lesson of input.context) {
                const lessonText: string = (lesson && (lesson.text || lesson.content || '')) as string;
                if (!lessonText) continue;
                const sentences = splitSentences(lessonText);
                for (let i = 0; i < sentences.length; i++) {
                    const s = sentences[i];
                    if (!s) continue;
                    const normalizedSentence = normalize(s);
                    // To'liq yoki kuchli moslik (kiritilgan gap shu gapga teng yoki uning ichida)
                    if (
                        normalizedSentence === normalizedUser ||
                        normalizedSentence.includes(normalizedUser) ||
                        normalizedUser.includes(normalizedSentence)
                    ) {
                        const candidate = sentences[i + 1];
                        if (candidate && candidate.length > 1) {
                            nextSentenceFromMaterial = candidate;
                        }
                        break;
                    }
                    // Fuzzy moslik: Jaccard bo'yicha yaqin gapni eslab qolamiz
                    const score = jaccard(userWords, wordSet(s));
                    if (score > bestMatchScore) {
                        bestMatchScore = score;
                        bestMatchNextSentence = sentences[i + 1] || '';
                    }
                }
                if (nextSentenceFromMaterial) break;
            }
        }

        let aiResponse = '';
        let gptTime = 0;
        if (nextSentenceFromMaterial) {
            aiResponse = nextSentenceFromMaterial;
        } else {
            // 2) Aks holda GPT'dan javob olamiz
            const gptStart = Date.now();
            aiResponse = await this.gpt.generate({
                prompt: userText,
                context: input.context,
                language: 'ar',
                strict: false, // FALSE! Barcha materiallardan qidiradi
            });
            gptTime = Date.now() - gptStart;
        }

        // If GPT is unsure or empty, return specific NO_MATERIAL_RESPONSE
        let aiResponseUz = '';
        const unsure = (aiResponse || '').includes('لَسْتُ مُتَأَكِّدًا');
        // Echo'ni aniqlash: model javobi foydalanuvchi matniga juda o'xshash bo'lsa
        const responseIsEcho = (() => {
            const a = normalize(aiResponse || '');
            if (!a) return false;
            if (a === normalizedUser) return true;
            const sim = jaccard(new Set(a.split(/\s+/).filter(Boolean)), userWords);
            return sim >= 0.85; // yuqori o'xshashlik thresholddi
        })();

        if (!aiResponse || unsure || responseIsEcho) {
            // Agar aniq keyingi gap yo'q bo'lsa, eng yaqin mos gapning keyingisini ishlatamiz
            if (!nextSentenceFromMaterial && bestMatchScore >= 0.5 && bestMatchNextSentence && bestMatchNextSentence.length > 1) {
                aiResponse = bestMatchNextSentence;
            } else {
                aiResponse = AI_FALLBACK_MESSAGES.NO_MATERIAL_RESPONSE.arabic;
                aiResponseUz = AI_FALLBACK_MESSAGES.NO_MATERIAL_RESPONSE.uzbek;
            }
        }
        const aiResponseLatin = ArabicTextUtils.transliterateArabic(aiResponse || "");

        console.log("\n🤖 AI:");
        console.log("   Arab: " + aiResponse);
        console.log("   Lotin: " + aiResponseLatin);
        console.log("   ⏱️  GPT vaqti: " + gptTime + "ms");

        return {
            ...input,
            aiResponse,
            aiResponseUz, // Uzbek matn faqat fallback holatida to'ldiriladi
        } as VoiceInput & { aiResponse: string; aiResponseUz: string };
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
    constructor(private readonly messageFactory: AIChatMessageFactory) { }

    async execute(input: VoiceInput & {
        validatedText: string;
        context: any;
        aiResponse: string;
        aiResponseUz: string;
    }): Promise<VoiceOutput> {
        const message = await this.messageFactory.createResponseMessage(
            input.session,
            input.validatedText,
            input.aiResponse,
            input.aiResponseUz,
            true, // withinLimit
            input.context,
            undefined // audioUrl
        );

        return { message, session: input.session };
    }
}
