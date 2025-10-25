import { Injectable } from "@nestjs/common";
import axios from "axios";
import FormData = require("form-data");

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const WHISPER_MODEL = process.env.WHISPER_MODEL || "whisper-1";

/**
 * WhisperService
 * -------------------------------------------------------
 * Maqsad: Audio -> Text konvertatsiya (STT).
 */
@Injectable()
export class WhisperService {
    async speechToText(params: { audio: Buffer; language?: string }): Promise<string> {
        if (!OPENAI_API_KEY) return "salom, qanday yordam beray?";

        const fd = new FormData();
        fd.append("file", params.audio, { filename: "audio.webm", contentType: "audio/webm" });
        fd.append("model", WHISPER_MODEL);
        // Tilni majburan berish (ar) kerak bo'lsa, language param orqali uzatamiz
        if (params.language) {
            fd.append("language", params.language);
        }
        // Aniqlikni oshirish uchun qo'shimcha parametrlar
        fd.append("temperature", "0");
        // Whisper’ga soha va kalit iboralarni bildiruvchi prompt beramiz (bias)
        fd.append(
            "prompt",
            "الرجاء نسخ الكلام حرفياً بالعربية القياسية دون ترجمة. كلمات مفتاحية: فريد، ما هذا يا فريد."
        );
        // Oddiy matn chiqishi
        fd.append("response_format", "text");

        try {
            const res = await axios.post("https://api.openai.com/v1/audio/transcriptions", fd, {
                headers: { ...fd.getHeaders(), Authorization: `Bearer ${OPENAI_API_KEY}` },
            });

            // OpenAI: response_format=text bo'lsa string qaytadi, aks holda JSON { text }
            const isString = typeof res.data === "string";
            const transcribedText = isString ? (res.data as string) : ((res.data as any)?.text || "");

            // Console log: Arabic text va Latin transliteration
            console.log('🎙️ User audio transcribed:');
            console.log('📝 Arabic text:', transcribedText);
            console.log('🔤 Latin transliteration:', this.transliterateArabic(transcribedText));

            return transcribedText;
        } catch (e: any) {
            console.error('Whisper transcription error:', e);
            return "";
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

