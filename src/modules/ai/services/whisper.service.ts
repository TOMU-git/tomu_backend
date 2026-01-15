import { Injectable } from "@nestjs/common";
import axios from "axios";
import FormData = require("form-data");
import { WHISPER_DEFAULTS, validateLanguage } from "../constants/whisper.constants";
import { getPromptForLanguage } from "../constants/whisper-prompts";
import { getFallbackMessage } from "../constants/whisper-fallbacks";

// Environment variables
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const WHISPER_MODEL = process.env.WHISPER_MODEL || "whisper-1";
const WHISPER_TEMPERATURE = process.env.WHISPER_TEMPERATURE || WHISPER_DEFAULTS.TEMPERATURE;

/**
 * Whisper usage ma'lumotlari
 */
export interface WhisperUsage {
    duration: number; // seconds
    text: string;
}

/**
 * Whisper API verbose_json response segment
 */
export interface WhisperSegment {
    id: number;
    seek: number;
    start: number;
    end: number;
    text: string;
    tokens: number[];
    temperature: number;
    avg_logprob: number; // Ishonchlilik darajasi (past = ishonchsiz)
    compression_ratio: number;
    no_speech_prob: number; // Jimlik ehtimoli (yuqori = gapirish yo'q)
}

/**
 * Whisper API verbose_json response
 */
export interface WhisperVerboseResponse {
    task: string;
    language: string; // Aniqlangan til
    duration: number; // Audio davomiyligi (soniya)
    text: string; // To'liq transkripsiya
    segments: WhisperSegment[]; // Har bir segmentning batafsil ma'lumotlari
}

/**
 * Whisper response with usage
 */
export interface WhisperResponse {
    text: string;
    duration?: number; // seconds
    language?: string; // Aniqlangan til
    error?: 'noSpeechDetected' | 'onlyNoise' | 'wrongLanguage'; // Xato turi
    errorMessage?: string; // Xato xabari (fallback message)
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
        const result = await this.transcribeAudio(params);
        return result.text;
    }

    /**
     * Audio -> Text (usage ma'lumotlari bilan)
     * @param params - Audio va language
     * @returns Text va duration (cost tracking uchun)
     */
    async speechToTextWithUsage(params: { audio: Buffer; language?: string }): Promise<WhisperResponse> {
        return await this.transcribeAudio(params);
    }

    /**
     * Umumiy audio transkripsiya metod
     * @param params - Audio va language
     * @returns Text va duration
     * @private
     */
    private async transcribeAudio(params: { audio: Buffer; language?: string }): Promise<WhisperResponse> {
        // Til validatsiyasi
        const validatedLanguage = validateLanguage(params.language);

        // API key tekshiruvi
        if (!OPENAI_API_KEY) {
            const fallbackText = getFallbackMessage(validatedLanguage, 'noAudio');
            return { text: fallbackText, duration: 0 };
        }

        // Audio fayl hajmini tekshirish
        const audioSizeMB = params.audio.length / (1024 * 1024);
        if (audioSizeMB > WHISPER_DEFAULTS.MAX_FILE_SIZE_MB) {
            console.error(
                `❌ Audio fayl juda katta: ${audioSizeMB.toFixed(2)}MB (max: ${WHISPER_DEFAULTS.MAX_FILE_SIZE_MB}MB)`
            );
            const fallbackText = getFallbackMessage(validatedLanguage, 'fileTooLarge');
            return { text: fallbackText, duration: 0 };
        }

        // FormData yaratish
        const fd = new FormData();
        const filename = `audio.${WHISPER_DEFAULTS.EXTENSION}`;
        const contentType = WHISPER_DEFAULTS.CONTENT_TYPE;

        fd.append("file", params.audio, { filename, contentType });
        fd.append("model", WHISPER_MODEL);
        // ❌ Language parametrini OLIB TASHLADIK - Whisper o'zi tilni aniqlaydi!
        // fd.append("language", validatedLanguage); // Bu Whisper'ni majburlaydi
        fd.append("temperature", WHISPER_TEMPERATURE);

        // ❌ Prompt ham olib tashlandi - til detection uchun
        // const prompt = getPromptForLanguage(validatedLanguage);
        // if (prompt) {
        //     fd.append("prompt", prompt);
        // }

        // Response format - JSON olish uchun
        fd.append("response_format", "verbose_json");

        try {
            // console.log(`🎤 Calling Whisper API with model: ${WHISPER_MODEL}`);
            // console.log(`📊 Audio size: ${audioSizeMB.toFixed(3)} MB`);
            // console.log(`🌐 Language: ${validatedLanguage}`);

            const res = await axios.post("https://api.openai.com/v1/audio/transcriptions", fd, {
                headers: { ...fd.getHeaders(), Authorization: `Bearer ${OPENAI_API_KEY}` },
            });

            // console.log("✅ Whisper API call successful");

            // OpenAI: response_format=verbose_json returns JSON with text field
            let transcribedText = "";
            const responseData = res.data as WhisperVerboseResponse;

            if (typeof responseData === "string") {
                transcribedText = responseData;
            } else if (responseData?.text) {
                // verbose_json formatda text maydoni
                transcribedText = responseData.text;
            } else if (responseData) {
                // Oddiy JSON format
                transcribedText = JSON.stringify(responseData);
            }

            // Extract duration from verbose_json response
            const duration = responseData?.duration || 0; // seconds

            // 🔍 DEBUG: Response'ni to'liq log qilish
            console.log(`🔍 [Whisper Debug] Response keys:`, Object.keys(responseData || {}));
            console.log(`🔍 [Whisper Debug] Language:`, responseData?.language);
            console.log(`🔍 [Whisper Debug] Text:`, responseData?.text?.substring(0, 50));
            console.log(`🔍 [Whisper Debug] Duration:`, duration);

            // ✅ CONFIDENCE CHECK 0: Language detection (arabcha emasligini aniqlash)
            const detectedLanguage = responseData?.language || '';
            console.log(`🔍 [Whisper] Detected language: "${detectedLanguage}"`);

            // ✅ CONFIDENCE CHECK 0.5: Text content validation (ingliz tili so'zlari)
            const hasEnglishWords = /\b(this|that|is|are|not|arabic|language|english|please|speak|only)\b/i.test(transcribedText);
            if (hasEnglishWords) {
                console.log(`⚠️  Ingliz tili so'zlari aniqlandi: "${transcribedText}"`);
                const fallbackText = getFallbackMessage(validatedLanguage, 'nonArabic');
                return {
                    text: "",
                    duration: 0,
                    error: 'wrongLanguage',
                    errorMessage: fallbackText
                };
            }

            // ✅ CONFIDENCE CHECK 1: Minimum duration tekshiruvi
            if (duration < WHISPER_DEFAULTS.MIN_DURATION_SECONDS) {
                console.log(`⚠️  Audio juda qisqa: ${duration}s (min: ${WHISPER_DEFAULTS.MIN_DURATION_SECONDS}s)`);
                const fallbackText = getFallbackMessage(validatedLanguage, 'tooShort');
                return {
                    text: "",
                    duration: 0,
                    error: 'onlyNoise',
                    errorMessage: fallbackText
                };
            }

            // ✅ CONFIDENCE CHECK 2: No speech detection (jimlik)
            if (responseData.segments && responseData.segments.length > 0) {
                const avgNoSpeechProb = responseData.segments.reduce(
                    (sum, seg) => sum + seg.no_speech_prob, 0
                ) / responseData.segments.length;

                if (avgNoSpeechProb > WHISPER_DEFAULTS.NO_SPEECH_PROB_THRESHOLD) {
                    console.log(`⚠️  Jimlik aniqlandi: no_speech_prob=${(avgNoSpeechProb * 100).toFixed(1)}% (threshold: ${(WHISPER_DEFAULTS.NO_SPEECH_PROB_THRESHOLD * 100).toFixed(0)}%)`);
                    const fallbackText = getFallbackMessage(validatedLanguage, 'noSpeech');
                    return {
                        text: "",
                        duration: 0,
                        error: 'noSpeechDetected',
                        errorMessage: fallbackText
                    };
                }
            }

            // ✅ CONFIDENCE CHECK 3: Low confidence detection (past ishonchlilik)
            if (responseData.segments && responseData.segments.length > 0) {
                const avgLogProb = responseData.segments.reduce(
                    (sum, seg) => sum + seg.avg_logprob, 0
                ) / responseData.segments.length;

                if (avgLogProb < WHISPER_DEFAULTS.AVG_LOGPROB_THRESHOLD) {
                    console.log(`⚠️  Past ishonchlilik: avg_logprob=${avgLogProb.toFixed(2)} (threshold: ${WHISPER_DEFAULTS.AVG_LOGPROB_THRESHOLD})`);
                    const fallbackText = getFallbackMessage(validatedLanguage, 'lowConfidence');
                    return {
                        text: "",
                        duration: 0,
                        error: 'onlyNoise',
                        errorMessage: fallbackText
                    };
                }
            }

            // console.log(`📝 Transcribed: "${transcribedText}" (duration: ${duration}s)`);

            return { text: transcribedText, duration };
        } catch (e: any) {
            console.error('❌ Whisper transcription error:', e.message);
            if (e.response) {
                console.error('❌ Error status:', e.response.status);
                console.error('❌ Error data:', JSON.stringify(e.response.data, null, 2));
            }
            console.error('⚠️  Falling back to empty string');

            // Xato holatida bo'sh string qaytarish
            return { text: "", duration: 0 };
        }
    }
}

