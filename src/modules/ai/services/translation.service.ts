import { Injectable, Logger } from "@nestjs/common";
import axios from "axios";
import { createHash } from "crypto";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const TRANSLATION_MODEL = process.env.GPT_MODEL || "gpt-4o"; // ✅ Fixed: gpt-4o is the correct model
const TRANSLATION_MAX_TOKENS = 500; // Increased for longer translations

/**
 * TranslationService
 * -------------------------------------------------------
 * Maqsad: Tarjima va til aniqlash yordamchisi.
 */
@Injectable()
export class TranslationService {
    private readonly logger = new Logger(TranslationService.name);

    // ✅ In-memory translation cache
    private translationCache: Map<string, { translation: string; cachedAt: number }> = new Map();
    private readonly CACHE_TTL_SECONDS = 3600; // 1 hour
    private readonly MAX_CACHE_SIZE = 500; // Prevent memory leak

    /**
     * Generate cache key from Arabic text
     */
    private generateCacheKey(text: string): string {
        const normalized = text.trim().toLowerCase();
        return createHash('md5').update(normalized).digest('hex');
    }

    /**
     * Get translation from cache
     */
    private getFromCache(text: string): string | null {
        const key = this.generateCacheKey(text);
        const cached = this.translationCache.get(key);

        if (cached) {
            const age = (Date.now() - cached.cachedAt) / 1000;
            if (age < this.CACHE_TTL_SECONDS) {
                this.logger.debug(`⚡ Translation cache HIT (age: ${age.toFixed(1)}s)`);
                return cached.translation;
            } else {
                // Expired
                this.translationCache.delete(key);
            }
        }

        return null;
    }

    /**
     * Save translation to cache
     */
    private saveToCache(text: string, translation: string): void {
        const key = this.generateCacheKey(text);

        this.translationCache.set(key, {
            translation,
            cachedAt: Date.now(),
        });

        // Cleanup old entries if cache too large
        if (this.translationCache.size > this.MAX_CACHE_SIZE) {
            const oldestKey = this.translationCache.keys().next().value;
            this.translationCache.delete(oldestKey);
        }

        this.logger.debug(`💾 Translation cached (total: ${this.translationCache.size})`);
    }

    /**
     * Get cache statistics
     */
    getCacheStats(): { size: number; maxSize: number; ttl: number } {
        return {
            size: this.translationCache.size,
            maxSize: this.MAX_CACHE_SIZE,
            ttl: this.CACHE_TTL_SECONDS,
        };
    }

    /**
     * ✅ Translate multiple texts in parallel
     * Performance optimization: bir nechta matnlarni parallel translate qilish
     */
    async translateBatch(texts: string[]): Promise<string[]> {
        if (!texts || !Array.isArray(texts) || texts.length === 0) {
            return [];
        }

        this.logger.debug(`🔄 Batch translation started: ${texts.length} texts`);

        // Parallel translation
        const promises = texts.map(text => this.translateToUzbek(text));
        const results = await Promise.all(promises);

        this.logger.debug(`✅ Batch translation completed: ${results.filter(r => r.length > 0).length}/${texts.length} successful`);

        return results;
    }

    async translateToUzbek(text: string): Promise<string> {
        // ✅ Improved validation
        if (!text || typeof text !== 'string' || !text.trim()) {
            return '';
        }

        if (!OPENAI_API_KEY) {
            this.logger.error('OPENAI_API_KEY not configured');
            return '';
        }

        // ✅ Check cache first
        const cached = this.getFromCache(text);
        if (cached) {
            return cached;
        }

        try {
            const res = await axios.post(
                "https://api.openai.com/v1/chat/completions",
                {
                    model: TRANSLATION_MODEL,
                    messages: [
                        {
                            role: "system",
                            content: "You are a translator. Translate Arabic text to Uzbek (Latin script). Only return the translation, nothing else."
                        },
                        {
                            role: "user",
                            content: text
                        }
                    ],
                    max_tokens: TRANSLATION_MAX_TOKENS,
                    temperature: 0.2, // ✅ Lower temperature for more accurate translation
                },
                {
                    headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
                    timeout: 60000 // ✅ Increased to 60 seconds for longer texts
                }
            );

            const translated = (res.data as any)?.choices?.[0]?.message?.content?.trim();

            // ✅ Validation: tarjima bo'sh bo'lmasligi kerak
            if (!translated || translated.length === 0) {
                this.logger.warn('Empty translation received');
                return '';
            }

            // ✅ Save to cache
            this.saveToCache(text, translated);

            // ✅ Success log (faqat development uchun)
            if (process.env.NODE_ENV === 'development') {
                this.logger.debug(`Translated: "${text.substring(0, 30)}..." -> "${translated.substring(0, 30)}..."`);
            }

            return translated;
        } catch (e: any) {
            // ✅ Detailed error logging
            const errorDetails = {
                message: e?.message || 'Unknown error',
                status: e?.response?.status,
                statusText: e?.response?.statusText,
                textLength: text?.length || 0,
            };
            this.logger.error('Translation failed: ' + JSON.stringify(errorDetails));

            // ✅ Return empty string instead of original text (to avoid incorrect translations)
            return '';
        }
    }
}


