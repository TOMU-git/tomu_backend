/**
 * SSML (Speech Synthesis Markup Language) Utilities
 * -------------------------------------------------------
 * Google Cloud TTS uchun SSML formatini yaratish
 * 
 * SSML qo'llab-quvvatlanishi:
 * - Google Cloud TTS: ✅ To'liq qo'llab-quvvatlaydi
 * - OpenAI TTS: ❌ Qo'llab-quvvatlamaydi (oddiy text)
 */

/**
 * Matnni SSML formatiga o'girish (agar kerak bo'lsa)
 * 
 * @param text - Asl matn
 * @param useSSML - SSML ishlatishmi (Google TTS uchun true)
 * @returns SSML yoki oddiy text
 */
export function wrapSSML(text: string, useSSML: boolean = false): string {
    if (!useSSML || !text) {
        return text;
    }

    // Agar allaqachon SSML bo'lsa, qaytarish
    if (text.trim().startsWith('<speak>')) {
        return text;
    }

    // SSML formatiga o'girish
    return `<speak>${text}</speak>`;
}

/**
 * Ikki matn orasiga pauza qo'shish (SSML orqali)
 * 
 * Bu funksiya AI javob va follow-up savol orasiga pauza qo'shadi.
 * Faqat Google TTS ishlatilayotgan bo'lsa SSML formatida qaytaradi.
 * Agar follow-up savol bo'lsa, savol ohangi qo'shiladi.
 * 
 * @param mainText - Asosiy matn (AI javob)
 * @param followUpText - Follow-up matn (savol yoki statement)
 * @param pauseDuration - Pauza davomiyligi (soniya yoki strength)
 * @param useSSML - SSML ishlatishmi (Google TTS uchun true)
 * @param isFollowUpQuestion - Follow-up savol ekanligi (default: false)
 * @returns Birlashtirilgan matn (SSML yoki oddiy)
 * 
 * @example
 * // Google TTS uchun (SSML bilan, savol ohangi bilan):
 * addPauseBetweenTexts('السلام عليكم', 'كيف حالك؟', '1.5s', true, true)
 * // Natija: <speak>السلام عليكم<break time="1.5s"/><prosody pitch="+5%">كيف حالك؟</prosody></speak>
 * 
 * @example
 * // OpenAI TTS uchun (SSML siz):
 * addPauseBetweenTexts('السلام عليكم', 'كيف حالك؟', '1.5s', false)
 * // Natija: السلام عليكم كيف حالك؟
 */
export function addPauseBetweenTexts(
    mainText: string,
    followUpText: string,
    pauseDuration: string = '1.5s',
    useSSML: boolean = false,
    isFollowUpQuestion: boolean = false
): string {
    if (!mainText || !followUpText) {
        return mainText || followUpText || '';
    }

    // Agar SSML ishlatilmasa (OpenAI TTS), oddiy birlashtirish
    if (!useSSML) {
        return `${mainText} ${followUpText}`;
    }

    // SSML formatida pauza bilan birlashtirish (Google TTS)
    const breakTag = isValidPauseDuration(pauseDuration)
        ? `<break time="${pauseDuration}"/>`
        : `<break strength="${pauseDuration}"/>`;

    // Agar follow-up savol bo'lsa, savol ohangi qo'shish
    const formattedFollowUp = isFollowUpQuestion
        ? addQuestionIntonation(followUpText, useSSML)
        : followUpText;

    return `<speak>${mainText}${breakTag}${formattedFollowUp}</speak>`;
}

/**
 * Pauza davomiyligini validatsiya qilish
 * 
 * Valid formatlar:
 * - Time: "1s", "1.5s", "500ms"
 * - Strength: "weak", "medium", "strong", "x-strong"
 */
function isValidPauseDuration(duration: string): boolean {
    // Time format: 1s, 1.5s, 500ms
    const timePattern = /^\d+(\.\d+)?(s|ms)$/;
    if (timePattern.test(duration)) {
        return true;
    }

    // Strength format: weak, medium, strong, x-strong
    const validStrengths = ['none', 'x-weak', 'weak', 'medium', 'strong', 'x-strong'];
    return validStrengths.includes(duration);
}

/**
 * Emphasis (urg'u) qo'shish
 * 
 * @param text - Matn
 * @param level - Urg'u darajasi: "strong", "moderate", "reduced"
 * @param useSSML - SSML ishlatishmi
 */
export function addEmphasis(
    text: string,
    level: 'strong' | 'moderate' | 'reduced' = 'moderate',
    useSSML: boolean = false
): string {
    if (!useSSML || !text) {
        return text;
    }

    return `<emphasis level="${level}">${text}</emphasis>`;
}

/**
 * Speaking rate (tezlik) o'zgartirish
 * 
 * @param text - Matn
 * @param rate - Tezlik: "slow", "medium", "fast", yoki foiz ("80%", "120%")
 * @param useSSML - SSML ishlatishmi
 */
export function changeSpeakingRate(
    text: string,
    rate: string = 'medium',
    useSSML: boolean = false
): string {
    if (!useSSML || !text) {
        return text;
    }

    return `<prosody rate="${rate}">${text}</prosody>`;
}

/**
 * Savol matniga savol ohangi qo'shish
 * 
 * Google Cloud TTS'da savol ohangi uchun prosody pitch ishlatiladi.
 * Savollar uchun oxirida balandlik ko'tariladi (question intonation).
 * 
 * @param text - Savol matni
 * @param useSSML - SSML ishlatishmi (Google TTS uchun true)
 * @returns SSML yoki oddiy text
 * 
 * @example
 * addQuestionIntonation('أَيْنَ بَيْتٌ؟', true)
 * // Natija: <prosody pitch="+5%">أَيْنَ بَيْتٌ؟</prosody>
 */
export function addQuestionIntonation(
    text: string,
    useSSML: boolean = false
): string {
    if (!useSSML || !text) {
        return text;
    }

    // Savol ohangi: pitch oshirish (oxirida balandlik ko'tariladi)
    // +5% - 5% balandroq (savol ohangi uchun optimal)
    return `<prosody pitch="+5%">${text}</prosody>`;
}

/**
 * SSML'dan oddiy textga o'girish (cleanup)
 * 
 * Bu funksiya SSML tag'larini olib tashlaydi.
 * Database'ga saqlash yoki log qilish uchun foydali.
 */
export function stripSSML(text: string): string {
    if (!text) {
        return '';
    }

    // SSML tag'larini olib tashlash
    return text
        .replace(/<speak>/g, '')
        .replace(/<\/speak>/g, '')
        .replace(/<break[^>]*\/>/g, ' ')
        .replace(/<emphasis[^>]*>/g, '')
        .replace(/<\/emphasis>/g, '')
        .replace(/<prosody[^>]*>/g, '')
        .replace(/<\/prosody>/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

