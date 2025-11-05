import { Injectable } from "@nestjs/common";
import { AIChatMessage } from "../entities/ai-chat-message.entity";
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
     * @param sessionId - Chat sessiya ID (number)
     * @param originalText - Foydalanuvchi matni
     * @param fallbackType - Fallback turi
     * @returns Yaratilgan xabar
     */
    async createFallbackMessage(
        sessionId: number,
        originalText: string,
        fallbackType: 'empty' | 'non-arabic'
    ): Promise<AIChatMessage> {
        // Validation
        if (!sessionId || typeof sessionId !== 'number') {
            throw new Error(`[MessageFactory] Invalid sessionId: ${sessionId}`);
        }

        const message = new AIChatMessage();

        // SessionId'ni to'g'ridan-to'g'ri set qilish
        message.sessionId = sessionId;
        console.log(`[MessageFactory.createFallback] Set sessionId=${sessionId} for message`);
        message.senderType = 'ai';
        message.originalText = originalText;
        message.isWithinLimit = true;

        // Fallback turiga qarab javob berish
        if (fallbackType === 'empty') {
            message.aiResponseText = AI_FALLBACK_MESSAGES.EMPTY_TRANSCRIPT.arabic;
            message.aiResponseUzbek = AI_FALLBACK_MESSAGES.EMPTY_TRANSCRIPT.uzbek;
        } else {
            message.aiResponseText = AI_FALLBACK_MESSAGES.NON_ARABIC.arabic;
            message.aiResponseUzbek = AI_FALLBACK_MESSAGES.NON_ARABIC.uzbek;
        }

        // TTS audio yaratish - FAQAT ARABCHA!
        message.audioUrl = await this.tts.textToSpeech({
            text: message.aiResponseText,
            language: 'ar'
        });

        return message;
    }

    /**
     * Oddiy AI javob xabari yaratish
     * @param sessionId - Chat sessiya ID (number)
     * @param originalText - Foydalanuvchi matni
     * @param aiResponse - AI javobi
     * @param aiResponseUz - AI javobi o'zbek tilida
     * @param withinLimit - Limit ichida ekanligi
     * @param audioUrl - Audio URL (ixtiyoriy)
     * @returns Yaratilgan xabar
     */
    async createResponseMessage(
        sessionId: number,
        originalText: string,
        aiResponse: string,
        aiResponseUz: string,
        withinLimit: boolean,
        audioUrl?: string
    ): Promise<AIChatMessage> {
        // Validation
        if (!sessionId || typeof sessionId !== 'number') {
            throw new Error(`[MessageFactory] Invalid sessionId: ${sessionId}`);
        }

        const message = new AIChatMessage();

        // SessionId'ni to'g'ridan-to'g'ri set qilish
        message.sessionId = sessionId;
        console.log(`[MessageFactory.createResponse] Set sessionId=${sessionId} for message`);
        message.senderType = 'ai';
        message.originalText = originalText;
        message.aiResponseText = aiResponse;
        message.aiResponseUzbek = aiResponseUz;
        message.isWithinLimit = withinLimit;

        // Audio strategiyasi - FAQAT ARABCHA!
        if (audioUrl) {
            message.audioUrl = audioUrl;
        } else {
            message.audioUrl = await this.tts.textToSpeech({
                text: aiResponse || '',
                language: 'ar'
            });
        }

        return message;
    }
}
