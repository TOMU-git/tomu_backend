import { Injectable } from "@nestjs/common";
import axios from "axios";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const TRANSLATION_MODEL = "gpt-4o-mini"; // Fast and cheap for translation

/**
 * TranslationService
 * -------------------------------------------------------
 * Maqsad: Tarjima va til aniqlash yordamchisi.
 */
@Injectable()
export class TranslationService {
    async translateToUzbek(text: string): Promise<string> {
        if (!text || !OPENAI_API_KEY) return text;

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
                    max_tokens: 100,
                    temperature: 0.3,
                },
                { headers: { Authorization: `Bearer ${OPENAI_API_KEY}` } }
            );

            return (res.data as any)?.choices?.[0]?.message?.content?.trim() || text;
        } catch (e) {
            // Fallback - matnni qaytarish
            return text;
        }
    }
}


