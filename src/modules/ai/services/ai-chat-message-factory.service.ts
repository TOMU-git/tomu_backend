import { Injectable } from "@nestjs/common";
import { AIChatMessage } from "../entities/ai-chat-message.entity";
import { AI_FALLBACK_MESSAGES } from "../constants/error-messages";
import { TTSService } from "./tts.service";
import * as fs from "fs/promises";
import * as path from "path";

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
     * Foydalanuvchi audio faylini saqlash
     * @param audioBuffer - Audio buffer
     * @param mimetype - Audio MIME type
     * @returns Audio URL
     */
    async saveUserAudio(audioBuffer: Buffer, mimetype: string): Promise<string> {
        try {
            const outDir = path.resolve(process.cwd(), "upload", "audio");
            await fs.mkdir(outDir, { recursive: true });

            // Extension'ni MIME type'dan olish
            let extension = 'webm'; // default
            if (mimetype.includes('mp3')) extension = 'mp3';
            else if (mimetype.includes('wav')) extension = 'wav';
            else if (mimetype.includes('ogg')) extension = 'ogg';
            else if (mimetype.includes('webm')) extension = 'webm';

            const filename = `user_audio_${Date.now()}.${extension}`;
            const full = path.join(outDir, filename);
            await fs.writeFile(full, audioBuffer);

            const audioUrl = `/upload/audio/${filename}`;
            return audioUrl;
        } catch (error: any) {
            console.error(`[MessageFactory] Error saving user audio: ${error.message}`);
            return null; // Xato bo'lsa, null qaytarish
        }
    }

    /**
     * Foydalanuvchi xabarini yaratish
     * @param sessionId - Chat sessiya ID (number)
     * @param originalText - Foydalanuvchi matni
     * @param audioUrl - Foydalanuvchi audio URL (ixtiyoriy)
     * @returns Yaratilgan xabar
     */
    async createUserMessage(
        sessionId: number,
        originalText: string,
        audioUrl?: string
    ): Promise<AIChatMessage> {
        // Validation
        if (!sessionId || typeof sessionId !== 'number') {
            throw new Error(`[MessageFactory] Invalid sessionId: ${sessionId}`);
        }

        const message = new AIChatMessage();
        message.sessionId = sessionId;
        message.senderType = 'user';
        message.originalText = originalText;
        message.aiResponseText = null;
        message.aiResponseUzbek = null;
        message.audioUrl = audioUrl || null; // Foydalanuvchi audio URL
        message.isWithinLimit = true;

        return message;
    }

    /**
     * Oddiy AI javob xabari yaratish
     * @param sessionId - Chat sessiya ID (number)
     * @param originalText - Foydalanuvchi matni (faqat ma'lumot uchun)
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
        message.originalText = null; // Foydalanuvchi xabari alohida saqlanadi
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
