import { Injectable } from "@nestjs/common";
import axios from "axios";
import { ChromaService } from "./chroma.service";

@Injectable()
export class AIDiagnosticsService {
    constructor(private readonly chroma: ChromaService) { }

    /**
     * Tashqi service'lar bilan bog'lanish holatini tekshiradi
     * - Hech qanday pulli chaqiriq qilmaydi (faqat health/config)
     */
    async checkConnectivity(): Promise<{ openai: { keyPresent: boolean; gptReachable: boolean; ttsReachable: boolean }; chroma: { usingChroma: boolean; url?: string; reachable: boolean; memoryIndex: { languages: number; chunks: number } } }> {
        const OPENAI_API_KEY = !!process.env.OPENAI_API_KEY;
        const GPT_MODEL = process.env.GPT_MODEL || "gpt-5";
        const TTS_MODEL = process.env.TTS_MODEL || "tts-1-hd";

        // OpenAI reachability: GET /models (no billing)
        const openaiUrl = "https://api.openai.com/v1";
        let gptReachable = false;
        let ttsReachable = false;
        try {
            await axios.get(`${openaiUrl}/models`, { headers: OPENAI_API_KEY ? { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` } : undefined, timeout: 5000 });
            gptReachable = true;
            ttsReachable = true;
        } catch {
            gptReachable = false;
            ttsReachable = false;
        }

        // Chroma or Memory Index status
        const usingChroma = process.env.USE_RAG === '1';
        const chromaUrl = usingChroma ? `${process.env.CHROMA_URL || 'http://localhost:8000'}${(process.env.CHROMA_API_VERSION || '').trim() === '2' ? '/api/v2' : '/api/v1'}` : undefined;
        let chromaReachable = false;
        if (usingChroma && chromaUrl) {
            try {
                await axios.get(`${chromaUrl}/collections`, { timeout: 3000 });
                chromaReachable = true;
            } catch {
                chromaReachable = false;
            }
        }

        const stats = this.chroma.getMemoryIndexStats();

        // console.log(`🔑 OpenAI: ${OPENAI_API_KEY ? 'OK' : 'NO KEY'} | GPT: ${gptReachable ? 'OK' : 'FAIL'} | TTS: ${ttsReachable ? 'OK' : 'FAIL'}`);
        // console.log(`📦 RAG: ${usingChroma ? 'Chroma' : 'Memory'} (${stats.chunks} chunks)`);

        return {
            openai: { keyPresent: OPENAI_API_KEY, gptReachable, ttsReachable },
            chroma: { usingChroma, url: chromaUrl, reachable: chromaReachable, memoryIndex: { languages: stats.languages, chunks: stats.chunks } },
        };
    }
}


