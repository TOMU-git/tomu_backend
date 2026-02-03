/**
 * GPT Step Constants
 * -------------------------------------------------------
 * Maqsad: GPTStep servisida ishlatiladigan barcha threshold va constant'lar
 */

/**
 * Similarity va matching threshold'lar
 */
export const SIMILARITY_THRESHOLDS = {
    // Word-level similarity
    WORD_SIMILARITY: 0.75, // 75%+ similarity bo'lsa, so'z mos deb hisoblaymiz
    WORDS_MATCH_RATIO: 0.8, // 80%+ so'zlar mos bo'lishi kerak
    MIN_WORDS_FOR_MATCH: 3, // Kamida 3 so'z bo'lishi kerak

    // Sentence-level similarity
    SENTENCE_SIMILARITY_HIGH: 0.5, // 50%+ similarity - yuqori match
    SENTENCE_SIMILARITY_MODERATE: 0.3, // 30%+ similarity - o'rtacha match
    DIALOGUE_CORRECTION_MIN: 0.65, // 65%+ similarity bo'lsa, dialogue correction qilish
    PHONETIC_FALLBACK_MIN: 0.50, // 50%+ similarity - phonetic fallback uchun minimum
    PHONETIC_FALLBACK_MAX: 0.65, // 65% dan past - phonetic fallback uchun maximum

    // Echo detection
    ECHO_SIMILARITY: 0.7, // 70%+ o'xshashlik - echo deb hisoblash
    ECHO_LENGTH_RATIO: 1.5, // Response user gapidan 1.5x katta bo'lmasligi kerak
    ECHO_LENGTH_RATIO_STRICT: 1.3, // Qattiq echo detection uchun

    // Exact match validation
    EXACT_MATCH_SIMILARITY: 0.9, // 90%+ o'xshashlik - exact match deb hisoblash
    EXACT_MATCH_LENGTH_DIFF: 5, // Uzunlik farqi 5 dan kichik bo'lishi kerak
} as const;

/**
 * Conversation topic extraction constants
 */
export const TOPIC_EXTRACTION = {
    LAST_SENTENCES_COUNT: 4, // Oxirgi 4 ta gapdan topic aniqlash
    MAX_KEYWORDS: 5, // Keywords limiti
} as const;

/**
 * Sentence length thresholds
 */
export const SENTENCE_LENGTH = {
    SHORT_THRESHOLD: 20, // 20 belgidan qisqa - qisqa gap
} as const;

/**
 * Phonetic STT correction constants
 */
export const PHONETIC_CORRECTION = {
    MIN_WORDS_FOR_CORRECTION: 2, // Kamida 2 ta so'z farq qilishi kerak
    MAX_WORD_LENGTH_FOR_EXACT: 3, // 3 harfdan qisqa so'zlar uchun exact match kerak
    SINGLE_LETTER_DIFF_ONLY: true, // Faqat bitta harf farqi bo'lsa ishlatish
} as const;

/**
 * Vocabulary validation constants
 */
export const VOCABULARY_VALIDATION = {
    MIN_WORD_LENGTH: 1, // Minimum so'z uzunligi (1+ harf)
} as const;

/**
 * Name validation constants
 */
export const NAME_VALIDATION = {
    // Arabic name pattern: يا + ism
    NAME_PATTERN: /يا\s+(\w+)/,
    // Common Arabic names for validation
    COMMON_NAMES: ['محمد', 'أحمد', 'فريد', 'كريم', 'علي', 'حسن', 'حسين'],
} as const;




