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
                const userEntities = this.extractEntitiesFromText(content, i);
                entities.push(...userEntities);
                
                // User nima haqida so'ragan
                const askedTopic = this.extractAskedTopic(content);
                if (askedTopic) {
                    userAskedAbout.push(askedTopic);
                }
            } else if (message.role === 'assistant') {
                // AI javobidan entity'larni ajratish
                const aiEntities = this.extractEntitiesFromText(content, i);
                entities.push(...aiEntities);

                // Mavzularni ajratish
                const topic = this.extractTopicFromResponse(content);
                if (topic) {
                    recentTopics.push(topic);
                }
            }

            // Faqat oxirgi 5 ta xabarni tahlil qilamiz (tezlik uchun)
            if (conversationHistory.length - i > 5) {
                break;
            }
        }

        return {
            entities: this.deduplicateEntities(entities),
            recentTopics: this.deduplicateTopics(recentTopics),
            userAskedAbout: this.deduplicateTopics(userAskedAbout),
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
            
            // Uy-joy va narsalar
            { ar: ['كِتَاب', 'كتاب'], uz: 'kitob', type: 'object' as const },
            { ar: ['قَلَم', 'قلم'], uz: 'qalam', type: 'object' as const },
            { ar: ['بَيْت', 'بيت'], uz: 'uy', type: 'object' as const },
            { ar: ['سَيَّارَة', 'سيارة'], uz: 'mashina', type: 'object' as const },
            { ar: ['زَهْرَة', 'زهرة'], uz: 'gul', type: 'object' as const },
            { ar: ['شَجَرَة', 'شجرة'], uz: 'daraxt', type: 'object' as const },
            
            // Kasblar
            { ar: ['طَبِيب', 'طبيب'], uz: 'shifokor', type: 'person' as const },
            { ar: ['مُعَلِّم', 'معلم'], uz: 'o\'qituvchi', type: 'person' as const },
            { ar: ['مُهَنْدِس', 'مهندس'], uz: 'muhandis', type: 'person' as const },
            
            // Joylar
            { ar: ['مَدْرَسَة', 'مدرسة'], uz: 'maktab', type: 'place' as const },
            { ar: ['مَسْجِد', 'مسجد'], uz: 'masjid', type: 'place' as const },
            { ar: ['سُوق', 'سوق'], uz: 'bozor', type: 'place' as const },
            
            // Sifatlar va tushunchalar
            { ar: ['حُلْو', 'حلو'], uz: 'shirin', type: 'concept' as const },
            { ar: ['كَبِير', 'كبير'], uz: 'katta', type: 'concept' as const },
            { ar: ['صَغِير', 'صغير'], uz: 'kichik', type: 'concept' as const },
            { ar: ['جَمِيل', 'جميل'], uz: 'chiroyli', type: 'concept' as const },
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
    formatEntitiesForGPT(context: ConversationContext): string {
        if (context.entities.length === 0) {
            return '';
        }

        const parts: string[] = [];

        // Obyektlar
        const objects = context.entities.filter(e => e.type === 'object');
        if (objects.length > 0) {
            const objectList = objects.map(o => `${o.arabicText} (${o.uzbekText})`).join(', ');
            parts.push(`Objects mentioned: ${objectList}`);
        }

        // Shaxslar
        const persons = context.entities.filter(e => e.type === 'person');
        if (persons.length > 0) {
            const personList = persons.map(p => `${p.arabicText} (${p.uzbekText})`).join(', ');
            parts.push(`People/Professions mentioned: ${personList}`);
        }

        // Joylar
        const places = context.entities.filter(e => e.type === 'place');
        if (places.length > 0) {
            const placeList = places.map(p => `${p.arabicText} (${p.uzbekText})`).join(', ');
            parts.push(`Places mentioned: ${placeList}`);
        }

        // User nima haqida so'ragan
        if (context.userAskedAbout.length > 0) {
            parts.push(`User asked about: ${context.userAskedAbout.join(', ')}`);
        }

        return parts.join('\n');
    }
}

