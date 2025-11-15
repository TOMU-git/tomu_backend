/**
 * Text Normalization Utilities
 * -------------------------------------------------------
 * Maqsad: Arabcha matnni tozalash va normalizatsiya qilish uchun bitta joyda barcha funksiyalar
 */

import { ArabicTextUtils } from './arabic-text.util';

/**
 * Diacritics (harakatlar) ni olib tashlash
 */
export function stripDiacritics(text: string): string {
    if (!text) return '';
    return text.replace(/[\u064B-\u065F\u0670\u0640]/g, '');
}

/**
 * Punctuation (tinish belgilari) ni olib tashlash
 */
export function stripPunctuation(text: string): string {
    if (!text) return '';
    return text.replace(/[،,\.\?؟!;؛:]/g, '').trim();
}

/**
 * To'liq normalizatsiya: diacritics + punctuation + ArabicTextUtils.normalizeArabic
 * Bu bitta funksiya barcha normalizatsiya operatsiyalarini bajaradi
 */
export function normalizeText(text: string): string {
    if (!text) return '';
    const cleaned = stripPunctuation(stripDiacritics(text));
    return ArabicTextUtils.normalizeArabic(cleaned);
}

/**
 * Matnni gap'larga bo'lish
 */
export function splitSentences(text: string): string[] {
    const cleaned = (text || '').trim();
    if (!cleaned) return [];
    return cleaned
        .split(/(?<=[\.\!؟])\s+/)
        .map(s => s.trim())
        .filter(s => s.length > 0);
}

/**
 * So'zlar to'plamini yaratish (normalized text'dan)
 */
export function createWordSet(text: string): Set<string> {
    const normalized = normalizeText(text);
    return new Set(normalized.split(/\s+/).filter(Boolean));
}




