import { Injectable } from "@nestjs/common";
import { AIChatMessage } from "../entities/ai-chat-message.entity";
import { AIChatSession } from "../entities/ai-chat-session.entity";
import { AI_FALLBACK_MESSAGES } from "../constants/error-messages";
import { TTSService } from "./tts.service";

/**
 * AIChatMessageFactory
 * -------------------------------------------------------
 * Maqsad: AI chat xabarlarini yaratish uchun factory pattern
 */
@Injectable()
export class AIChatMessageFactory {
    constructor(private readonly tts: TTSService) { }

    /**
     * Fallback xabar yaratish (STT bo'sh yoki non-Arabic)
     * @param session - Chat sessiyasi
     * @param originalText - Foydalanuvchi matni
     * @param fallbackType - Fallback turi
     * @returns Yaratilgan xabar
     */
    async createFallbackMessage(
        session: AIChatSession,
        originalText: string,
        fallbackType: 'empty' | 'non-arabic'
    ): Promise<AIChatMessage> {
        const message = new AIChatMessage();

        // FK ni aniq yozish
        message.sessionId = session.id as unknown as any;
        message.session = { id: session.id } as AIChatSession;
        message.senderType = 'ai';
        message.originalText = originalText;
        message.isWithinLimit = true;
        message.messageLanguage = session.sessionLanguage;
        message.contextUsed = { note: `${fallbackType}-transcript-fallback` };

        // Fallback turiga qarab javob berish
        if (fallbackType === 'empty') {
            message.aiResponseText = AI_FALLBACK_MESSAGES.EMPTY_TRANSCRIPT.arabic;
            message.aiResponseUzbek = AI_FALLBACK_MESSAGES.EMPTY_TRANSCRIPT.uzbek;
        } else {
            message.aiResponseText = AI_FALLBACK_MESSAGES.NON_ARABIC.arabic;
            message.aiResponseUzbek = AI_FALLBACK_MESSAGES.NON_ARABIC.uzbek;
        }

        // TTS audio yaratish
        message.audioUrl = await this.tts.textToSpeech({
            text: message.aiResponseUzbek,
            language: 'ar'
        });

        return message;
    }

    /**
     * Oddiy AI javob xabari yaratish
     * @param session - Chat sessiyasi
     * @param originalText - Foydalanuvchi matni
     * @param aiResponse - AI javobi
     * @param aiResponseUz - AI javobi o'zbek tilida
     * @param withinLimit - Limit ichida ekanligi
     * @param contextUsed - Ishlatilgan kontekst
     * @param audioUrl - Audio URL (ixtiyoriy)
     * @returns Yaratilgan xabar
     */
    async createResponseMessage(
        session: AIChatSession,
        originalText: string,
        aiResponse: string,
        aiResponseUz: string,
        withinLimit: boolean,
        contextUsed: any,
        audioUrl?: string
    ): Promise<AIChatMessage> {
        const message = new AIChatMessage();

        // FK ni aniq yozish
        message.sessionId = session.id as unknown as any;
        message.session = { id: session.id } as AIChatSession;
        message.senderType = 'ai';
        message.originalText = originalText;
        message.aiResponseText = aiResponse;
        message.aiResponseUzbek = aiResponseUz;
        message.isWithinLimit = withinLimit;
        message.messageLanguage = session.sessionLanguage;
        message.contextUsed = contextUsed;

        // Audio strategiyasi
        if (audioUrl) {
            message.audioUrl = audioUrl;
        } else {
            message.audioUrl = await this.tts.textToSpeech({
                text: aiResponseUz || aiResponse || '',
                language: 'ar'
            });
        }

        return message;
    }
}
