/**
 * Whisper Prompts Configuration
 * -------------------------------------------------------
 * Har bir til uchun Whisper API prompt konfiguratsiyasi
 * Prompt - audio transkripsiyani yaxshilash uchun ishlatiladi
 */

/**
 * Tilga moslashgan prompt'lar
 * Key - til kodi (ISO 639-1)
 * Value - prompt matni (o'sha tilida)
 */
export const WHISPER_PROMPTS: Record<string, string> = {
    // Arabic prompt - arab kurs materiallari uchun
    ar: "مَا هَٰذَا يَا فَرِيد؟ هَٰذَا بُرْتُقَالٌ يَا فَرِيد. هَلْ هُوَ لَذِيذٌ؟ نَعَمْ هَٰذَا الْبُرْتُقَالُ لَذِيذٌ جِدًّا. مَا هَٰذَا يَا مُحَمَّد؟",
    
    // Boshqa tillar uchun prompt'lar (keyinchalik qo'shilishi mumkin)
    // en: "What is this, Farid? This is an orange, Farid. Is it delicious? Yes, this orange is very delicious. What is this, Muhammad?",
    // uz: "Bu nima, Farid? Bu apelsin, Farid. U mazali mı? Ha, bu apelsin juda mazali. Bu nima, Muhammad?",
};

/**
 * Til uchun prompt olish
 * @param language - Til kodi
 * @returns Prompt matni yoki undefined (agar prompt mavjud bo'lmasa)
 */
export function getPromptForLanguage(language: string): string | undefined {
    const normalizedLang = language.trim().toLowerCase();
    return WHISPER_PROMPTS[normalizedLang];
}














