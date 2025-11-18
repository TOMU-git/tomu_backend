/**
 * Diacritics Validator Utility
 * -------------------------------------------------------
 * Maqsad: Arab tilida har bir so'z to'liq tashkil (diacritics) bilan yozilganini tekshirish
 * Bu TTS uchun juda muhim - to'g'ri talaffuz uchun
 */

/**
 * Arabic diacritics (harakat belgilari) regex
 * Quyidagilar kiradi:
 * - Fatha (َ), Kasra (ِ), Damma (ُ)
 * - Sukun (ْ), Shadda (ّ), Tanween (ً ٍ ٌ)
 */
const ARABIC_DIACRITICS_REGEX = /[\u064B-\u065F\u0670]/;

/**
 * Arabic letters (harflar) regex - diacritics'siz
 */
const ARABIC_LETTERS_REGEX = /[\u0621-\u064A\u0660-\u0669]/g;

/**
 * Matnda diacritics foizi (percentage)
 * @param text - Tekshiriladigan matn
 * @returns Diacritics foizi (0-100)
 */
export function getDiacriticsPercentage(text: string): number {
    if (!text || text.trim().length === 0) {
        return 0;
    }

    // Faqat arab harflarini sanash
    const arabicLetters = text.match(ARABIC_LETTERS_REGEX);
    if (!arabicLetters || arabicLetters.length === 0) {
        return 0;
    }

    // Diacritics'li belgilarni sanash
    let diacriticsCount = 0;
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nextChar = text[i + 1];

        // Agar harf arab harfi bo'lsa va keyingi belgi diacritics bo'lsa
        if (ARABIC_LETTERS_REGEX.test(char) && nextChar && ARABIC_DIACRITICS_REGEX.test(nextChar)) {
            diacriticsCount++;
        }
    }

    // Foizni hisoblash
    const percentage = (diacriticsCount / arabicLetters.length) * 100;
    return Math.round(percentage);
}

/**
 * Matnda yetarli diacritics borligini tekshirish
 * @param text - Tekshiriladigan matn
 * @param minPercentage - Minimal foiz (default: 70%)
 * @returns true agar yetarli diacritics bo'lsa
 */
export function hasFullDiacritics(text: string, minPercentage: number = 70): boolean {
    const percentage = getDiacriticsPercentage(text);
    return percentage >= minPercentage;
}

/**
 * Matnda diacritics borligini va foizini console'ga chiqarish (debugging uchun)
 * @param text - Tekshiriladigan matn
 * @param label - Log uchun label
 */
export function logDiacriticsInfo(text: string, label: string = 'Text'): void {
    const percentage = getDiacriticsPercentage(text);
    const hasFull = hasFullDiacritics(text);
    
    console.log(`[Diacritics Validator] ${label}:`);
    console.log(`  - Text: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
    console.log(`  - Diacritics: ${percentage}%`);
    console.log(`  - Status: ${hasFull ? '✅ Full diacritics' : '⚠️  Incomplete diacritics'}`);
}

/**
 * GPT response'ni validate qilish va agar diacritics kam bo'lsa warning berish
 * @param gptResponse - GPT dan kelgan javob
 * @returns Validation natijasi
 */
export function validateGPTResponseDiacritics(gptResponse: string): {
    isValid: boolean;
    percentage: number;
    warning?: string;
} {
    const percentage = getDiacriticsPercentage(gptResponse);
    const isValid = percentage >= 70; // 70% threshold

    if (!isValid) {
        return {
            isValid: false,
            percentage,
            warning: `⚠️  GPT response has insufficient diacritics (${percentage}%). TTS pronunciation may be incorrect!`
        };
    }

    return { isValid: true, percentage };
}

/**
 * So'zda oxirgi harf diacritics borligini tekshirish
 * Bu muammoingiz uchun juda muhim!
 * @param word - Tekshiriladigan so'z
 * @returns true agar oxirgi harf diacritics bilan bo'lsa
 */
export function hasLastLetterDiacritics(word: string): boolean {
    if (!word || word.trim().length === 0) {
        return false;
    }

    const trimmed = word.trim();
    
    // Oxirgi harfni topish (diacritics va punctuation'siz)
    let lastLetterIndex = -1;
    for (let i = trimmed.length - 1; i >= 0; i--) {
        if (ARABIC_LETTERS_REGEX.test(trimmed[i])) {
            lastLetterIndex = i;
            break;
        }
    }

    if (lastLetterIndex === -1) {
        return false;
    }

    // Oxirgi harfdan keyin diacritics borligini tekshirish
    const charAfterLastLetter = trimmed[lastLetterIndex + 1];
    return charAfterLastLetter && ARABIC_DIACRITICS_REGEX.test(charAfterLastLetter);
}

/**
 * Matndagi barcha so'zlarning oxirgi harflarida diacritics borligini tekshirish
 * @param text - Tekshiriladigan matn
 * @returns So'zlar soni va oxirgi harfda diacritics bo'lgan so'zlar soni
 */
export function checkLastLetterDiacriticsInText(text: string): {
    totalWords: number;
    wordsWithLastLetterDiacritics: number;
    percentage: number;
} {
    if (!text || text.trim().length === 0) {
        return { totalWords: 0, wordsWithLastLetterDiacritics: 0, percentage: 0 };
    }

    // So'zlarga bo'lish
    const words = text.trim().split(/\s+/).filter(w => {
        // Faqat arab harflari bo'lgan so'zlarni olish
        return w && ARABIC_LETTERS_REGEX.test(w);
    });

    if (words.length === 0) {
        return { totalWords: 0, wordsWithLastLetterDiacritics: 0, percentage: 0 };
    }

    // Oxirgi harfda diacritics bo'lgan so'zlarni sanash
    const wordsWithLastLetterDiacritics = words.filter(hasLastLetterDiacritics).length;
    const percentage = Math.round((wordsWithLastLetterDiacritics / words.length) * 100);

    return { totalWords: words.length, wordsWithLastLetterDiacritics, percentage };
}

