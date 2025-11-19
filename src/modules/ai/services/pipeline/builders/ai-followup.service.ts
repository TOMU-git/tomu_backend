import { Injectable } from "@nestjs/common";
import { GPTService } from "../../gpt.service";
import { ConversationEntityExtractorService } from "../extractors/conversation-entity-extractor.service";
import { FollowUpQuestion } from "./material-followup.service";

/**
 * AI Follow-up Service
 * 
 * AI orqali context-aware follow-up savol yaratish (qat'iy qoidalar bilan).
 * 
 * Qat'iy qoidalar:
 * 1. Entity-based: Faqat conversation history'dagi entity'lar haqida
 * 2. Topic-bound: Faqat hozirgi mavzu bo'yicha
 * 3. Material vocabulary: Faqat materialda mavjud so'zlardan foydalanish
 * 4. Context-aware: Conversation context'ga asoslangan
 * 5. No new topics: Yangi mavzu kiritmaslik
 */

@Injectable()
export class AIFollowUpService {
    constructor(
        private readonly gpt: GPTService,
        private readonly entityExtractor: ConversationEntityExtractorService
    ) {}

    /**
     * AI orqali context-aware follow-up savol yaratish
     * 
     * @param currentResponse - Hozirgi AI javobi
     * @param conversationHistory - Suhbat tarixi
     * @param context - Dars materiallari
     * @param lastWatchedLessonOrder - Foydalanuvchi progress
     * @returns Follow-up savol yoki null
     */
    async generateFollowUp(
        currentResponse: string,
        conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
        context: any[],
        lastWatchedLessonOrder: number
    ): Promise<FollowUpQuestion | null> {
        try {
            // 1. Conversation entities ajratish
            const conversationContext = this.entityExtractor.extractEntities(conversationHistory);
            
            if (conversationContext.entities.length === 0) {
                console.log('[AIFollowUp] Entity topilmadi - savol berilmaydi');
                return null;
            }

            // 2. Material vocabulary yig'ish (faqat foydalanuvchi ko'rgan darslar)
            const materialVocabulary = this.extractMaterialVocabulary(context, lastWatchedLessonOrder);

            // 3. Strict system prompt yaratish
            const systemPrompt = this.buildStrictFollowUpPrompt(
                conversationContext.entities,
                materialVocabulary
            );

            // 4. GPT'ga so'rov (qat'iy qoidalar bilan)
            // Free mode ishlatamiz - custom qoidalar bilan
            const gptResult = await this.gpt.generateWithUsage({
                prompt: this.buildFollowUpRequest(currentResponse, conversationContext.entities, materialVocabulary),
                context: [], // Context yubormaymiz
                language: 'ar',
                strict: false,
                conversationHistory: [], // History yubormaymiz
                freeMode: true, // Custom qoidalar bilan erkin rejim
            });

            const followUpQuestion = gptResult.text?.trim() || '';

            // 5. Validatsiya: savol to'g'ri yaratilganmi?
            if (!followUpQuestion || followUpQuestion.length === 0) {
                console.log('[AIFollowUp] GPT javob bermadi');
                return null;
            }

            // Savol belgisi bormi?
            if (!followUpQuestion.includes('؟')) {
                console.log('[AIFollowUp] Savol belgisi yo\'q - rad etildi');
                return null;
            }

            // Entity'lardan biri eslatilganmi?
            const mentionsEntity = conversationContext.entities.some(e => 
                followUpQuestion.includes(e.arabicText)
            );

            if (!mentionsEntity) {
                console.log('[AIFollowUp] Entity eslatilmagan - rad etildi');
                return null;
            }

            console.log(`[AIFollowUp] Follow-up yaratildi: ${followUpQuestion}`);

            return {
                question: followUpQuestion,
                source: 'material',
                confidence: 0.8,
            };
        } catch (error) {
            console.error(`[AIFollowUp] Xato: ${error.message}`);
            return null;
        }
    }

    /**
     * Strict follow-up prompt yaratish
     */
    private buildStrictFollowUpPrompt(
        entities: Array<{ type: string; arabicText: string; uzbekText?: string }>,
        materialVocabulary: Set<string>
    ): string {
        const entityList = entities.map(e => e.arabicText).join(', ');
        const vocabularyList = Array.from(materialVocabulary).slice(0, 50).join(', ');

        return [
            "You are a STRICT Arabic language teacher creating follow-up questions.",
            "",
            "CRITICAL RULES (MUST FOLLOW):",
            "1. ONLY ask about these entities mentioned in conversation: " + entityList,
            "2. ONLY use vocabulary from this list: " + vocabularyList,
            "3. Ask ONE short question with full diacritics (تشكيل)",
            "4. Question MUST end with '؟'",
            "5. DO NOT introduce new topics or entities",
            "6. DO NOT ask about things not mentioned in conversation",
            "7. Keep it simple and contextually relevant",
            "",
            "Examples of GOOD questions:",
            "- أَيْنَ الْكِتَابُ؟ (Where is the book?) - if كِتَابٌ was mentioned",
            "- هَلْ هُوَ كِتَابُكَ؟ (Is it your book?) - if كِتَابٌ was mentioned",
            "",
            "Examples of BAD questions (DO NOT DO THIS):",
            "- مَا اسْمُكَ؟ (What is your name?) - NEW topic",
            "- أَيْنَ أَبُوكَ؟ (Where is your father?) - NEW entity not mentioned",
            "",
            "Response format: Just the question, nothing else.",
        ].join("\n");
    }

    /**
     * Follow-up request yaratish
     */
    private buildFollowUpRequest(
        currentResponse: string,
        entities: Array<{ type: string; arabicText: string; uzbekText?: string }>,
        materialVocabulary: Set<string>
    ): string {
        const mostRecentEntity = entities[0]; // Eng oxirgisi
        const entityList = entities.map(e => e.arabicText).join(', ');
        const vocabularyList = Array.from(materialVocabulary).slice(0, 30).join(', ');

        return [
            `You are a STRICT Arabic teacher creating a follow-up question.`,
            ``,
            `CRITICAL RULES (MUST FOLLOW):`,
            `1. Ask ONLY about entities mentioned in conversation: ${entityList}`,
            `2. Focus on: ${mostRecentEntity.arabicText} (${mostRecentEntity.type})`,
            `3. Use ONLY these Arabic words: ${vocabularyList}`,
            `4. ONE short question with FULL diacritics (تشكيل)`,
            `5. Question MUST end with '؟'`,
            `6. NO new topics, NO new entities`,
            ``,
            `Current conversation:`,
            `- Just said: "${currentResponse}"`,
            ``,
            `Good examples (if ${mostRecentEntity.arabicText} was mentioned):`,
            `- أَيْنَ ${mostRecentEntity.arabicText}؟ (Where is it?)`,
            `- هَلْ هُوَ ${mostRecentEntity.arabicText}كَ؟ (Is it yours?)`,
            ``,
            `BAD examples (DO NOT DO):`,
            `- مَا اسْمُكَ؟ (NEW topic)`,
            `- أَيْنَ أَبُوكَ؟ (NEW entity)`,
            ``,
            `Task: Ask ONE follow-up question about ${mostRecentEntity.arabicText}.`,
            `Response: (just the question, nothing else)`,
        ].join("\n");
    }

    /**
     * Material vocabulary yig'ish
     */
    private extractMaterialVocabulary(context: any[], lastWatchedLessonOrder: number): Set<string> {
        const vocabulary = new Set<string>();

        for (const material of context) {
            if (material.lessonOrder > lastWatchedLessonOrder) {
                continue; // Foydalanuvchi hali bu darsga kelmagan
            }

            const content = material.text || '';
            
            // Arab so'zlarni ajratish (oddiy pattern)
            const arabicWords = content.match(/[\u0600-\u06FF]+/g) || [];
            
            for (const word of arabicWords) {
                if (word.length >= 2) { // Juda qisqa so'zlarni o'tkazib yuborish
                    vocabulary.add(word);
                }
            }
        }

        return vocabulary;
    }
}

