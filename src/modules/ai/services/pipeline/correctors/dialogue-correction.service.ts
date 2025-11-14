/**
 * Dialogue Correction Service
 * -------------------------------------------------------
 * Maqsad: Dialogue gap'larini to'liq qidirish va STT xatolarini tuzatish
 */

import { Injectable } from '@nestjs/common';
import { normalizeText, splitSentences } from '../../../utils/text-normalization.util';
import { SIMILARITY_THRESHOLDS } from '../../../constants/gpt-step.constants';
import { SimilarityCalculatorService } from './similarity-calculator.service';
import { NameValidationService } from '../validators/name-validation.service';

@Injectable()
export class DialogueCorrectionService {
    constructor(
        private readonly similarityCalculator: SimilarityCalculatorService,
        private readonly nameValidation: NameValidationService,
    ) { }

    /**
     * Dialogue gap'larini to'liq qidirish va STT xatolarini tuzatish
     * Similarity + word overlap logikasini bir joyga jamlash
     */
    applyDialogueSentenceCorrection(userText: string, context: any[]): string {
        if (!userText || !Array.isArray(context) || context.length === 0) {
            return userText;
        }

        const normalizedUser = normalizeText(userText);
        let bestMatch: string | null = null;
        let bestSimilarity = 0;

        // Barcha context'dagi dialogue gap'larini qidirish
        for (const lesson of context) {
            const lessonText: string = (lesson && (lesson.text || lesson.content || '')) as string;
            if (!lessonText) continue;

            const sentences = splitSentences(lessonText);
            for (const sentence of sentences) {
                const normalizedSentence = normalizeText(sentence);

                // Character-level similarity hisoblash (to'liq gap uchun)
                const similarity = this.similarityCalculator.calculateSentenceSimilarity(
                    normalizedUser,
                    normalizedSentence
                );

                if (similarity > bestSimilarity) {
                    bestSimilarity = similarity;
                    bestMatch = sentence; // Original sentence (diacritics bilan)
                }
            }
        }

        // Agar similarity threshold'dan yuqori bo'lsa, tuzatish
        if (bestMatch && bestSimilarity >= SIMILARITY_THRESHOLDS.DIALOGUE_CORRECTION_MIN) {
            // Ismlarni tekshirish - agar user va material'da ism bor va ular FARQ qilsa, TUZATMASLIK!
            const userName = this.nameValidation.extractName(userText);
            const materialName = this.nameValidation.extractName(bestMatch);

            if (userName && materialName && userName !== materialName) {
                // Ismlar farq qilsa, tuzatmaslik
                return userText;
            }

            return bestMatch;
        }

        return userText;
    }

    /**
     * Conversation-aware correction
     * Topic'ga mos so'zlarni tekshirish va tuzatish
     */
    applyConversationAwareCorrection(
        userText: string,
        context: any[],
        conversationTopic: { topic: string | null; keywords: string[] }
    ): string {
        if (!userText || !conversationTopic.topic) {
            return userText;
        }

        // Materiallardan topic'ga mos so'zlarni yig'ish
        const topicWords = new Set<string>();

        if (Array.isArray(context)) {
            for (const lesson of context) {
                const text = (lesson?.text || lesson?.content || '') as string;
                if (!text) continue;

                const normalized = normalizeText(text);
                const words = normalized.split(/\s+/).filter(Boolean);

                // Topic'ga mos so'zlarni qo'shish
                if (conversationTopic.topic === 'profession') {
                    const professionKeywords = ['مُهَنْدِس', 'تَاجِر', 'طَبِيب', 'طَالِب', 'مُعَلِّم'];
                    words.forEach(w => {
                        if (professionKeywords.some(kw => w.includes(kw))) {
                            topicWords.add(w);
                        }
                    });
                } else if (conversationTopic.topic === 'object') {
                    const objectKeywords = ['بُرْتُقَال', 'بَيْت', 'مَوْز', 'كِتَاب'];
                    words.forEach(w => {
                        if (objectKeywords.some(kw => w.includes(kw))) {
                            topicWords.add(w);
                        }
                    });
                }
            }
        }

        // User text'dagi so'zlarni tekshirish va tuzatish
        const userWords = userText.split(/\s+/);
        let corrected = false;

        for (let i = 0; i < userWords.length; i++) {
            const word = userWords[i];
            const normalizedWord = normalizeText(word);

            // Agar so'z materialda yo'q bo'lsa, lekin topic'da bor so'zlarga o'xshash bo'lsa
            if (topicWords.size > 0) {
                for (const topicWord of topicWords) {
                    const similarity = this.similarityCalculator.calculateWordSimilarity(
                        normalizedWord,
                        topicWord
                    );
                    // 70%+ o'xshashlik bo'lsa va materialda yo'q so'z bo'lsa, tuzatish
                    if (similarity > 0.7) {
                        userWords[i] = topicWord;
                        corrected = true;
                        break;
                    }
                }
            }
        }

        return corrected ? userWords.join(' ') : userText;
    }
}

