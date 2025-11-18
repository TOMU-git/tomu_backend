import { Injectable } from "@nestjs/common";
import axios from "axios";
import { promises as fs } from "fs";
import * as path from "path";

// Environment variables
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const TTS_MODEL = process.env.TTS_MODEL || "tts-1-hd"; // tts-1-hd (high quality) or tts-1 (faster)
const TTS_VOICE = process.env.TTS_VOICE || "shimmer"; // alloy, echo, fable, onyx, nova, shimmer
const TTS_SPEED = Number(process.env.TTS_SPEED || 0.85); // ✅ 0.85 arabcha uchun yaxshiroq (0.25-4.0 range)

// Console verification
// console.log("🔊 TTS Configuration:");
// console.log(`   TTS_MODEL: ${TTS_MODEL}`);
// console.log(`   TTS_VOICE: ${TTS_VOICE}`);
// console.log(`   TTS_SPEED: ${TTS_SPEED}`);

/**
 * TTS usage ma'lumotlari
 */
export interface TTSUsage {
    characters: number;
    audioUrl: string;
}

/**
 * TTS response with usage
 */
export interface TTSResponse {
    audioUrl: string;
    characters?: number;
}

/**
 * TTSService
 * -------------------------------------------------------
 * Maqsad: Matndan audio yaratish (adapter).
 */
@Injectable()
export class TTSService {
    /**
     * Text -> Speech (backward compatible)
     * @deprecated Use textToSpeechWithUsage() for cost tracking
     */
    async textToSpeech(params: { text: string; language: string; }): Promise<string> {
        if (!OPENAI_API_KEY) {
            return "/upload/audio/placeholder.mp3";
        }

        try {
            const res = await axios.post(
                "https://api.openai.com/v1/audio/speech",
                {
                    model: TTS_MODEL,
                    voice: TTS_VOICE,
                    input: params.text,
                    speed: TTS_SPEED,
                    response_format: "mp3",
                },
                { responseType: "arraybuffer", headers: { Authorization: `Bearer ${OPENAI_API_KEY}` } }
            );

            const outDir = path.resolve(process.cwd(), "upload", "audio");
            await fs.mkdir(outDir, { recursive: true });
            const filename = `tts_${Date.now()}.mp3`;
            const full = path.join(outDir, filename);
            await fs.writeFile(full, Buffer.from(res.data as any));

            const audioUrl = `/upload/audio/${filename}`;
            return audioUrl;
        } catch (e: any) {
            // console.log(`❌ TTS Error: ${e.message}`);
            return "/upload/audio/placeholder.mp3";
        }
    }

    /**
     * Text -> Speech (usage ma'lumotlari bilan)
     * @param params - Text va language
     * @returns Audio URL va character count (cost tracking uchun)
     */
    async textToSpeechWithUsage(params: { text: string; language: string; }): Promise<TTSResponse> {
        if (!OPENAI_API_KEY) {
            return { audioUrl: "/upload/audio/placeholder.mp3", characters: 0 };
        }

        try {
            const res = await axios.post(
                "https://api.openai.com/v1/audio/speech",
                {
                    model: TTS_MODEL,
                    voice: TTS_VOICE,
                    input: params.text,
                    speed: TTS_SPEED,
                    response_format: "mp3",
                },
                { responseType: "arraybuffer", headers: { Authorization: `Bearer ${OPENAI_API_KEY}` } }
            );

            const outDir = path.resolve(process.cwd(), "upload", "audio");
            await fs.mkdir(outDir, { recursive: true });
            const filename = `tts_${Date.now()}.mp3`;
            const full = path.join(outDir, filename);
            await fs.writeFile(full, Buffer.from(res.data as any));

            const audioUrl = `/upload/audio/${filename}`;
            const characters = params.text.length;

            // console.log(`🔊 TTS generated: ${characters} characters -> ${audioUrl}`);

            return { audioUrl, characters };
        } catch (e: any) {
            // console.log(`❌ TTS Error: ${e.message}`);
            return { audioUrl: "/upload/audio/placeholder.mp3", characters: 0 };
        }
    }
}

