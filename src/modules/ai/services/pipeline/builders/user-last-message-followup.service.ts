import { Injectable } from '@nestjs/common';
import { normalizeText } from '../../../utils/text-normalization.util';
import { FollowUpQuestion } from './material-followup.service';

/**
 * User Last Message Follow-up Service
 * 
 * User'ning oxirgi gapidan entity ajratib, shunga mos mantiqiy savol yaratish.
 * 
 * Maqsad:
 * - User hozir nima haqida gapirgan - shunga javob
 * - Aniq va contextual savol
 * - Material vocabulary chegarasida
 */

@Injectable()
export class UserLastMessageFollowUpService {
    /**
     * User'ning oxirgi gapidan follow-up savol yaratish
     * 
     * @param conversationHistory - Suhbat tarixi
     * @param context - Dars materiallari
     * @param lastWatchedLessonOrder - Foydalanuvchi progress
     * @returns Follow-up savol yoki null
     */
    findFollowUpFromLastMessage(
        conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
        context: any[],
        lastWatchedLessonOrder: number
    ): FollowUpQuestion | null {
        if (conversationHistory.length === 0) {
            return null;
        }

        // Oxirgi user xabarini topish
        let lastUserMessage: string | null = null;
        for (let i = conversationHistory.length - 1; i >= 0; i--) {
            if (conversationHistory[i].role === 'user') {
                lastUserMessage = conversationHistory[i].content;
                break;
            }
        }

        if (!lastUserMessage) {
            console.log('[UserLastMessage] Oxirgi user xabari topilmadi');
            return null;
        }

        console.log(`[UserLastMessage] Oxirgi user xabari: "${lastUserMessage.substring(0, 50)}..."`);

        // 1. Entity ajratish
        const entity = this.extractEntity(lastUserMessage);
        if (!entity) {
            console.log('[UserLastMessage] Entity topilmadi');
            return null;
        }

        console.log(`[UserLastMessage] Entity topildi: ${entity.name} (${entity.type})`);

        // 2. Material vocabulary yig'ish
        const materialVocabulary = this.extractMaterialVocabulary(context, lastWatchedLessonOrder);

        // 3. Entity'ga mos mantiqiy savol yaratish
        const question = this.generateQuestionForEntity(entity, materialVocabulary);
        if (!question) {
            console.log('[UserLastMessage] Savol yaratilmadi');
            return null;
        }

        console.log(`[UserLastMessage] Savol yaratildi: ${question.question}`);
        return question;
    }

    /**
     * User xabaridan entity ajratish
     */
    private extractEntity(message: string): { name: string; type: 'object' | 'person' | 'place' | 'concept'; uzbekText?: string } | null {
        const normalized = normalizeText(message);

        // Entity pattern'lar (kengaytirilgan)
        const entityPatterns = [
            // Meva va ovqatlar
            { ar: ['مَوْزَة', 'مَوْز', 'موز', 'موزة'], name: 'مَوْزَةٌ', uz: 'banan', type: 'object' as const },
            { ar: ['بُرْتُقَالَة', 'بُرْتُقَال', 'برتقال', 'برتقالة'], name: 'بُرْتُقَالَةٌ', uz: 'apelsin', type: 'object' as const },
            { ar: ['تُفَّاحَة', 'تُفَّاح', 'تفاح', 'تفاحة'], name: 'تُفَّاحَةٌ', uz: 'olma', type: 'object' as const },
            { ar: ['خُبْز', 'خبز'], name: 'خُبْزٌ', uz: 'non', type: 'object' as const },
            { ar: ['مَاء', 'ماء'], name: 'مَاءٌ', uz: 'suv', type: 'object' as const },
            { ar: ['لَبَن', 'لبن'], name: 'لَبَنٌ', uz: 'sut', type: 'object' as const },

            // Buyumlar
            { ar: ['كِتَاب', 'كتاب'], name: 'كِتَابٌ', uz: 'kitob', type: 'object' as const },
            { ar: ['قَلَم', 'قلم'], name: 'قَلَمٌ', uz: 'qalam', type: 'object' as const },
            { ar: ['دَفْتَر', 'دفتر'], name: 'دَفْتَرٌ', uz: 'daftar', type: 'object' as const },
            { ar: ['مِكْتَب', 'مكتب'], name: 'مِكْتَبٌ', uz: 'stol', type: 'object' as const },
            { ar: ['كُرْسِي', 'كرسي'], name: 'كُرْسِيٌّ', uz: 'stul', type: 'object' as const },
            { ar: ['حَقِيبَة', 'حقيبة'], name: 'حَقِيبَةٌ', uz: 'sumka', type: 'object' as const },
            { ar: ['بَيْت', 'بيت'], name: 'بَيْتٌ', uz: 'uy', type: 'object' as const },
            { ar: ['سَيَّارَة', 'سيارة'], name: 'سَيَّارَةٌ', uz: 'mashina', type: 'object' as const },

            // Kasblar va shaxslar
            { ar: ['طَبِيب', 'طبيب'], name: 'طَبِيبٌ', uz: 'shifokor', type: 'person' as const },
            { ar: ['مُعَلِّم', 'معلم'], name: 'مُعَلِّمٌ', uz: 'o\'qituvchi', type: 'person' as const },
            { ar: ['طَالِب', 'طالب'], name: 'طَالِبٌ', uz: 'talaba', type: 'person' as const },
            { ar: ['أَب', 'اب', 'أبو', 'ابو'], name: 'أَبٌ', uz: 'ota', type: 'person' as const },
            { ar: ['أُمّ', 'ام', 'أمّ', 'امّ'], name: 'أُمٌّ', uz: 'ona', type: 'person' as const },
            { ar: ['أَخ', 'اخ'], name: 'أَخٌ', uz: 'aka/uka', type: 'person' as const },

            // Joylar
            { ar: ['مَدْرَسَة', 'مدرسة'], name: 'مَدْرَسَةٌ', uz: 'maktab', type: 'place' as const },
            { ar: ['مَسْجِد', 'مسجد'], name: 'مَسْجِدٌ', uz: 'masjid', type: 'place' as const },
            { ar: ['سُوق', 'سوق'], name: 'سُوقٌ', uz: 'bozor', type: 'place' as const },
            { ar: ['مُسْتَشْفَى', 'مستشفى'], name: 'مُسْتَشْفَى', uz: 'shifoxona', type: 'place' as const },
            { ar: ['حَدِيقَة', 'حديقة'], name: 'حَدِيقَةٌ', uz: 'bog\'', type: 'place' as const },
            { ar: ['جَبَل', 'جبل'], name: 'جَبَلٌ', uz: 'tog\'', type: 'place' as const },

            // Tushunchalar
            { ar: ['كَبِير', 'كبير'], name: 'كَبِيرٌ', uz: 'katta', type: 'concept' as const },
            { ar: ['صَغِير', 'صغير'], name: 'صَغِيرٌ', uz: 'kichik', type: 'concept' as const },
            { ar: ['جَمِيل', 'جميل'], name: 'جَمِيلٌ', uz: 'chiroyli', type: 'concept' as const },
            { ar: ['لَذِيذ', 'لذيذ'], name: 'لَذِيذٌ', uz: 'mazali', type: 'concept' as const },
            { ar: ['نَظِيف', 'نظيف'], name: 'نَظِيفٌ', uz: 'toza', type: 'concept' as const },
        ];

        for (const pattern of entityPatterns) {
            for (const ar of pattern.ar) {
                if (message.includes(ar) || normalized.includes(normalizeText(ar))) {
                    return {
                        name: pattern.name,
                        type: pattern.type,
                        uzbekText: pattern.uz,
                    };
                }
            }
        }

        return null;
    }

    /**
     * Entity'ga mos mantiqiy savol yaratish
     */
    private generateQuestionForEntity(
        entity: { name: string; type: 'object' | 'person' | 'place' | 'concept'; uzbekText?: string },
        materialVocabulary: Set<string>
    ): FollowUpQuestion | null {
        const questions: Array<{ ar: string; uz: string; words: string[] }> = [];

        // Entity type'ga qarab savol pattern'lari
        switch (entity.type) {
            case 'object':
                questions.push(
                    { ar: `أَيْنَ ${entity.name}؟`, uz: `${entity.uzbekText} qayerda?`, words: ['أَيْنَ'] },
                    { ar: `مَا لَوْنُ ${entity.name}؟`, uz: `${entity.uzbekText} rangi nima?`, words: ['مَا', 'لَوْنُ'] },
                    { ar: `هَلْ ${entity.name} كَبِيرٌ؟`, uz: `${entity.uzbekText} kattami?`, words: ['هَلْ', 'كَبِيرٌ'] },
                    { ar: `هَلْ ${entity.name} جَمِيلٌ؟`, uz: `${entity.uzbekText} chiroylimi?`, words: ['هَلْ', 'جَمِيلٌ'] },
                    { ar: `هَلْ تُرِيدُ ${entity.name}؟`, uz: `${entity.uzbekText} xohlaysizmi?`, words: ['هَلْ', 'تُرِيدُ'] },
                );
                break;

            case 'person':
                questions.push(
                    { ar: `أَيْنَ ${entity.name}؟`, uz: `${entity.uzbekText} qayerda?`, words: ['أَيْنَ'] },
                    { ar: `مَنْ ${entity.name}؟`, uz: `${entity.uzbekText} kim?`, words: ['مَنْ'] },
                    { ar: `مَا اسْمُ ${entity.name}؟`, uz: `${entity.uzbekText} ismi nima?`, words: ['مَا', 'اسْمُ'] },
                    { ar: `هَلْ ${entity.name} هُنَا؟`, uz: `${entity.uzbekText} bu yerdami?`, words: ['هَلْ', 'هُنَا'] },
                );
                break;

            case 'place':
                questions.push(
                    { ar: `أَيْنَ ${entity.name}؟`, uz: `${entity.uzbekText} qayerda?`, words: ['أَيْنَ'] },
                    { ar: `مَاذَا فِي ${entity.name}؟`, uz: `${entity.uzbekText}da nima bor?`, words: ['مَاذَا', 'فِي'] },
                    { ar: `مَنْ فِي ${entity.name}؟`, uz: `${entity.uzbekText}da kim bor?`, words: ['مَنْ', 'فِي'] },
                    { ar: `هَلْ ${entity.name} كَبِيرٌ؟`, uz: `${entity.uzbekText} kattami?`, words: ['هَلْ', 'كَبِيرٌ'] },
                );
                break;

            case 'concept':
                questions.push(
                    { ar: `هَلْ هُوَ ${entity.name}؟`, uz: `U ${entity.uzbekText}mi?`, words: ['هَلْ', 'هُوَ'] },
                    { ar: `هَلْ هِيَ ${entity.name}؟`, uz: `U ${entity.uzbekText}mi?`, words: ['هَلْ', 'هِيَ'] },
                );
                break;
        }

        // Material vocabulary'da mavjud so'zlardan foydalangan savolni tanlash
        for (const q of questions) {
            const allWordsInMaterial = q.words.every(word => {
                const normalized = normalizeText(word);
                return Array.from(materialVocabulary).some(v => normalizeText(v).includes(normalized));
            });

            if (allWordsInMaterial) {
                return {
                    question: q.ar,
                    questionUz: q.uz,
                    source: 'pattern',
                    confidence: 0.92, // Yuqori confidence - user oxirgi gapiga mos
                };
            }
        }

        // Agar material vocabulary'da yo'q bo'lsa, eng oddiy savolni berish
        if (questions.length > 0) {
            return {
                question: questions[0].ar,
                questionUz: questions[0].uz,
                source: 'pattern',
                confidence: 0.85, // Biroz pastroq - material vocabulary'da yo'q
            };
        }

        return null;
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

            // Arab so'zlarni ajratish
            const arabicWords = content.match(/[\u0600-\u06FF]+/g) || [];

            for (const word of arabicWords) {
                if (word.length >= 2) {
                    vocabulary.add(word);
                }
            }
        }

        return vocabulary;
    }
}