/**
 * Vocabulary Validation Service
 * -------------------------------------------------------
 * Maqsad: Material vocabulary'ni extract qilish va validatsiya qilish
 */

import { Injectable } from '@nestjs/common';
import { normalizeText, createWordSet } from '../../../utils/text-normalization.util';
import { VOCABULARY_VALIDATION } from '../../../constants/gpt-step.constants';

@Injectable()
export class VocabularyValidationService {
    /**
     * Material vocabulary'ni extract qilish
     * Vocabulary Set'ni faqat normalized words bilan yaratish
     */
    extractMaterialVocabulary(context: any[], lastWatchedLessonOrder?: number): Set<string> {
        const vocabularySet = new Set<string>();

        if (!Array.isArray(context) || context.length === 0) {
            return vocabularySet;
        }

        // 1. Vocabulary list'dan so'zlar (lesson.vocabulary)
        for (const lesson of context) {
            // Skip future lessons if lastWatchedLessonOrder provided
            if (lastWatchedLessonOrder && lesson?.lessonOrder && lesson.lessonOrder > lastWatchedLessonOrder) {
                continue;
            }

            // Extract vocabulary words
            if (lesson.vocabulary && Array.isArray(lesson.vocabulary)) {
                for (const vocab of lesson.vocabulary) {
                    const word = vocab.word || vocab.normalized;
                    if (word) {
                        const normalizedWord = normalizeText(word);
                        if (normalizedWord && normalizedWord.length > 0) {
                            vocabularySet.add(normalizedWord);
                        }
                    }
                }
            }
        }

        // 2. Dialogue text'lardan so'zlar (lesson.text yoki lesson.content)
        for (const lesson of context) {
            // Skip future lessons if lastWatchedLessonOrder provided
            if (lastWatchedLessonOrder && lesson?.lessonOrder && lesson.lessonOrder > lastWatchedLessonOrder) {
                continue;
            }

            const lessonText = (lesson?.text || lesson?.content || '') as string;
            if (!lessonText || lessonText.trim().length === 0) {
                continue;
            }

            // Extract words from dialogue text (normalized)
            const normalizedText = normalizeText(lessonText);
            const words = normalizedText.split(/\s+/).filter(Boolean);

            for (const word of words) {
                // Faqat mazmunli so'zlar
                if (word.length >= VOCABULARY_VALIDATION.MIN_WORD_LENGTH) {
                    vocabularySet.add(word);
                }
            }
        }

        return vocabularySet;
    }

    /**
     * GPT javobidagi so'zlar material vocabulary'da borligini tekshirish
     * Faqat material words ishlatilganligini tekshirish
     */
    checkResponseUsesValidVocabulary(response: string, vocabularySet: Set<string>): boolean {
        if (!response || !vocabularySet || vocabularySet.size === 0) {
            return false; // Vocabulary yo'q bo'lsa, validation o'tkazib bo'lmaydi
        }

        const normalizedResponse = normalizeText(response);
        if (!normalizedResponse || normalizedResponse.length === 0) {
            return false;
        }

        // Response'dan so'zlarni extract qilish
        const responseWords = normalizedResponse.split(/\s+/).filter(Boolean);

        if (responseWords.length === 0) {
            return false;
        }

        // Har bir so'zni vocabulary'da borligini tekshirish
        for (const word of responseWords) {
            // Faqat mazmunli so'zlar tekshiriladi
            if (word.length >= VOCABULARY_VALIDATION.MIN_WORD_LENGTH && !vocabularySet.has(word)) {
                return false; // Invalid so'z topildi
            }
        }

        return true; // Barcha so'zlar material vocabulary'da
    }
}














