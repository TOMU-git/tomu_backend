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
    noSpeech: string;
    lowConfidence: string;
    tooShort: string;
    nonArabic: string; // ✅ Yangi: boshqa tilda gapirsa
}> = {
    // Arabic fallback messages
    ar: {
        noAudio: "عَفْوًا، لَمْ أَسْمَعْ شَيْئًا. هَلْ يُمْكِنُكَ الإِعَادَةُ؟",
        fileTooLarge: "عَفْوًا، الصَّوْتُ كَبِيرٌ جِدًّا.",
        transcriptionError: "",
        noSpeech: "عَفْوًا، لَمْ أَسْمَعْ شَيْئًا. هَلْ يُمْكِنُكَ الإِعَادَةُ؟",
        lowConfidence: "عَفْوًا، لَمْ أَفْهَمْ جَيِّدًا. هَلْ يُمْكِنُكَ التَّحَدُّثَ بِوُضُوحٍ أَكْثَرَ؟",
        tooShort: "عَفْوًا، الصَّوْتُ قَصِيرٌ جِدًّا. هَلْ يُمْكِنُكَ الإِعَادَةُ؟",
        nonArabic: "مِنْ فَضْلِكَ، تَحَدَّثْ بِاللُّغَةِ الْعَرَبِيَّةِ فَقَطْ.", // ✅ Faqat arabcha gapiring
    },

    // English fallback messages
    en: {
        noAudio: "Sorry, I didn't hear anything. Can you repeat?",
        fileTooLarge: "Sorry, the audio file is too large.",
        transcriptionError: "",
        noSpeech: "Sorry, I didn't hear anything. Can you repeat?",
        lowConfidence: "Sorry, I didn't understand well. Can you speak more clearly?",
        tooShort: "Sorry, the audio is too short. Can you repeat?",
        nonArabic: "Please speak in Arabic only.", // ✅
    },

    // Uzbek fallback messages
    uz: {
        noAudio: "Kechirasiz, hech narsa eshitmadim. Qayta takrorlay olasizmi?",
        fileTooLarge: "Kechirasiz, audio fayl juda katta.",
        transcriptionError: "",
        noSpeech: "Kechirasiz, hech narsa eshitmadim. Qayta takrorlay olasizmi?",
        lowConfidence: "Kechirasiz, yaxshi tushunmadim. Aniqroq gapira olasizmi?",
        tooShort: "Kechirasiz, audio juda qisqa. Qayta takrorlay olasizmi?",
        nonArabic: "Iltimos, faqat arab tilida gapiring.", // ✅
    },

    // Russian fallback messages
    ru: {
        noAudio: "Извините, я ничего не услышал. Можете повторить?",
        fileTooLarge: "Извините, аудио файл слишком большой.",
        transcriptionError: "",
        noSpeech: "Извините, я ничего не услышал. Можете повторить?",
        lowConfidence: "Извините, я не очень понял. Можете говорить четче?",
        tooShort: "Извините, аудио слишком короткое. Можете повторить?",
        nonArabic: "Пожалуйста, говорите только по-арабски.", // ✅
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
    type: 'noAudio' | 'fileTooLarge' | 'transcriptionError' | 'noSpeech' | 'lowConfidence' | 'tooShort' | 'nonArabic' // ✅
): string {
    const normalizedLang = language.trim().toLowerCase();
    const fallback = WHISPER_FALLBACKS[normalizedLang] || WHISPER_FALLBACKS.ar;
    return fallback[type] || fallback.noAudio;
}

