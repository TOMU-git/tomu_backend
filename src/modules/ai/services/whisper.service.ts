import { Injectable } from "@nestjs/common";
import axios from "axios";
import FormData = require("form-data");

// Environment variables
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const WHISPER_MODEL = process.env.WHISPER_MODEL || "whisper-1";

// Console verification
console.log("🎤 Whisper Configuration:");
console.log(`   WHISPER_MODEL: ${WHISPER_MODEL}`);

/**
 * Whisper usage ma'lumotlari
 */
export interface WhisperUsage {
    duration: number; // seconds
    text: string;
}

/**
 * Whisper response with usage
 */
export interface WhisperResponse {
    text: string;
    duration?: number; // seconds
}

/**
 * WhisperService
 * -------------------------------------------------------
 * Maqsad: Audio -> Text konvertatsiya (STT).
 */
@Injectable()
export class WhisperService {
    /**
     * Audio -> Text (backward compatible)
     * @deprecated Use speechToTextWithUsage() for cost tracking
     */
    async speechToText(params: { audio: Buffer; language?: string }): Promise<string> {
        if (!OPENAI_API_KEY) {
            console.log("⚠️  OpenAI API key yo'q - fallback javob");
            return "عَفْوًا، لَمْ أَسْمَعْ شَيْئًا. هَلْ يُمْكِنُكَ الإِعَادَةَ؟";
        }

        // Audio fayl hajmini tekshirish (Whisper limit: 25MB)
        const audioSizeMB = params.audio.length / (1024 * 1024);
        if (audioSizeMB > 25) {
            console.error(`❌ Audio fayl juda katta: ${audioSizeMB.toFixed(2)}MB (max: 25MB)`);
            return "عَفْوًا، الصَّوْتُ كَبِيرٌ جِدًّا.";
        }

        const fd = new FormData();

        // Filename va content type ni yanada aniq berish
        const extension = params.language === 'ar' ? 'webm' : 'webm';
        const filename = `audio.${extension}`;
        const contentType = `audio/${extension}`;

        fd.append("file", params.audio, { filename, contentType });
        fd.append("model", WHISPER_MODEL);

        // Tilni majburan berish (ar) kerak bo'lsa, language param orqali uzatamiz
        const whisperLang = params.language || 'ar';
        fd.append("language", whisperLang);

        // Temperature - aniq javob berish uchun
        fd.append("temperature", "0");

        // Prompt - faqat arab kurs materiallari uchun
        if (whisperLang === 'ar') {
            fd.append(
                "prompt",
                "مَا هَٰذَا يَا فَرِيد؟ هَٰذَا بُرْتُقَالٌ يَا فَرِيد. هَلْ هُوَ لَذِيذٌ؟ نَعَمْ هَٰذَا الْبُرْتُقَالُ لَذِيذٌ جِدًّا. مَا هَٰذَا يَا مُحَمَّد؟"
            );
        }

        // Response format - JSON olish uchun
        fd.append("response_format", "verbose_json");

        try {
            const audioSizeMB = params.audio.length / (1024 * 1024);
            console.log(`🎤 Calling Whisper API with model: ${WHISPER_MODEL}`);
            console.log(`📊 Audio size: ${audioSizeMB.toFixed(3)} MB`);

            const res = await axios.post("https://api.openai.com/v1/audio/transcriptions", fd, {
                headers: { ...fd.getHeaders(), Authorization: `Bearer ${OPENAI_API_KEY}` },
            });

            console.log("✅ Whisper API call successful");

            // OpenAI: response_format=verbose_json returns JSON with text field
            let transcribedText = "";
            const responseData = res.data as any; // Cast to any to avoid TS errors

            if (typeof responseData === "string") {
                transcribedText = responseData;
            } else if (responseData?.text) {
                // verbose_json formatda text maydoni
                transcribedText = responseData.text;
            } else if (responseData) {
                // Oddiy JSON format
                transcribedText = JSON.stringify(responseData);
            }

            console.log(`📝 Transcribed: "${transcribedText}"`);
            return transcribedText;
        } catch (e: any) {
            console.error('❌ Whisper transcription error:', e.message);
            if (e.response) {
                console.error('❌ Error status:', e.response.status);
                console.error('❌ Error data:', JSON.stringify(e.response.data, null, 2));
            }
            console.error('⚠️  Falling back to empty string');
            return "";
        }
    }

    /**
     * Audio -> Text (usage ma'lumotlari bilan)
     * @param params - Audio va language
     * @returns Text va duration (cost tracking uchun)
     */
    async speechToTextWithUsage(params: { audio: Buffer; language?: string }): Promise<WhisperResponse> {
        // Reuse existing logic but extract duration
        if (!OPENAI_API_KEY) {
            const fallbackText = "عَفْوًا، لَمْ أَسْمَعْ شَيْئًا. هَلْ يُمْكِنُكَ الإِعَادَةَ؟";
            return { text: fallbackText, duration: 0 };
        }

        const audioSizeMB = params.audio.length / (1024 * 1024);
        if (audioSizeMB > 25) {
            console.error(`❌ Audio fayl juda katta: ${audioSizeMB.toFixed(2)}MB (max: 25MB)`);
            return { text: "عَفْوًا، الصَّوْتُ كَبِيرٌ جِدًّا.", duration: 0 };
        }

        const fd = new FormData();
        const extension = params.language === 'ar' ? 'webm' : 'webm';
        const filename = `audio.${extension}`;
        const contentType = `audio/${extension}`;

        fd.append("file", params.audio, { filename, contentType });
        fd.append("model", WHISPER_MODEL);
        const whisperLang = params.language || 'ar';
        fd.append("language", whisperLang);
        fd.append("temperature", "0");

        if (whisperLang === 'ar') {
            fd.append(
                "prompt",
                "مَا هَٰذَا يَا فَرِيد؟ هَٰذَا بُرْتُقَالٌ يَا فَرِيد. هَلْ هُوَ لَذِيذٌ؟ نَعَمْ هَٰذَا الْبُرْتُقَالُ لَذِيذٌ جِدًّا. مَا هَٰذَا يَا مُحَمَّد؟"
            );
        }

        fd.append("response_format", "verbose_json");

        try {
            console.log(`🎤 Calling Whisper API with model: ${WHISPER_MODEL}`);
            console.log(`📊 Audio size: ${audioSizeMB.toFixed(3)} MB`);

            const res = await axios.post("https://api.openai.com/v1/audio/transcriptions", fd, {
                headers: { ...fd.getHeaders(), Authorization: `Bearer ${OPENAI_API_KEY}` },
            });

            console.log("✅ Whisper API call successful");

            let transcribedText = "";
            const responseData = res.data as any;

            if (typeof responseData === "string") {
                transcribedText = responseData;
            } else if (responseData?.text) {
                transcribedText = responseData.text;
            } else if (responseData) {
                transcribedText = JSON.stringify(responseData);
            }

            // Extract duration from verbose_json response
            const duration = responseData?.duration || 0; // seconds
            console.log(`📝 Transcribed: "${transcribedText}" (duration: ${duration}s)`);

            return { text: transcribedText, duration };
        } catch (e: any) {
            console.error('❌ Whisper transcription error:', e.message);
            return { text: "", duration: 0 };
        }
    }

    private transliterateArabic(text: string): string {
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

        return text
            .split('')
            .map(char => arabicToLatin[char] || char)
            .join('');
    }
}

