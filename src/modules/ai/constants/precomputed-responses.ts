/**
 * Precomputed Common Responses
 * -------------------------------------------------------
 * Eng ko'p ishlatiladigan user input'lar uchun oldindan hisoblangan javoblar
 * Bu 5s GPT call'ni 5ms memory lookup'ga aylantiradi
 */

export interface PrecomputedResponse {
    aiResponseText: string;
    aiResponseUzbek: string;
    lessonOrder?: number; // Qaysi darsdan
}

/**
 * Common greetings and responses from lessons
 * Key: normalized user text (without diacritics)
 */
export const PRECOMPUTED_RESPONSES: Record<string, PrecomputedResponse> = {
    // Lesson 1-10: Basic greetings
    'السلام عليكم': {
        aiResponseText: 'وَعَلَيْكُمُ السَّلَامُ.',
        aiResponseUzbek: 'Va sizga salom.',
        lessonOrder: 1
    },
    'السلام عليكم ورحمة الله': {
        aiResponseText: 'وَعَلَيْكُمُ السَّلَامُ وَرَحْمَةُ اللهِ.',
        aiResponseUzbek: 'Va sizga salom va Allohning rahmati.',
        lessonOrder: 2
    },
    'السلام عليكم ورحمة الله وبركاته': {
        aiResponseText: 'وَعَلَيْكُمُ السَّلَامُ وَرَحْمَةُ اللهِ وَبَرَكَاتُهُ.',
        aiResponseUzbek: 'Va sizga salom va Allohning rahmati va barakoti.',
        lessonOrder: 3
    },
    'صباح الخير': {
        aiResponseText: 'صَبَاحُ النُّورِ.',
        aiResponseUzbek: 'Xayrli tong.',
        lessonOrder: 4
    },
    'مساء الخير': {
        aiResponseText: 'مَسَاءُ النُّورِ.',
        aiResponseUzbek: 'Xayrli kech.',
        lessonOrder: 5
    },
    'كيف حالك': {
        aiResponseText: 'الْحَمْدُ للهِ، بِخَيْرٍ.',
        aiResponseUzbek: 'Alhamdulillah, yaxshiman.',
        lessonOrder: 6
    },
    'كيف الحال': {
        aiResponseText: 'الْحَمْدُ للهِ.',
        aiResponseUzbek: 'Alhamdulillah.',
        lessonOrder: 7
    },
    'شكرا': {
        aiResponseText: 'عَفْوًا.',
        aiResponseUzbek: 'Arzimaydi.',
        lessonOrder: 8
    },
    'شكرا جزيلا': {
        aiResponseText: 'عَفْوًا.',
        aiResponseUzbek: 'Arzimaydi.',
        lessonOrder: 9
    },
    'جزاك الله خيرا': {
        aiResponseText: 'وَإِيَّاكَ.',
        aiResponseUzbek: 'Sizga ham.',
        lessonOrder: 10
    },

    // Common yes/no responses
    'نعم': {
        aiResponseText: 'جَيِّدٌ.',
        aiResponseUzbek: 'Yaxshi.',
        lessonOrder: 0
    },
    'لا': {
        aiResponseText: 'حَسَنًا.',
        aiResponseUzbek: 'Mayli.',
        lessonOrder: 0
    },

    // Common questions - short responses
    'ما اسمك': {
        aiResponseText: 'أَنَا مُسَاعِدٌ لِتَعَلُّمِ اللُّغَةِ الْعَرَبِيَّةِ.',
        aiResponseUzbek: 'Men arab tilini o\'rgatuvchi yordamchiman.',
        lessonOrder: 15
    },
    'من أنت': {
        aiResponseText: 'أَنَا مُسَاعِدٌ.',
        aiResponseUzbek: 'Men yordamchiman.',
        lessonOrder: 15
    },

    // Common acknowledgments
    'حسنا': {
        aiResponseText: 'جَيِّدٌ.',
        aiResponseUzbek: 'Yaxshi.',
        lessonOrder: 0
    },
    'طيب': {
        aiResponseText: 'جَيِّدٌ.',
        aiResponseUzbek: 'Yaxshi.',
        lessonOrder: 0
    },
    'تمام': {
        aiResponseText: 'مُمْتَازٌ.',
        aiResponseUzbek: 'Ajoyib.',
        lessonOrder: 0
    },

    // Common farewells
    'مع السلامة': {
        aiResponseText: 'مَعَ السَّلَامَةِ.',
        aiResponseUzbek: 'Xayr.',
        lessonOrder: 12
    },
    'إلى اللقاء': {
        aiResponseText: 'إِلَى اللِّقَاءِ.',
        aiResponseUzbek: 'Ko\'rishguncha.',
        lessonOrder: 13
    },
    'في أمان الله': {
        aiResponseText: 'فِي أَمَانِ اللهِ.',
        aiResponseUzbek: 'Xudo omoni.',
        lessonOrder: 14
    },
};

/**
 * Normalize key for lookup
 * Same normalization as text-normalization.util.ts
 */
export function normalizeForLookup(text: string): string {
    if (!text) return '';
    // Remove diacritics
    let normalized = text.replace(/[\u064B-\u065F\u0670\u0640]/g, '');
    // Remove punctuation
    normalized = normalized.replace(/[،,\.\?؟!;؛:]/g, '').trim();
    // Normalize alef variations
    normalized = normalized.replace(/[أإآ]/g, 'ا');
    // Normalize teh marbuta
    normalized = normalized.replace(/ة/g, 'ه');
    return normalized.toLowerCase().trim();
}

/**
 * Check if response exists in precomputed cache
 */
export function findPrecomputedResponse(
    userText: string,
    userLessonOrder?: number
): PrecomputedResponse | null {
    const normalized = normalizeForLookup(userText);
    const response = PRECOMPUTED_RESPONSES[normalized];

    if (!response) return null;

    // Agar response lesson'ga tegishli bo'lsa va user hali bu darsga kelmagan bo'lsa, null qaytarish
    if (
        response.lessonOrder &&
        userLessonOrder !== undefined &&
        response.lessonOrder > userLessonOrder
    ) {
        return null; // User hali bu darsga kelmagan
    }

    return response;
}

