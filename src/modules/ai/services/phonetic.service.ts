import { Injectable } from "@nestjs/common";
import { ArabicTextUtils } from "../utils/arabic-text.util";

/**
 * PhoneticService
 * -------------------------------------------------------
 * Maqsad: Arabcha matnni fonetik formatga (IPA) o'tkazish
 * Bu TTS talaffuzini yaxshilash uchun ishlatiladi
 */
@Injectable()
export class PhoneticService {
    /**
     * Arabcha harflarni IPA (International Phonetic Alphabet) ga o'tkazish
     * IPA - bu xalqaro fonetik alifbo bo'lib, har qanday tilning tovushlarini aniq ifodalash uchun ishlatiladi
     * 
     * @param text - Arabcha matn
     * @returns IPA formatidagi matn
     */
    convertToIPA(text: string): string {
        if (!text) return '';

        // Agar matn arabcha bo'lmasa, o'zgartirmasdan qaytarish
        if (!ArabicTextUtils.isArabicText(text)) {
            return text;
        }

        // Harakat belgilarini (tashkeel) saqlab qolish
        const normalizedText = this.normalizeArabicWithDiacritics(text);
        
        // IPA mapping - arabcha harflar va ularning IPA ekvivalentlari
        const arabicToIPA: { [key: string]: string } = {
            // Consonants
            'ب': 'b',      // b as in "boy"
            'ت': 't',      // t as in "tea"
            'ث': 'θ',      // th as in "think"
            'ج': 'd͡ʒ',     // j as in "judge"
            'ح': 'ħ',      // voiceless pharyngeal fricative
            'خ': 'x',      // kh as in Scottish "loch"
            'د': 'd',      // d as in "dog"
            'ذ': 'ð',      // th as in "this"
            'ر': 'r',      // r as in Spanish "pero"
            'ز': 'z',      // z as in "zoo"
            'س': 's',      // s as in "sun"
            'ش': 'ʃ',      // sh as in "ship"
            'ص': 'sˤ',     // emphatic s
            'ض': 'dˤ',     // emphatic d
            'ط': 'tˤ',     // emphatic t
            'ظ': 'ðˤ',     // emphatic th
            'ع': 'ʕ',      // voiced pharyngeal fricative
            'غ': 'ɣ',      // gh (voiced velar fricative)
            'ف': 'f',      // f as in "fish"
            'ق': 'q',      // q (uvular stop)
            'ك': 'k',      // k as in "key"
            'ل': 'l',      // l as in "love"
            'م': 'm',      // m as in "man"
            'ن': 'n',      // n as in "no"
            'ه': 'h',      // h as in "hat"
            'و': 'w',      // w as in "water"
            'ي': 'j',      // y as in "yes"
            
            // Vowels and special characters
            'ا': 'a',      // a as in "father"
            'أ': 'ʔa',     // hamza + a
            'إ': 'ʔi',     // hamza + i
            'آ': 'ʔaː',    // hamza + long a
            'ة': 'a',      // taa marbuta (a sound)
            'ء': 'ʔ',      // hamza (glottal stop)
            'ؤ': 'ʔu',     // hamza + u
            'ئ': 'ʔi',     // hamza + i
            'ى': 'a',      // alif maksura (a sound)
            'لا': 'laː',   // la (common prefix)
            'ال': 'al',    // al (definite article)
            
            // Diacritics (harakatlar) - IPA ga o'tkazish
            'َ': 'a',      // fatha (a sound)
            'ُ': 'u',      // damma (u sound)
            'ِ': 'i',      // kasra (i sound)
            'ً': 'an',     // tanwin fatha (an sound)
            'ٌ': 'un',     // tanwin damma (un sound)
            'ٍ': 'in',     // tanwin kasra (in sound)
            'ْ': '',       // sukun (no vowel)
            'ّ': '',       // shadda (gemination - double consonant)
            'ٰ': 'a',      // superscript alif
            'ٓ': 'a',      // maddah
            
            // Numbers
            '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
            '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
            
            // Punctuation
            ' ': ' ',      // space
            '؟': '?',      // question mark
            '،': ',',      // comma
            '؛': ';',      // semicolon
            '.': '.',      // period
        };

        // Matnni har bir belgiga ajratish va IPA ga o'tkazish
        let ipaText = '';
        for (let i = 0; i < normalizedText.length; i++) {
            const char = normalizedText[i];
            const nextChar = normalizedText[i + 1];
            
            // "لا" va "ال" kabi ikki belgili kombinatsiyalarni tekshirish
            if (char === 'ل' && nextChar === 'ا') {
                ipaText += arabicToIPA['لا'] || 'laː';
                i++; // Keyingi belgini o'tkazib yuborish
                continue;
            }
            if (char === 'ا' && nextChar === 'ل') {
                ipaText += arabicToIPA['ال'] || 'al';
                i++; // Keyingi belgini o'tkazib yuborish
                continue;
            }
            
            // Oddiy belgilar
            if (arabicToIPA[char] !== undefined) {
                ipaText += arabicToIPA[char];
            } else {
                // Agar mapping topilmasa, asl belgini qoldirish
                ipaText += char;
            }
        }

        // Bo'shliqlarni tozalash va normalizatsiya qilish
        ipaText = ipaText.replace(/\s+/g, ' ').trim();
        
        return ipaText;
    }

    /**
     * Arabcha matnni TTS uchun optimallashtirilgan formatga o'tkazish
     * Bu metod IPA ga o'tkazishdan tashqari, TTS uchun qo'shimcha optimallashtirishlar qiladi
     * 
     * @param text - Arabcha matn
     * @param usePhonetic - IPA formatidan foydalanish yoki yo'q
     * @returns Optimallashtirilgan matn
     */
    convertForTTS(text: string, usePhonetic: boolean = false): string {
        if (!text) return '';

        // Agar fonetik format kerak bo'lmasa, faqat normalizatsiya qilish
        if (!usePhonetic) {
            return this.normalizeForTTS(text);
        }

        // IPA formatiga o'tkazish
        const ipaText = this.convertToIPA(text);
        
        // TTS uchun qo'shimcha optimallashtirishlar
        return this.optimizeIPAForTTS(ipaText);
    }

    /**
     * TTS uchun matnni normalizatsiya qilish (fonetik konvertatsiyasiz)
     */
    private normalizeForTTS(text: string): string {
        if (!text) return '';

        // Harakat belgilarini saqlab qolish (TTS uchun muhim)
        const normalized = text
            .trim()
            .replace(/\s+/g, ' ') // Ko'p bo'shliqlarni bitta qilish
            .replace(/[^\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\s\u064B-\u065F\u0670]/g, ''); // Faqat arabcha belgilar va harakatlar

        return normalized;
    }

    /**
     * IPA matnni TTS uchun optimallashtirish
     */
    private optimizeIPAForTTS(ipaText: string): string {
        if (!ipaText) return '';

        // Qo'shni bir xil belgilarni birlashtirish
        let optimized = ipaText
            .replace(/([aː])\1+/g, '$1ː') // Uzun a tovushlarini optimallashtirish
            .replace(/\s+/g, ' ') // Bo'shliqlarni tozalash
            .trim();

        return optimized;
    }

    /**
     * Harakat belgilarini (tashkeel) saqlab qolish bilan normalizatsiya qilish
     */
    private normalizeArabicWithDiacritics(text: string): string {
        if (!text) return '';

        return text
            .trim()
            .replace(/\s+/g, ' ') // Ko'p bo'shliqlarni bitta qilish
            // Harakat belgilarini saqlab qolish
            .replace(/[^\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\s\u064B-\u065F\u0670]/g, '');
    }

    /**
     * Matnni fonetik formatga o'tkazish (alternativ metod)
     * Bu metod arabcha matnni inglizcha TTS uchun qulay formatga o'tkazadi
     * 
     * @param text - Arabcha matn
     * @returns Fonetik formatdagi matn
     */
    convertToPhoneticEnglish(text: string): string {
        if (!text) return '';
        if (!ArabicTextUtils.isArabicText(text)) {
            return text;
        }

        // Arabcha matnni inglizcha talaffuzga yaqin formatga o'tkazish
        const phoneticMap: { [key: string]: string } = {
            'ا': 'ah', 'ب': 'b', 'ت': 't', 'ث': 'th', 'ج': 'j', 'ح': 'h', 'خ': 'kh',
            'د': 'd', 'ذ': 'dh', 'ر': 'r', 'ز': 'z', 'س': 's', 'ش': 'sh', 'ص': 's',
            'ض': 'd', 'ط': 't', 'ظ': 'z', 'ع': 'a', 'غ': 'gh', 'ف': 'f', 'ق': 'q',
            'ك': 'k', 'ل': 'l', 'م': 'm', 'ن': 'n', 'ه': 'h', 'و': 'w', 'ي': 'y',
            'ة': 'ah', 'ء': 'a', 'أ': 'a', 'إ': 'i', 'آ': 'aa', 'ؤ': 'u', 'ئ': 'i',
            'ى': 'a', ' ': ' '
        };

        const normalized = this.normalizeArabicWithDiacritics(text);
        return normalized
            .split('')
            .map(char => phoneticMap[char] || char)
            .join('');
    }
}

