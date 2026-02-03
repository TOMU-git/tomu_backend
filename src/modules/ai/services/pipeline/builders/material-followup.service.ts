import { Injectable } from "@nestjs/common";
import { normalizeText } from "../../../utils/text-normalization.util";

/**
 * Material Follow-up Service
 * 
 * Materialdan context-aware follow-up savollarni topish.
 * 
 * Vazifalar:
 * 1. Current entity'ga aloqador follow-up topish
 * 2. Material dialogue pattern'lardan foydalanish
 * 3. Context-aware follow-up tanlash
 */

export interface FollowUpQuestion {
    question: string;
    questionUz?: string;
    source: 'material' | 'pattern';
    confidence: number; // 0-1 oralig'ida
}

@Injectable()
export class MaterialFollowUpService {
    /**
     * Materialdan context-aware follow-up qidirish
     * 
     * @param currentResponse - Hozirgi AI javobi (materialdan)
     * @param conversationHistory - Suhbat tarixi
     * @param context - Dars materiallari
     * @param lastWatchedLessonOrder - Foydalanuvchi progress
     * @returns Follow-up savol yoki null
     */
    findFollowUp(
        currentResponse: string,
        conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
        context: any[],
        lastWatchedLessonOrder: number
    ): FollowUpQuestion | null {
        // 1. Current response'dan entity ajratish
        const entity = this.extractEntity(currentResponse);
        if (!entity) {
            console.log('[MaterialFollowUp] Entity topilmadi');
            return null;
        }

        console.log(`[MaterialFollowUp] Entity topildi: ${entity}`);

        // 2. Materialdan entity'ga aloqador pattern topish
        const followUpPattern = this.findEntityFollowUpPattern(entity, context, lastWatchedLessonOrder);
        if (followUpPattern) {
            console.log(`[MaterialFollowUp] Follow-up topildi: ${followUpPattern.question}`);
            return followUpPattern;
        }

        // 3. Umumiy pattern'lardan foydalanish (agar material'da topilmasa)
        const genericPattern = this.getGenericFollowUpPattern(entity, currentResponse);
        if (genericPattern) {
            console.log(`[MaterialFollowUp] Generic pattern topildi: ${genericPattern.question}`);
            return genericPattern;
        }

        console.log('[MaterialFollowUp] Follow-up topilmadi');
        return null;
    }

    /**
     * Oxirgi N ta xabardan follow-up qidirish
     * 
     * @param conversationHistory - Suhbat tarixi
     * @param context - Dars materiallari
     * @param lastWatchedLessonOrder - Foydalanuvchi progress
     * @param messageCount - Nechta oxirgi xabarni tahlil qilish (default: 2)
     * @returns Follow-up savol yoki null
     */
    findFollowUpFromRecentHistory(
        conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
        context: any[],
        lastWatchedLessonOrder: number,
        messageCount: number = 2
    ): FollowUpQuestion | null {
        if (conversationHistory.length === 0) {
            return null;
        }

        console.log(`[MaterialFollowUp] Oxirgi ${messageCount} xabardan entity qidirish...`);

        // Oxirgi N ta xabarni olish
        const recentMessages = conversationHistory.slice(-messageCount);

        // Har bir xabardan entity ajratish (teskari tartibda - eng oxirgisidan)
        for (let i = recentMessages.length - 1; i >= 0; i--) {
            const message = recentMessages[i];
            const entity = this.extractEntity(message.content);

            if (entity) {
                console.log(`[MaterialFollowUp] Entity topildi oxirgi ${recentMessages.length - i} xabarda: ${entity}`);

                // Entity'ga mos follow-up topish
                const followUpPattern = this.findEntityFollowUpPattern(entity, context, lastWatchedLessonOrder);
                if (followUpPattern) {
                    // Confidence'ni biroz pasaytirish (chunki bu oxirgi gap emas)
                    return {
                        ...followUpPattern,
                        confidence: 0.88, // Phase 3 confidence
                    };
                }

                // Generic pattern
                const genericPattern = this.getGenericFollowUpPattern(entity, message.content);
                if (genericPattern) {
                    return {
                        ...genericPattern,
                        confidence: 0.85, // Biroz pastroq
                    };
                }
            }
        }

        console.log(`[MaterialFollowUp] Oxirgi ${messageCount} xabarda entity topilmadi`);
        return null;
    }

    /**
     * Response'dan entity ajratish
     */
    private extractEntity(response: string): string | null {
        const normalized = normalizeText(response);

        // Entity pattern'lar (ismlar, narsa nomlari)
        const entityPatterns = [
            // Obyektlar
            { ar: ['كِتَاب', 'كتاب'], name: 'كِتَابٌ' },
            { ar: ['قَلَم', 'قلم'], name: 'قَلَمٌ' },
            { ar: ['دَفْتَر', 'دفتر'], name: 'دَفْتَرٌ' },
            { ar: ['مَوْز', 'موز', 'مَوْزَة', 'موزة'], name: 'مَوْزٌ' },
            { ar: ['بُرْتُقَال', 'برتقال', 'بُرْتُقَالَة', 'برتقالة'], name: 'بُرْتُقَالٌ' },
            { ar: ['تُفَّاح', 'تفاح', 'تُفَّاحَة', 'تفاحة'], name: 'تُفَّاحٌ' },
            { ar: ['مِكْتَب', 'مكتب'], name: 'مِكْتَبٌ' },
            { ar: ['كُرْسِي', 'كرسي'], name: 'كُرْسِيٌّ' },
            { ar: ['حَقِيبَة', 'حقيبة'], name: 'حَقِيبَةٌ' },
            { ar: ['بَيْت', 'بيت'], name: 'بَيْتٌ' },

            // Kasblar
            { ar: ['طَبِيب', 'طبيب'], name: 'طَبِيبٌ' },
            { ar: ['مُعَلِّم', 'معلم'], name: 'مُعَلِّمٌ' },
            { ar: ['طَالِب', 'طالب'], name: 'طَالِبٌ' },

            // Joylar
            { ar: ['مَدْرَسَة', 'مدرسة'], name: 'مَدْرَسَةٌ' },
            { ar: ['مَسْجِد', 'مسجد'], name: 'مَسْجِدٌ' },
            { ar: ['سُوق', 'سوق'], name: 'سُوقٌ' },
        ];

        for (const pattern of entityPatterns) {
            for (const ar of pattern.ar) {
                if (response.includes(ar) || normalized.includes(normalizeText(ar))) {
                    return pattern.name;
                }
            }
        }

        return null;
    }

    /**
     * Materialdan entity'ga aloqador follow-up pattern topish
     */
    private findEntityFollowUpPattern(
        entity: string,
        context: any[],
        lastWatchedLessonOrder: number
    ): FollowUpQuestion | null {
        // Context'dan entity bilan bog'liq dialogue'larni qidirish
        for (const material of context) {
            if (material.lessonOrder > lastWatchedLessonOrder) {
                continue; // Foydalanuvchi hali bu darsga kelmagan
            }

            const content = material.text || '';
            if (!content.includes(entity)) {
                continue; // Bu material entity haqida emas
            }

            // Dialog pattern'ni qidirish
            // Pattern: statement → follow-up question
            const lines = content.split('\n').filter((l: string) => l.trim().length > 0);

            for (let i = 0; i < lines.length - 1; i++) {
                const currentLine = lines[i];
                const nextLine = lines[i + 1];

                // Agar current line entity'ni o'z ichiga olsa va next line savol bo'lsa
                if (currentLine.includes(entity) && nextLine.includes('؟')) {
                    // Follow-up savol topildi
                    return {
                        question: nextLine.trim(),
                        questionUz: material.translationUz || undefined,
                        source: 'material',
                        confidence: 0.9,
                    };
                }
            }
        }

        return null;
    }

    /**
     * Generic follow-up pattern'lar (material'da topilmasa)
     */
    private getGenericFollowUpPattern(entity: string, currentResponse: string): FollowUpQuestion | null {
        // Entity type'ni aniqlash
        const entityType = this.detectEntityType(entity);

        if (entityType === 'object') {
            // Obyektlar uchun generic pattern'lar
            return {
                question: `أَيْنَ ${entity}؟`,
                questionUz: `${entity} qayerda?`,
                source: 'pattern',
                confidence: 0.7,
            };
        } else if (entityType === 'person') {
            // Shaxslar uchun generic pattern'lar
            return {
                question: `مَنْ ${entity}؟`,
                questionUz: `${entity} kim?`,
                source: 'pattern',
                confidence: 0.7,
            };
        } else if (entityType === 'place') {
            // Joylar uchun generic pattern'lar
            return {
                question: `مَاذَا فِي ${entity}؟`,
                questionUz: `${entity}da nima bor?`,
                source: 'pattern',
                confidence: 0.7,
            };
        }

        return null;
    }

    /**
     * Entity type'ni aniqlash
     */
    private detectEntityType(entity: string): 'object' | 'person' | 'place' | 'unknown' {
        const normalized = normalizeText(entity);

        // Obyektlar
        const objects = ['كتاب', 'قلم', 'دفتر', 'موز', 'برتقال', 'تفاح', 'مكتب', 'كرسي', 'حقيبة', 'بيت'];
        for (const obj of objects) {
            if (normalized.includes(normalizeText(obj))) {
                return 'object';
            }
        }

        // Shaxslar
        const persons = ['طبيب', 'معلم', 'طالب'];
        for (const person of persons) {
            if (normalized.includes(normalizeText(person))) {
                return 'person';
            }
        }

        // Joylar
        const places = ['مدرسة', 'مسجد', 'سوق'];
        for (const place of places) {
            if (normalized.includes(normalizeText(place))) {
                return 'place';
            }
        }

        return 'unknown';
    }
}










