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
     * Arabcha matnni lotin yozuviga soddalashtirilgan transliteratsiya
     * @param text - Arabcha matn
     * @returns Lotin harflarida transliteratsiya
     */
    static transliterateArabic(text: string): string {
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
        return (text || "")
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
}
