/**
 * AI moduli uchun xato xabarlari (O'zbek tilida)
 */
export const AI_ERROR_MESSAGES = {
    EMPTY_TEXT: "Matn bo'sh bo'lishi mumkin emas",
    SESSION_NOT_FOUND: "Sessiya topilmadi yoki ruxsat yo'q",
    AUDIO_NOT_FOUND: "Audio fayl topilmadi",
};

/**
 * AI Fallback Messages
 * STT (Speech-to-Text) va validation xatolari uchun standart javoblar
 * Har bir xabar arab va o'zbek tillarida
 */
export const AI_FALLBACK_MESSAGES = {
    // STT bo'sh yoki qisqa bo'lsa
    EMPTY_TRANSCRIPT: {
        arabic: 'عفواً، لم أفهم. هل يمكنك الإعادة من فضلك؟',
        uzbek: 'Kechirasiz, tushunmadim. Iltimos, qayta ayting.',
    },

    // Arab tilidan boshqa til bo'lsa
    NON_ARABIC: {
        arabic: 'من فضلك، تحدث بالعربية فقط.',
        uzbek: 'Iltimos, faqat arab tilida gapiring.',
    },

    // Materialda javob yo'q bo'lsa
    NO_MATERIAL_RESPONSE: {
        arabic: 'هذا السؤال ليس في دروسك الحالية.',
        uzbek: 'Bu savol sizning hozirgi darslaringizda yo\'q.',
    },

    // Hali kelmagan dars bo'lsa
    FUTURE_LESSON_RESPONSE: {
        arabic: 'هذا السؤال من درس لم تأخذه بعد.',
        uzbek: 'Bu savol siz hali o\'rganmagan darslardan.',
    },

    // Tushunilmagan holat
    NOT_UNDERSTOOD: {
        arabic: 'عَفْوًا، لَمْ أَفْهَمْ. هَلْ يُمْكِنُكَ الإِعَادَةَ؟',
        uzbek: 'Kechirasiz, tushunmadim. Iltimos, qayta ayting.',
    },

    // Yaqin match - yordamlash (foydalanuvchi noto'g'ri talaffuz qilgan bo'lsa)
    CLOSE_MATCH_HELP: {
        arabic: 'هَلْ تَقْصِدُ: ',
        uzbek: 'Shunday deyishni xohlaysizmi: ',
    },

    // Dialogue oxirida - tasdiqlash (muvaffaqiyatli yakunlangan suhbat)
    DIALOGUE_END_CONFIRMATION: {
        arabic: 'جَيِّدٌ! أَحْسَنْتَ!',
        uzbek: 'Yaxshi! Ajoyib!',
    },
};

