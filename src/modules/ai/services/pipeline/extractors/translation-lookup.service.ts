/**
 * Translation Lookup Service
 * -------------------------------------------------------
 * Maqsad: Materiallardan translationUz ni qidirish
 */

import { Injectable } from '@nestjs/common';
import { normalizeText } from '../../../utils/text-normalization.util';

@Injectable()
export class TranslationLookupService {
    /**
     * Materiallardan translationUz ni qidirish
     * Exact match o'rniga normalized & punctuation-free match ishlatish
     * Dialogue / monologue / direct text fields tekshirish
     */
    findTranslationUzInMaterials(
        aiResponse: string,
        context: any[],
        lastWatchedLessonOrder?: number
    ): string | null {
        if (!aiResponse || !context || !Array.isArray(context) || context.length === 0) {
            return null;
        }

        const normalizedResponse = normalizeText(aiResponse);
        if (!normalizedResponse || normalizedResponse.length === 0) {
            return null;
        }

        // Context'dan barcha materiallarni ko'rib chiqish
        for (const lesson of context) {
            // Skip future lessons if lastWatchedLessonOrder provided
            if (lastWatchedLessonOrder && lesson?.lessonOrder && lesson.lessonOrder > lastWatchedLessonOrder) {
                continue;
            }

            // Dialogue turns'ni tekshirish
            if (lesson.dialogue && Array.isArray(lesson.dialogue)) {
                for (const turn of lesson.dialogue) {
                    const turnText = turn?.text || turn?.content || '';
                    if (!turnText) continue;

                    const normalizedTurn = normalizeText(turnText);
                    if (normalizedTurn === normalizedResponse) {
                        // Normalized match topildi
                        const translationUz = turn?.translationUz || null;
                        if (translationUz) {
                            return translationUz;
                        }
                    }
                }
            }

            // Monologue'ni tekshirish
            if (lesson.monologue && Array.isArray(lesson.monologue)) {
                for (const segment of lesson.monologue) {
                    const segmentText = segment?.text || segment?.content || '';
                    if (!segmentText) continue;

                    const normalizedSegment = normalizeText(segmentText);
                    if (normalizedSegment === normalizedResponse) {
                        // Normalized match topildi
                        const translationUz = segment?.translationUz || null;
                        if (translationUz) {
                            return translationUz;
                        }
                    }
                }
            }

            // Direct text field'ni tekshirish (backward compatibility)
            const lessonText = lesson?.text || lesson?.content || '';
            if (lessonText) {
                const normalizedLesson = normalizeText(lessonText);
                if (normalizedLesson === normalizedResponse) {
                    const translationUz = lesson?.translationUz || null;
                    if (translationUz) {
                        return translationUz;
                    }
                }
            }
        }

        return null; // Topilmadi
    }
}

