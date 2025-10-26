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
        // Whisper'ga soha va kalit iboralarni bildiruvchi prompt beramiz (bias)
        // Modern Standard Arabic (MSA) recognition with critical lesson vocabulary
        // CRITICAL: هَلْ is a question particle, NOT وَلْ (which doesn't exist)
        fd.append(
            "prompt",
            "مَا هَٰذَا يَا فَرِيد؟ هَٰذَا بُرْتُقَالٌ يَا فَرِيد. هَلْ هُوَ لَذِيذٌ؟ نَعَمْ هَٰذَا الْبُرْتُقَالُ لَذِيذٌ جِدًّا. مَا هَٰذَا يَا مُحَمَّد؟"
        );
        // Verbose JSON for better accuracy (includes word timestamps)
        fd.append("response_format", "verbose_json");

        try {
            const res = await axios.post("https://api.openai.com/v1/audio/transcriptions", fd, {
                headers: { ...fd.getHeaders(), Authorization: `Bearer ${OPENAI_API_KEY}` },
            });

            // OpenAI: response_format=verbose_json returns JSON with text field
            const transcribedText = typeof res.data === "string"
                ? res.data
                : ((res.data as any)?.text || "");

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

