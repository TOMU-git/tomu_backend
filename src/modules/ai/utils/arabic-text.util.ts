/**
 * ArabicTextUtils
 * -------------------------------------------------------
 * Maqsad: Arabcha matn bilan ishlash uchun utility funksiyalar
 */
export class ArabicTextUtils {
    /**
     * Matnda arabcha belgilar ulushi yetarli ekanini tekshiradi (>=40%)
     * @param text - Tekshiriladigan matn
     * @returns true agar matn arabcha bo'lsa
     */
    static isArabicText(text: string): boolean {
        if (!text) return false;
        const clean = text.replace(/\s/g, '');
        if (!clean) return false;
        const m = clean.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g);
        const count = m ? m.length : 0;
        return count / clean.length >= 0.4;
    }

    /**
     * Matnda arabcha belgilar nisbatini hisoblash
     * @param text - Tekshiriladigan matn
     * @returns Arab harf nisbati (0.0 - 1.0)
     */
    static getArabicRatio(text: string): number {
        if (!text) return 0;
        const clean = text.replace(/\s/g, '');
        if (!clean) return 0;
        const m = clean.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g);
        const count = m ? m.length : 0;
        return count / clean.length;
    }

    /**
     * Arabcha matnni lotin yozuviga soddalashtirilgan transliteratsiya
     * @param text - Arabcha matn
     * @returns Lotin harflarida transliteratsiya
     */
    static transliterateArabic(text: string): string {
        if (!text) return '';

        // Avval harakat belgilarini (tashkeel) olib tashlash
        const cleanText = text.replace(/[\u064B-\u065F\u0670]/g, ''); // Remove diacritics

        const arabicToLatin: { [key: string]: string } = {
            'ا': 'a', 'ب': 'b', 'ت': 't', 'ث': 'th', 'ج': 'j', 'ح': 'h', 'خ': 'kh',
            'د': 'd', 'ذ': 'dh', 'ر': 'r', 'ز': 'z', 'س': 's', 'ش': 'sh', 'ص': 's',
            'ض': 'd', 'ط': 't', 'ظ': 'z', 'ع': 'a', 'غ': 'gh', 'ف': 'f', 'ق': 'q',
            'ك': 'k', 'ل': 'l', 'م': 'm', 'ن': 'n', 'ه': 'h', 'و': 'w', 'ي': 'y',
            'ة': 'a', 'ء': 'a', 'أ': 'a', 'إ': 'i', 'آ': 'aa', 'ؤ': 'u', 'ئ': 'i',
            'ى': 'a', 'لا': 'la', 'ال': 'al', ' ': ' ', '؟': '?', '،': ',', '؛': ';',
            '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6',
            '٧': '7', '٨': '8', '٩': '9'
        };

        return cleanText
            .split("")
            .map((ch) => arabicToLatin[ch] || ch)
            .join("");
    }

    /**
     * Arabcha matnni tozalash va normalizatsiya qilish
     * @param text - Arabcha matn
     * @returns Tozalangan matn
     */
    static normalizeArabic(text: string): string {
        if (!text) return '';

        return text
            .trim()
            .replace(/\s+/g, ' ') // Ko'p bo'shliqlarni bitta qilish
            .replace(/[^\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\s]/g, '') // Faqat arabcha belgilar
            .trim();
    }

    /**
     * Arabcha matndan so'zlarni ajratish
     * @param text - Arabcha matn
     * @returns So'zlar massivi
     */
    static extractArabicWords(text: string): string[] {
        if (!text) return [];

        const normalized = this.normalizeArabic(text);
        return normalized
            .split(/\s+/)
            .filter(word => word.length > 0);
    }

    /**
     * Random arab harflarni aniqlash (ma'nosiz ketma-ketlik)
     * @param text - Tekshiriladigan matn
     * @returns true agar random harflar bo'lsa
     */
    static isRandomArabic(text: string): boolean {
        if (!text || text.length < 3) return false;

        const words = this.extractArabicWords(text);
        if (words.length < 3) return false;

        // TEKSHIRUV 1: Takroriy so'zlar (3+ marta bir xil so'z)
        const wordCounts = new Map<string, number>();
        words.forEach(word => {
            const normalized = word.replace(/[\u064B-\u065F\u0670]/g, ''); // Diacritics olib tashlash
            wordCounts.set(normalized, (wordCounts.get(normalized) || 0) + 1);
        });

        const hasRepeatedWords = Array.from(wordCounts.values()).some(count => count >= 3);
        if (hasRepeatedWords) {
            console.log(` [RandomArabic] Takroriy so'zlar topildi (3+ marta)`);
            return true;
        }

        // TEKSHIRUV 2: G'alati pattern'lar
        const hasStrangePattern = /[\u064B-\u065F]{4,}|[\u0670]{2,}/.test(text); // Ko'p diacritics
        const hasLongSequence = /(.)\1{4,}/.test(text); // 5+ bir xil harf

        if (hasStrangePattern || hasLongSequence) {
            console.log(` [RandomArabic] G'alati pattern topildi`);
            return true;
        }

        // TEKSHIRUV 3: Juda uzun so'zlar (15+ harf)
        const hasVeryLongWord = words.some(word => {
            const clean = word.replace(/[\u064B-\u065F\u0670]/g, '');
            return clean.length > 15;
        });

        if (hasVeryLongWord) {
            console.log(` [RandomArabic] Juda uzun so'z topildi (15+ harf)`);
            return true;
        }

        // TEKSHIRUV 4: Umumiy so'zlar lug'ati (eng muhimi)
        const commonArabicWords = [
            // Zamonlar va bog'lovchilar
            'من', 'إلى', 'في', 'على', 'مع', 'عن', 'كان', 'كانت', 'ليس', 'ليست', 'و', 'أو', 'لكن',
            // So'roq so'zlari
            'ما', 'من', 'أين', 'متى', 'كيف', 'لماذا', 'هل', 'كم', 'ماذا',
            // Ko'rsatish olmoshlari
            'هذا', 'هذه', 'ذلك', 'تلك', 'هنا', 'هناك', 'هؤلاء', 'أولئك',
            // Umumiy fe'llar
            'قال', 'يقول', 'ذهب', 'يذهب', 'عمل', 'يعمل', 'عرف', 'يعرف', 'أراد', 'يريد',
            // Javob so'zlari
            'نعم', 'لا', 'أجل', 'بلى', 'طبعا', 'ربما',
            // Umumiy ismlar
            'الله', 'محمد', 'علي', 'فاطمة', 'أحمد'
        ];

        // Agar 5+ so'z bo'lsa va umumiy so'zlardan 2+ ta bo'lmasa
        if (words.length >= 5) {
            let commonWordCount = 0;
            words.forEach(word => {
                const normalized = word.replace(/[\u064B-\u065F\u0670]/g, '');
                if (commonArabicWords.some(common => normalized.includes(common) || common.includes(normalized))) {
                    commonWordCount++;
                }
            });

            if (commonWordCount < 2) {
                console.log(` [RandomArabic] Umumiy so'zlar kam (${commonWordCount}/${words.length})`);
                return true;
            }
        }

        return false;
    }
}
