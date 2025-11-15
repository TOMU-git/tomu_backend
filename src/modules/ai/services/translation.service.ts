import { Injectable } from "@nestjs/common";
import axios from "axios";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const TRANSLATION_MODEL = process.env.GPT_MODEL || "gpt-5"; // Use same model as main GPT service
const TRANSLATION_MAX_TOKENS = 500; // Increased for longer translations

/**
 * TranslationService
 * -------------------------------------------------------
 * Maqsad: Tarjima va til aniqlash yordamchisi.
 */
@Injectable()
export class TranslationService {
    async translateToUzbek(text: string): Promise<string> {
        if (!text || !text.trim() || !OPENAI_API_KEY) {
            return text || '';
        }

        try {
            const res = await axios.post(
                "https://api.openai.com/v1/chat/completions",
                {
                    model: TRANSLATION_MODEL,
                    messages: [
                        {
                            role: "system",
                            content: "You are a translator. Translate Arabic text to Uzbek (Latin script). Only return the translation, nothing else."
                        },
                        {
                            role: "user",
                            content: text
                        }
                    ],
                    max_tokens: TRANSLATION_MAX_TOKENS,
                    temperature: 0.3,
                },
                { 
                    headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
                    timeout: 30000 // 30 seconds timeout
                }
            );

            const translated = (res.data as any)?.choices?.[0]?.message?.content?.trim();
            return translated || text;
        } catch (e: any) {
            console.error(`[TranslationService] Error translating to Uzbek: ${e?.message || 'Unknown error'}`);
            // Fallback - matnni qaytarish
            return text;
        }
    }
}


