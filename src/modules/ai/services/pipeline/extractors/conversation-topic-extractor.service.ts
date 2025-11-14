/**
 * Conversation Topic Extractor Service
 * -------------------------------------------------------
 * Maqsad: Conversation history'dan topic/mavzuni aniqlash
 */

import { Injectable } from '@nestjs/common';
import { ArabicTextUtils } from '../../../utils/arabic-text.util';
import { normalizeText } from '../../../utils/text-normalization.util';
import { TOPIC_EXTRACTION } from '../../../constants/gpt-step.constants';

export interface ConversationTopic {
    topic: string | null;
    keywords: string[];
}

@Injectable()
export class ConversationTopicExtractorService {
    /**
     * Conversation history'dan topic/mavzuni aniqlash
     * Oxirgi 4 gapdan topic aniqlash, keywords limiti 5 ta
     */
    extractTopic(
        conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
        context: any[]
    ): ConversationTopic {
        if (conversationHistory.length === 0) {
            return { topic: null, keywords: [] };
        }

        // So'z kategoriyalari
        const professionKeywords = ['مُهَنْدِس', 'تَاجِر', 'طَبِيب', 'طَالِب', 'مُعَلِّم', 'مُحَمَّد', 'أَحْمَد'];
        const objectKeywords = ['بُرْتُقَال', 'بَيْت', 'مَوْز', 'كِتَاب', 'مَسْجِد'];
        const placeKeywords = ['قَرِيب', 'بَعِيد', 'هنا', 'هناك'];

        // Materiallardan so'zlarni kategoriya bo'yicha ajratish
        const professionWords = new Set<string>();
        const objectWords = new Set<string>();
        const placeWords = new Set<string>();

        if (Array.isArray(context)) {
            for (const lesson of context) {
                const text = (lesson?.text || lesson?.content || '') as string;
                if (!text) continue;

                const normalizedText = normalizeText(text);

                // Kategoriyalarga ajratish
                professionKeywords.forEach(kw => {
                    if (normalizedText.includes(kw)) professionWords.add(kw);
                });
                objectKeywords.forEach(kw => {
                    if (normalizedText.includes(kw)) objectWords.add(kw);
                });
                placeKeywords.forEach(kw => {
                    if (normalizedText.includes(kw)) placeWords.add(kw);
                });
            }
        }

        // Conversation history'dan so'zlarni yig'ish (oxirgi 4 gap)
        const historyWords = new Set<string>();
        const lastMessages = conversationHistory.slice(-TOPIC_EXTRACTION.LAST_SENTENCES_COUNT);

        for (const msg of lastMessages) {
            const text = msg.content || '';
            const normalized = normalizeText(text);
            normalized.split(/\s+/).filter(Boolean).forEach(w => historyWords.add(w));
        }

        // Conversation'da qaysi kategoriya so'zlari ko'p uchrayotganini aniqlash
        let professionCount = 0;
        let objectCount = 0;
        let placeCount = 0;

        for (const word of historyWords) {
            if (professionWords.has(word) || professionKeywords.some(kw => word.includes(kw))) {
                professionCount++;
            }
            if (objectWords.has(word) || objectKeywords.some(kw => word.includes(kw))) {
                objectCount++;
            }
            if (placeWords.has(word) || placeKeywords.some(kw => word.includes(kw))) {
                placeCount++;
            }
        }

        // Topic aniqlash
        let topic: string | null = null;
        const keywords: string[] = [];

        if (professionCount > 0 && professionCount >= objectCount && professionCount >= placeCount) {
            topic = 'profession';
            for (const word of historyWords) {
                if (professionWords.has(word) || professionKeywords.some(kw => word.includes(kw))) {
                    keywords.push(word);
                }
            }
        } else if (objectCount > 0 && objectCount >= placeCount) {
            topic = 'object';
            for (const word of historyWords) {
                if (objectWords.has(word) || objectKeywords.some(kw => word.includes(kw))) {
                    keywords.push(word);
                }
            }
        } else if (placeCount > 0) {
            topic = 'place';
            for (const word of historyWords) {
                if (placeWords.has(word) || placeKeywords.some(kw => word.includes(kw))) {
                    keywords.push(word);
                }
            }
        }

        // Keywords limitini belgilash
        return {
            topic,
            keywords: [...new Set(keywords)].slice(0, TOPIC_EXTRACTION.MAX_KEYWORDS),
        };
    }
}

