/**
 * Whisper Fallback Messages
 * -------------------------------------------------------
 * Xato holatlarida qaytariladigan tilga moslashgan xabarlar
 */

/**
 * Tilga moslashgan fallback xabarlar
 */
export const WHISPER_FALLBACKS: Record<string, {
    noAudio: string;
    fileTooLarge: string;
    transcriptionError: string;
}> = {
    // Arabic fallback messages
    ar: {
        noAudio: "عَفْوًا، لَمْ أَسْمَعْ شَيْئًا. هَلْ يُمْكِنُكَ الإِعَادَةَ؟",
        fileTooLarge: "عَفْوًا، الصَّوْتُ كَبِيرٌ جِدًّا.",
        transcriptionError: "",
    },

    // English fallback messages
    en: {
        noAudio: "Sorry, I didn't hear anything. Can you repeat?",
        fileTooLarge: "Sorry, the audio file is too large.",
        transcriptionError: "",
    },

    // Uzbek fallback messages
    uz: {
        noAudio: "Kechirasiz, hech narsa eshitmadim. Qayta takrorlay olasizmi?",
        fileTooLarge: "Kechirasiz, audio fayl juda katta.",
        transcriptionError: "",
    },

    // Russian fallback messages
    ru: {
        noAudio: "Извините, я ничего не услышал. Можете повторить?",
        fileTooLarge: "Извините, аудио файл слишком большой.",
        transcriptionError: "",
    },
};

/**
 * Til uchun fallback xabar olish
 * @param language - Til kodi
 * @param type - Fallback xabar turi
 * @returns Fallback xabar matni yoki default (Arabic) xabar
 */
export function getFallbackMessage(
    language: string,
    type: 'noAudio' | 'fileTooLarge' | 'transcriptionError'
): string {
    const normalizedLang = language.trim().toLowerCase();
    const fallback = WHISPER_FALLBACKS[normalizedLang] || WHISPER_FALLBACKS.ar;
    return fallback[type] || fallback.noAudio;
}

