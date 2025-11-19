/**
 * Response Cache Service
 * -------------------------------------------------------
 * Material responses, GPT responses va translationlarni cache qilish
 * Redis orqali distributed cache (optional feature flag bilan)
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';

export interface CachedResponse {
    aiResponse: string;
    aiResponseUz: string;
    gptUsage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
    cachedAt: number;
    source: 'material' | 'gpt' | 'precomputed';
}

@Injectable()
export class ResponseCacheService {
    private readonly logger = new Logger(ResponseCacheService.name);
    private readonly cacheEnabled: boolean;
    private readonly cacheTTL: number; // seconds
    
    // In-memory cache (fallback when Redis unavailable)
    private memoryCache: Map<string, CachedResponse> = new Map();
    private readonly maxMemoryCacheSize = 1000; // Prevent memory leak
    
    constructor(private readonly configService: ConfigService) {
        this.cacheEnabled = this.configService.get<string>('RESPONSE_CACHE_ENABLED', 'false') === 'true';
        this.cacheTTL = Number(this.configService.get<string>('RESPONSE_CACHE_TTL_SECONDS', '3600')); // 1 hour default
        
        if (this.cacheEnabled) {
            this.logger.log(`✅ Response cache enabled (TTL: ${this.cacheTTL}s, in-memory fallback)`);
        } else {
            this.logger.log(`⚠️  Response cache disabled (RESPONSE_CACHE_ENABLED=false)`);
        }
    }

    /**
     * Generate cache key from user text and context
     */
    private generateKey(
        userText: string,
        courseId?: number,
        lastWatchedLessonOrder?: number
    ): string {
        const data = JSON.stringify({
            text: userText.trim().toLowerCase(),
            courseId: courseId || 0,
            lesson: lastWatchedLessonOrder || 0,
        });
        return `ai_response:${createHash('md5').update(data).digest('hex')}`;
    }

    /**
     * Get cached response
     */
    async get(
        userText: string,
        courseId?: number,
        lastWatchedLessonOrder?: number
    ): Promise<CachedResponse | null> {
        if (!this.cacheEnabled) return null;

        const key = this.generateKey(userText, courseId, lastWatchedLessonOrder);
        
        // Try memory cache first
        const cached = this.memoryCache.get(key);
        if (cached) {
            // Check TTL
            const age = (Date.now() - cached.cachedAt) / 1000;
            if (age < this.cacheTTL) {
                this.logger.debug(`⚡ Cache HIT (memory): ${key.substring(0, 30)}... (age: ${age.toFixed(1)}s)`);
                return cached;
            } else {
                // Expired
                this.memoryCache.delete(key);
            }
        }

        return null;
    }

    /**
     * Set cache
     */
    async set(
        userText: string,
        response: Omit<CachedResponse, 'cachedAt'>,
        courseId?: number,
        lastWatchedLessonOrder?: number
    ): Promise<void> {
        if (!this.cacheEnabled) return;

        const key = this.generateKey(userText, courseId, lastWatchedLessonOrder);
        
        const cachedResponse: CachedResponse = {
            ...response,
            cachedAt: Date.now(),
        };

        // Memory cache
        this.memoryCache.set(key, cachedResponse);
        
        // Cleanup old entries if cache too large
        if (this.memoryCache.size > this.maxMemoryCacheSize) {
            const oldestKey = this.memoryCache.keys().next().value;
            this.memoryCache.delete(oldestKey);
        }

        this.logger.debug(`💾 Cache SET: ${key.substring(0, 30)}... (source: ${response.source})`);
    }

    /**
     * Clear cache (for testing/debugging)
     */
    async clear(): Promise<void> {
        this.memoryCache.clear();
        this.logger.log('🗑️  Cache cleared');
    }

    /**
     * Get cache stats
     */
    getStats(): {
        enabled: boolean;
        size: number;
        maxSize: number;
        ttl: number;
    } {
        return {
            enabled: this.cacheEnabled,
            size: this.memoryCache.size,
            maxSize: this.maxMemoryCacheSize,
            ttl: this.cacheTTL,
        };
    }
}

