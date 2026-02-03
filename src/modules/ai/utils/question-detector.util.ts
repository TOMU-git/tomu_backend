/**
 * Question Detector Utility
 * -------------------------------------------------------
 * Arab tilidagi savollarni aniqlash
 * 
 * Maqsad: Bitta response'da 2 ta savol bo'lmasligi uchun
 */

/**
 * Matnning savol ekanligini aniqlash
 * 
 * Arab tilida savollar:
 * 1. ? (؟) bilan tugaydi
 * 2. هَلْ (hal) bilan boshlanadi
 * 3. مَا (ma), مَنْ (man), أَيْنَ (ayna), كَيْفَ (kayfa) va h.k.
 */
export function isQuestion(text: string): boolean {
    if (!text || text.trim().length === 0) {
        return false;
    }

    const trimmed = text.trim();

    // 1. ? yoki ؟ bilan tugaydi
    if (trimmed.endsWith('؟') || trimmed.endsWith('?')) {
        return true;
    }

    // 2. Savol so'zlari bilan boshlanadi
    const questionWords = [
        'هل',      // hal - yes/no questions
        'ماذا',    // madha - what
        'ما',      // ma - what
        'من',      // man - who
        'أين',     // ayna - where
        'متى',     // mata - when
        'كيف',     // kayfa - how
        'لماذا',   // limadha - why
        'كم',      // kam - how many/much
        'أي',      // ayy - which
    ];

    // Diacritics'siz tekshirish uchun
    const normalizedText = trimmed
        .replace(/[\u064B-\u065F\u0670\u0640]/g, '') // Remove diacritics
        .toLowerCase();

    for (const word of questionWords) {
        // Birinchi so'z tekshiruvi
        if (normalizedText.startsWith(word + ' ') || normalizedText.startsWith(word)) {
            return true;
        }
    }

    return false;
}

/**
 * Matnda nechta savol borligini sanash
 * Har bir jumla alohida tekshiriladi
 */
export function countQuestions(text: string): number {
    if (!text || text.trim().length === 0) {
        return 0;
    }

    // Jumlalarga bo'lish (؟ yoki ? bilan)
    const sentences = text.split(/[؟?]+/).filter(s => s.trim().length > 0);
    
    let questionCount = 0;
    for (const sentence of sentences) {
        if (isQuestion(sentence.trim())) {
            questionCount++;
        }
    }

    // Agar ? yoki ؟ bilan tugasa, kamida 1 ta savol bor
    if (text.trim().endsWith('؟') || text.trim().endsWith('?')) {
        questionCount = Math.max(questionCount, 1);
    }

    return questionCount;
}

/**
 * Matnning statement (bayonot) ekanligini tekshirish
 * Ya'ni savol emas, oddiy gap
 */
export function isStatement(text: string): boolean {
    return !isQuestion(text);
}

