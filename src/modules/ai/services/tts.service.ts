import { Injectable } from "@nestjs/common";
import axios from "axios";
import { promises as fs } from "fs";
import * as path from "path";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const TTS_MODEL = process.env.TTS_MODEL || "tts-1-hd";

/**
 * TTSService
 * -------------------------------------------------------
 * Maqsad: Matndan audio yaratish (adapter).
 */
@Injectable()
export class TTSService {
    async textToSpeech(params: { text: string; language: string; }): Promise<string> {
        if (!OPENAI_API_KEY) {
            return "/upload/audio/placeholder.mp3";
        }

        try {
            const res = await axios.post(
                "https://api.openai.com/v1/audio/speech",
                {
                    model: TTS_MODEL,
                    voice: "shimmer",
                    input: params.text,
                    speed: 0.9,
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
            console.log(`❌ TTS Error: ${e.message}`);
            return "/upload/audio/placeholder.mp3";
        }
    }
}

