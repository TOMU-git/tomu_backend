/**
 * Similarity Calculator Service
 * -------------------------------------------------------
 * Maqsad: So'z va gap'lar o'rtasidagi o'xshashlikni hisoblash
 */

import { Injectable } from '@nestjs/common';
import { SIMILARITY_THRESHOLDS, SENTENCE_LENGTH } from '../../../constants/gpt-step.constants';

@Injectable()
export class SimilarityCalculatorService {
    /**
     * Levenshtein distance - ikki string o'rtasidagi minimum edit distance
     */
    levenshteinDistance(str1: string, str2: string): number {
        const m = str1.length;
        const n = str2.length;

        if (m === 0) return n;
        if (n === 0) return m;

        // Dynamic programming matrix
        const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

        // Initialize first row and column
        for (let i = 0; i <= m; i++) dp[i][0] = i;
        for (let j = 0; j <= n; j++) dp[0][j] = j;

        // Fill the matrix
        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
                dp[i][j] = Math.min(
                    dp[i - 1][j] + 1,     // deletion
                    dp[i][j - 1] + 1,     // insertion
                    dp[i - 1][j - 1] + cost // substitution
                );
            }
        }

        return dp[m][n];
    }

    /**
     * Ikki so'z o'rtasidagi o'xshashlikni hisoblash (Levenshtein distance asosida)
     */
    calculateWordSimilarity(word1: string, word2: string): number {
        if (!word1 || !word2) return 0;
        if (word1 === word2) return 1;

        const maxLen = Math.max(word1.length, word2.length);
        if (maxLen === 0) return 1;

        const distance = this.levenshteinDistance(word1, word2);
        const similarity = 1 - (distance / maxLen);

        return Math.max(0, similarity);
    }

    /**
     * Ikki gap o'rtasidagi o'xshashlikni hisoblash
     * Character-level similarity + word overlap kombinatsiyasi
     */
    calculateSentenceSimilarity(sentence1: string, sentence2: string): number {
        if (!sentence1 || !sentence2) return 0;
        if (sentence1 === sentence2) return 1;

        // 1) Character-level similarity (Levenshtein)
        const maxLen = Math.max(sentence1.length, sentence2.length);
        const charSimilarity = maxLen > 0
            ? 1 - (this.levenshteinDistance(sentence1, sentence2) / maxLen)
            : 0;

        // 2) Word overlap (Jaccard)
        const words1 = new Set(sentence1.split(/\s+/).filter(Boolean));
        const words2 = new Set(sentence2.split(/\s+/).filter(Boolean));
        let wordIntersection = 0;
        for (const w of words1) if (words2.has(w)) wordIntersection++;
        const wordUnion = new Set([...words1, ...words2]).size;
        const wordSimilarity = wordUnion > 0 ? wordIntersection / wordUnion : 0;

        // 3) Qisqa gap'lar uchun character-level muhimroq
        // Uzoq gap'lar uchun word overlap muhimroq
        const isShort = sentence1.length < SENTENCE_LENGTH.SHORT_THRESHOLD ||
            sentence2.length < SENTENCE_LENGTH.SHORT_THRESHOLD;
        const combinedSimilarity = isShort
            ? charSimilarity * 0.7 + wordSimilarity * 0.3
            : charSimilarity * 0.4 + wordSimilarity * 0.6;

        return Math.max(0, combinedSimilarity);
    }

    /**
     * Jaccard similarity - ikki text o'rtasidagi o'xshashlik
     */
    calculateJaccardSimilarity(text1: string, text2: string): number {
        const words1 = new Set(text1.split(/\s+/).filter(Boolean));
        const words2 = new Set(text2.split(/\s+/).filter(Boolean));

        if (words1.size === 0 || words2.size === 0) return 0;

        let intersection = 0;
        for (const word of words1) {
            if (words2.has(word)) intersection++;
        }

        const union = new Set([...words1, ...words2]).size;
        return intersection / union;
    }
}

