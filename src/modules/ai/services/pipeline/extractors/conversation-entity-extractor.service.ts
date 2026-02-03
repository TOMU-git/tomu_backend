import { Injectable } from "@nestjs/common";
import { normalizeText } from "../../../utils/text-normalization.util";

/**
 * Conversation Entity Extractor Service
 * 
 * Suhbat tarixidan obyektlar, mavzular va kontekstni ajratib oladi.
 * Bu ma'lumotlar AI'ga mantiqiy javob berish uchun ishlatiladi.
 */

export interface ConversationEntity {
    type: 'object' | 'person' | 'place' | 'concept';
    arabicText: string;
    uzbekText?: string;
    mentionedAt: number; // Conversation history'dagi indeks
}

export interface ConversationContext {
    entities: ConversationEntity[];
    recentTopics: string[];
    userAskedAbout: string[]; // User nima haqida so'ragan
    lastUserQuestion: string | null;
}

@Injectable()
export class ConversationEntityExtractorService {
    /**
     * Conversation history'dan entity'larni ajratib olish
     */
    extractEntities(conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>): ConversationContext {
        const entities: ConversationEntity[] = [];
        const recentTopics: string[] = [];
        const userAskedAbout: string[] = [];
        let lastUserQuestion: string | null = null;

        // Conversation history'ni teskari tartibda ko'rib chiqish (eng oxirgisidan)
        for (let i = conversationHistory.length - 1; i >= 0; i--) {
            const message = conversationHistory[i];
            const content = message.content;

            if (message.role === 'user') {
                lastUserQuestion = content;
                // User so'rovidan entity'larni ajratish
                const userEntities = this.extractEntitiesFromText(content, conversationHistory.length - i);
                entities.push(...userEntities);

                // User nima haqida so'ragan
                const askedTopic = this.extractAskedTopic(content);
                if (askedTopic) {
                    userAskedAbout.push(askedTopic);
                }
            } else if (message.role === 'assistant') {
                // AI javobidan entity'larni ajratish
                const aiEntities = this.extractEntitiesFromText(content, conversationHistory.length - i);
                entities.push(...aiEntities);

                // Mavzularni ajratish
                const topic = this.extractTopicFromResponse(content);
                if (topic) {
                    recentTopics.push(topic);
                }
            }

            // ✅ FILTRLASH: Faqat oxirgi 3 ta xabarni tahlil qilamiz (noisy entity'larni kamaytirish)
            if (conversationHistory.length - i > 3) {
                break;
            }
        }

        // Entity'larni deduplicate qilish, lekin oxirgi mention'ni saqlab qolish
        const dedupedEntities = this.deduplicateEntitiesKeepRecent(entities);

        // ✅ FILTRLASH: Maksimum 5 ta entity (eng muhimlari)
        const topEntities = dedupedEntities.slice(0, 5);

        return {
            entities: topEntities,
            recentTopics: this.deduplicateTopics(recentTopics).slice(0, 3), // Maksimum 3 ta topic
            userAskedAbout: this.deduplicateTopics(userAskedAbout).slice(0, 3), // Maksimum 3 ta
            lastUserQuestion,
        };
    }

    /**
     * Matndan entity'larni ajratish
     */
    private extractEntitiesFromText(text: string, index: number): ConversationEntity[] {
        const entities: ConversationEntity[] = [];
        const normalized = normalizeText(text);

        // Obyektlar ro'yxati (kengaytirilgan)
        const objectPatterns = [
            // Meva va ovqatlar
            { ar: ['مَوْزَة', 'مَوْز', 'موز', 'موزة'], uz: 'banan', type: 'object' as const },
            { ar: ['بُرْتُقَالَة', 'بُرْتُقَال', 'برتقال', 'برتقالة'], uz: 'apelsin', type: 'object' as const },
            { ar: ['تُفَّاحَة', 'تُفَّاح', 'تفاح', 'تفاحة'], uz: 'olma', type: 'object' as const },
            { ar: ['خُبْز', 'خبز'], uz: 'non', type: 'object' as const },
            { ar: ['مَاء', 'ماء'], uz: 'suv', type: 'object' as const },
            { ar: ['لَبَن', 'لبن'], uz: 'sut', type: 'object' as const },
            { ar: ['عَسَل', 'عسل'], uz: 'asal', type: 'object' as const },
            { ar: ['فَاكِهَة', 'فاكهة'], uz: 'meva', type: 'object' as const },
            { ar: ['طَعَام', 'طعام'], uz: 'ovqat', type: 'object' as const },

            // Uy-joy va narsalar
            { ar: ['كِتَاب', 'كتاب'], uz: 'kitob', type: 'object' as const },
            { ar: ['قَلَم', 'قلم'], uz: 'qalam', type: 'object' as const },
            { ar: ['دَفْتَر', 'دفتر'], uz: 'daftar', type: 'object' as const },
            { ar: ['مِكْتَب', 'مكتب'], uz: 'stol', type: 'object' as const },
            { ar: ['كُرْسِي', 'كرسي'], uz: 'stul', type: 'object' as const },
            { ar: ['حَقِيبَة', 'حقيبة'], uz: 'sumka', type: 'object' as const },
            { ar: ['بَيْت', 'بيت'], uz: 'uy', type: 'object' as const },
            { ar: ['بَاب', 'باب'], uz: 'eshik', type: 'object' as const },
            { ar: ['نَافِذَة', 'نافذة'], uz: 'deraza', type: 'object' as const },
            { ar: ['سَيَّارَة', 'سيارة'], uz: 'mashina', type: 'object' as const },
            { ar: ['زَهْرَة', 'زهرة'], uz: 'gul', type: 'object' as const },
            { ar: ['شَجَرَة', 'شجرة'], uz: 'daraxt', type: 'object' as const },

            // Kasblar va shaxslar
            { ar: ['طَبِيب', 'طبيب'], uz: 'shifokor', type: 'person' as const },
            { ar: ['مُعَلِّم', 'معلم'], uz: 'o\'qituvchi', type: 'person' as const },
            { ar: ['مُهَنْدِس', 'مهندس'], uz: 'muhandis', type: 'person' as const },
            { ar: ['طَالِب', 'طالب'], uz: 'talaba', type: 'person' as const },
            { ar: ['أَب', 'أب', 'اب'], uz: 'ota', type: 'person' as const },
            { ar: ['أُم', 'أم', 'ام'], uz: 'ona', type: 'person' as const },
            { ar: ['أَخ', 'أخ', 'اخ'], uz: 'aka/uka', type: 'person' as const },
            { ar: ['أُخْت', 'أخت', 'اخت'], uz: 'opa/singil', type: 'person' as const },

            // Joylar
            { ar: ['مَدْرَسَة', 'مدرسة'], uz: 'maktab', type: 'place' as const },
            { ar: ['مَسْجِد', 'مسجد'], uz: 'masjid', type: 'place' as const },
            { ar: ['سُوق', 'سوق'], uz: 'bozor', type: 'place' as const },
            { ar: ['حَدِيقَة', 'حديقة'], uz: 'bog', type: 'place' as const },
            { ar: ['مَكْتَبَة', 'مكتبة'], uz: 'kutubxona', type: 'place' as const },
            { ar: ['مُسْتَشْفَى', 'مستشفى'], uz: 'kasalxona', type: 'place' as const },

            // Sifatlar va tushunchalar
            { ar: ['حُلْو', 'حلو'], uz: 'shirin', type: 'concept' as const },
            { ar: ['لَذِيذ', 'لذيذ'], uz: 'mazali', type: 'concept' as const },
            { ar: ['كَبِير', 'كبير'], uz: 'katta', type: 'concept' as const },
            { ar: ['صَغِير', 'صغير'], uz: 'kichik', type: 'concept' as const },
            { ar: ['جَمِيل', 'جميل'], uz: 'chiroyli', type: 'concept' as const },
            { ar: ['مُفِيد', 'مفيد'], uz: 'foydali', type: 'concept' as const },
            { ar: ['جَدِيد', 'جديد'], uz: 'yangi', type: 'concept' as const },
            { ar: ['قَدِيم', 'قديم'], uz: 'eski', type: 'concept' as const },
        ];

        // Har bir pattern'ni tekshirish
        for (const pattern of objectPatterns) {
            for (const ar of pattern.ar) {
                if (text.includes(ar) || normalized.includes(normalizeText(ar))) {
                    entities.push({
                        type: pattern.type,
                        arabicText: pattern.ar[0], // Birinchi variant (to'liq tashkilli)
                        uzbekText: pattern.uz,
                        mentionedAt: index,
                    });
                    break; // Bitta topilsa yetarli
                }
            }
        }

        return entities;
    }

    /**
     * User nima haqida so'ragan (what/this/that)
     */
    private extractAskedTopic(text: string): string | null {
        const normalized = normalizeText(text);

        // "هذا" (this), "ذلك" (that), "ما" (what) so'zlari
        if (normalized.includes('هذا') || normalized.includes('هاذا')) {
            return 'this';
        }
        if (normalized.includes('ذلك') || normalized.includes('ذالك')) {
            return 'that';
        }
        if (normalized.includes('ما')) {
            return 'what';
        }

        return null;
    }

    /**
     * AI javobidan mavzuni ajratish
     */
    private extractTopicFromResponse(text: string): string | null {
        // Oddiy mavzu aniqlash - keyinchalik murakkablashtirish mumkin
        const normalized = normalizeText(text);

        if (normalized.includes('موز') || normalized.includes('فاكهة')) {
            return 'meva';
        }
        if (normalized.includes('كتاب')) {
            return 'kitob';
        }
        if (normalized.includes('طبيب') || normalized.includes('معلم')) {
            return 'kasb';
        }

        return null;
    }

    /**
     * Entity'larni deduplicate qilish (takrorlanishni olib tashlash)
     * Eng oxirgi mention'ni birinchi o'ringa qo'yadi (current topic)
     */
    private deduplicateEntitiesKeepRecent(entities: ConversationEntity[]): ConversationEntity[] {
        const seen = new Map<string, ConversationEntity>();

        // Entities already in reverse order (most recent first)
        // So we keep the FIRST occurrence (which is the most recent)
        for (const entity of entities) {
            const key = `${entity.type}:${entity.arabicText}`;
            if (!seen.has(key)) {
                seen.set(key, entity);
            }
        }

        // Convert map values to array (preserves insertion order)
        return Array.from(seen.values());
    }

    /**
     * Entity'larni deduplicate qilish (takrorlanishni olib tashlash)
     * @deprecated Use deduplicateEntitiesKeepRecent instead
     */
    private deduplicateEntities(entities: ConversationEntity[]): ConversationEntity[] {
        const seen = new Set<string>();
        const unique: ConversationEntity[] = [];

        for (const entity of entities) {
            const key = `${entity.type}:${entity.arabicText}`;
            if (!seen.has(key)) {
                seen.add(key);
                unique.push(entity);
            }
        }

        return unique;
    }

    /**
     * Mavzularni deduplicate qilish
     */
    private deduplicateTopics(topics: string[]): string[] {
        return Array.from(new Set(topics));
    }

    /**
     * Entity'ni context'ga format qilish (GPT uchun)
     */
    formatEntitiesForGPT(context: ConversationContext, enableEngagement: boolean = true): string {
        if (context.entities.length === 0) {
            return '';
        }

        const parts: string[] = [];

        // Eng oxirgi entity'ni alohida ta'kidlash (eng muhim - hozirgi mavzu)
        const mostRecentEntity = context.entities[0]; // Birinchi element - eng oxirgisi
        if (mostRecentEntity) {
            parts.push(`🎯 CURRENT TOPIC: ${mostRecentEntity.arabicText} (${mostRecentEntity.uzbekText}) - ${mostRecentEntity.type.toUpperCase()}`);
            // Engagement o'chirilgan bo'lsa, follow-up question qismini olib tashlash
            if (enableEngagement) {
                parts.push(`   → Your follow-up question MUST be about this ${mostRecentEntity.type}!`);
            }
            parts.push('');
        }

        // Obyektlar
        const objects = context.entities.filter(e => e.type === 'object');
        if (objects.length > 0) {
            const objectList = objects.map(o => `${o.arabicText} (${o.uzbekText})`).join(', ');
            parts.push(`Objects in dialogue: ${objectList}`);
        }

        // Shaxslar
        const persons = context.entities.filter(e => e.type === 'person');
        if (persons.length > 0) {
            const personList = persons.map(p => `${p.arabicText} (${p.uzbekText})`).join(', ');
            parts.push(`People/Professions in dialogue: ${personList}`);
        }

        // Joylar
        const places = context.entities.filter(e => e.type === 'place');
        if (places.length > 0) {
            const placeList = places.map(p => `${p.arabicText} (${p.uzbekText})`).join(', ');
            parts.push(`Places in dialogue: ${placeList}`);
        }

        // Tushunchalar
        const concepts = context.entities.filter(e => e.type === 'concept');
        if (concepts.length > 0) {
            const conceptList = concepts.map(c => `${c.arabicText} (${c.uzbekText})`).join(', ');
            parts.push(`Concepts discussed: ${conceptList}`);
        }

        // User nima haqida so'ragan
        if (context.userAskedAbout.length > 0) {
            parts.push(`User asked about: ${context.userAskedAbout.join(', ')}`);
        }

        // Context-aware question suggestions (faqat engagement yoqilgan bo'lsa)
        if (enableEngagement && mostRecentEntity) {
            parts.push('');
            parts.push('💡 SUGGESTED FOLLOW-UP QUESTIONS (use these or similar):');
            const suggestions = this.getQuestionSuggestions(mostRecentEntity);
            suggestions.forEach(s => parts.push(`   - ${s}`));
        }

        return parts.join('\n');
    }

    /**
     * Entity type'ga qarab savol tavsiyalarini qaytarish
     */
    private getQuestionSuggestions(entity: ConversationEntity): string[] {
        const entityName = entity.arabicText;

        switch (entity.type) {
            case 'object':
                return [
                    `أَيْنَ ${entityName}؟ (Where is the ${entity.uzbekText}?)`,
                    `هَلْ هُوَ ${entityName}كَ؟ (Is it your ${entity.uzbekText}?)`,
                    `مَا لَوْنُ ${entityName}؟ (What is the color of ${entity.uzbekText}?)`,
                ];
            case 'place':
                return [
                    `مَاذَا فِي ${entityName}؟ (What is in the ${entity.uzbekText}?)`,
                    `أَيْنَ ${entityName}؟ (Where is the ${entity.uzbekText}?)`,
                    `مَنْ فِي ${entityName}؟ (Who is in the ${entity.uzbekText}?)`,
                ];
            case 'person':
                return [
                    `أَيْنَ ${entityName}؟ (Where is the ${entity.uzbekText}?)`,
                    `مَا اسْمُهُ؟ (What is their name?)`,
                ];
            case 'concept':
                return [
                    `هَلْ هُوَ ${entityName}؟ (Is it ${entity.uzbekText}?)`,
                ];
            default:
                return [];
        }
    }
}

