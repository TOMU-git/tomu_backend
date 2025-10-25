import { Injectable } from "@nestjs/common";
import axios from "axios";
import { promises as fs } from "fs";
import * as path from "path";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const TTS_MODEL = process.env.TTS_MODEL || "gpt-4o-mini-tts";

/**
 * TTSService
 * -------------------------------------------------------
 * Maqsad: Matndan audio yaratish (adapter).
 */
@Injectable()
export class TTSService {
    async textToSpeech(params: { text: string; language: string; }): Promise<string> {
        console.log('🎵 ===== TTS GENERATION STARTED =====');
        console.log(`📝 Text to convert: "${params.text}"`);
        console.log(`🌐 Language: ${params.language}`);

        if (!OPENAI_API_KEY) {
            console.log('⚠️ OpenAI API key not found, using placeholder');
            return "/upload/audio/placeholder.mp3";
        }

        try {
            console.log(`🚀 Sending request to OpenAI TTS (${TTS_MODEL})...`);
            const res = await axios.post(
                "https://api.openai.com/v1/audio/speech",
                {
                    model: TTS_MODEL,
                    voice: "alloy",
                    input: params.text,
                    format: "mp3",
                },
                { responseType: "arraybuffer", headers: { Authorization: `Bearer ${OPENAI_API_KEY}` } }
            );

            const outDir = path.resolve(process.cwd(), "upload", "audio");
            await fs.mkdir(outDir, { recursive: true });
            const filename = `tts_${Date.now()}.mp3`;
            const full = path.join(outDir, filename);
            await fs.writeFile(full, Buffer.from(res.data as any));

            const audioUrl = `/upload/audio/${filename}`;
            console.log(`✅ TTS Audio generated: ${audioUrl}`);
            console.log('🎵 ===== TTS GENERATION COMPLETED =====\n');
            return audioUrl;
        } catch (e: any) {
            console.log(`❌ TTS Error: ${e.message}`);
            console.log('🎵 ===== TTS GENERATION COMPLETED (FALLBACK) =====\n');
            return "/upload/audio/placeholder.mp3";
        }
    }
}

