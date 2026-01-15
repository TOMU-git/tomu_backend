/**
 * Whisper Service Constants
 * -------------------------------------------------------
 * Whisper API uchun konstantalar va default qiymatlar
 */

/**
 * Whisper default konfiguratsiyasi
 */
export const WHISPER_DEFAULTS = {
    LANGUAGE: 'ar',
    TEMPERATURE: '0',
    EXTENSION: 'webm',
    CONTENT_TYPE: 'audio/webm',
    MAX_FILE_SIZE_MB: 25,
    // Confidence check thresholds
    NO_SPEECH_PROB_THRESHOLD: 0.6, // 60%+ jimlik ehtimoli bo'lsa rad etish
    AVG_LOGPROB_THRESHOLD: -1.0, // -1.0 dan past ishonchlilik bo'lsa rad etish
    MIN_DURATION_SECONDS: 0.5, // Minimum 0.5 soniya audio kerak
} as const;

/**
 * Whisper API tomonidan qo'llab-quvvatlanadigan tillar
 * OpenAI Whisper API documentation'ga asoslangan
 */
export const SUPPORTED_LANGUAGES = [
    'ar', // Arabic
    'en', // English
    'uz', // Uzbek
    'ru', // Russian
    'es', // Spanish
    'fr', // French
    'de', // German
    'it', // Italian
    'pt', // Portuguese
    'tr', // Turkish
    'fa', // Persian
    'ur', // Urdu
] as const;

/**
 * Til kodini validatsiya qilish
 * @param language - Tekshiriladigan til kodi
 * @returns Valid til kodi yoki default til
 */
export function validateLanguage(language?: string): string {
    if (!language || typeof language !== 'string') {
        return WHISPER_DEFAULTS.LANGUAGE;
    }

    const normalizedLang = language.trim().toLowerCase();

    // Whisper API qo'llab-quvvatlaydigan tillar ro'yxatida bor-yo'qligini tekshirish
    if (SUPPORTED_LANGUAGES.includes(normalizedLang as any)) {
        return normalizedLang;
    }

    // Agar til qo'llab-quvvatlanmasa, default tilga qaytish
    console.warn(
        `[WhisperService] Unsupported language: ${language}, falling back to ${WHISPER_DEFAULTS.LANGUAGE}`
    );
    return WHISPER_DEFAULTS.LANGUAGE;
}

