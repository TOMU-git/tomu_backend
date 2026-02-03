import { Injectable } from "@nestjs/common";
import { AIChatMessage } from "../entities/ai-chat-message.entity";
import { AI_FALLBACK_MESSAGES } from "../constants/error-messages";
import { TTSService } from "./tts.service";
import { TranslationService } from "./translation.service";
import { ArabicTextUtils } from "../utils/arabic-text.util";
import { stripSSML } from "../utils/ssml.util";
import { getFallbackAudioUrl } from "../utils/fallback-audio.util";
import * as fs from "fs/promises";
import * as path from "path";

/**
 * AIChatMessageFactory
 * -------------------------------------------------------
 * Maqsad: AI chat xabarlarini yaratish uchun factory pattern
 */
@Injectable()
export class AIChatMessageFactory {
    constructor(
        private readonly tts: TTSService,
        private readonly translation: TranslationService
    ) { }

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
        let fallbackConstantKey: string;
        if (fallbackType === 'empty') {
            message.aiResponseText = AI_FALLBACK_MESSAGES.EMPTY_TRANSCRIPT.arabic;
            message.aiResponseUzbek = AI_FALLBACK_MESSAGES.EMPTY_TRANSCRIPT.uzbek;
            fallbackConstantKey = 'EMPTY_TRANSCRIPT';
        } else {
            message.aiResponseText = AI_FALLBACK_MESSAGES.NON_ARABIC.arabic;
            message.aiResponseUzbek = AI_FALLBACK_MESSAGES.NON_ARABIC.uzbek;
            fallbackConstantKey = 'NON_ARABIC';
        }

        // Fallback message qiymatlarini logga chiqarish
        console.log('Fallback response (arabic):', message.aiResponseText);
        console.log('Fallback response (uzbek):', message.aiResponseUzbek);

        // ✅ TAYYOR AUDIO: Avval tayyor audio'ni tekshirish
        const preRecordedAudio = getFallbackAudioUrl(fallbackConstantKey);
        if (preRecordedAudio) {
            console.log(`[MessageFactory] ✅ Using pre-recorded audio: ${preRecordedAudio}`);
            message.audioUrl = preRecordedAudio;
        } else {
            // ❌ Tayyor audio yo'q - TTS fallback
            console.log(`[MessageFactory] ⚠️  No pre-recorded audio, using TTS fallback`);
            message.audioUrl = await this.tts.textToSpeech({
                text: message.aiResponseText,
                language: 'ar'
            });
        }

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
            // Default format: mp3
            let extension = 'mp3'; // default - mp3 formatida saqlash
            const normalizedMime = (mimetype || '').toLowerCase();

            if (normalizedMime.includes('audio/mpeg') || normalizedMime.includes('audio/mp3') || normalizedMime.includes('mp3')) {
                extension = 'mp3';
            } else if (normalizedMime.includes('audio/wav') || normalizedMime.includes('audio/x-wav') || normalizedMime.includes('wav')) {
                extension = 'mp3'; // WAV ni ham mp3 formatida saqlash
            } else if (normalizedMime.includes('audio/ogg') || normalizedMime.includes('ogg')) {
                extension = 'mp3'; // OGG ni ham mp3 formatida saqlash
            } else if (normalizedMime.includes('audio/webm') || normalizedMime.includes('webm')) {
                extension = 'mp3'; // WebM ni ham mp3 formatida saqlash
            } else if (normalizedMime.includes('webp') || normalizedMime.includes('image/')) {
                // .webp yoki boshqa rasm formatlari - audio emas, default mp3 ishlatish
                console.warn(`[MessageFactory] Invalid audio mimetype detected: ${mimetype}, using default mp3`);
                extension = 'mp3';
            }

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
     * User xabarlari ham AI xabarlari kabi aiResponseText va aiResponseUzbek ga saqlanadi
     * @param sessionId - Chat sessiya ID (number)
     * @param originalText - Foydalanuvchi matni
     * @param audioUrl - Foydalanuvchi audio URL (ixtiyoriy)
     * @param audioDuration - Audio davomiyligi soniyalarda (ixtiyoriy)
     * @returns Yaratilgan xabar
     */
    async createUserMessage(
        sessionId: number,
        originalText: string,
        audioUrl?: string,
        audioDuration?: number
    ): Promise<AIChatMessage> {
        // Validation
        if (!sessionId || typeof sessionId !== 'number') {
            throw new Error(`[MessageFactory] Invalid sessionId: ${sessionId}`);
        }

        // User matnini o'zbek tiliga tarjima qilish
        let uzbekText = '';
        try {
            if (originalText && originalText.trim().length > 0) {
                uzbekText = await this.translation.translateToUzbek(originalText);
            }
        } catch (error: any) {
            console.error(`[MessageFactory] Error translating user message to Uzbek: ${error.message}`);
            // Tarjima xatosi bo'lsa ham, xabarni saqlashni davom ettirish
            uzbekText = '';
        }

        const message = new AIChatMessage();
        message.sessionId = sessionId;
        message.senderType = 'user';
        message.originalText = null; // originalText endi ishlatilmaydi
        message.aiResponseText = originalText; // User matni aiResponseText ga yoziladi
        message.aiResponseUzbek = uzbekText; // O'zbek tarjimasi aiResponseUzbek ga yoziladi
        message.audioUrl = audioUrl || null; // Foydalanuvchi audio URL
        message.audioDuration = audioDuration || null; // User audio duration
        console.log(`[MessageFactory] User message audioDuration set: ${audioDuration}s`);
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
     * @param audioDuration - Audio davomiyligi soniyalarda (ixtiyoriy)
     * @returns Yaratilgan xabar
     */
    async createResponseMessage(
        sessionId: number,
        originalText: string,
        aiResponse: string,
        aiResponseUz: string,
        withinLimit: boolean,
        audioUrl?: string,
        audioDuration?: number
    ): Promise<AIChatMessage> {
        // Validation
        if (!sessionId || typeof sessionId !== 'number') {
            throw new Error(`[MessageFactory] Invalid sessionId: ${sessionId}`);
        }

        // aiResponseUz ni tekshirish va kerak bo'lsa tarjima qilish
        let finalUzbekText = aiResponseUz || '';

        // Agar aiResponseUz bo'sh, aiResponse bilan bir xil yoki arabcha bo'lsa, tarjima qilish
        const needsTranslation =
            !finalUzbekText ||
            finalUzbekText.trim() === '' ||
            finalUzbekText.trim() === aiResponse.trim() ||
            ArabicTextUtils.isArabicText(finalUzbekText);

        if (needsTranslation && aiResponse && aiResponse.trim().length > 0) {
            try {
                console.log(`[MessageFactory] Translating aiResponseUzbek: "${aiResponse}" -> Uzbek`);
                finalUzbekText = await this.translation.translateToUzbek(aiResponse);
                console.log(`[MessageFactory] Translation result: "${finalUzbekText}"`);
            } catch (error: any) {
                console.error(`[MessageFactory] Error translating aiResponseUzbek: ${error.message}`);
                // Tarjima xatosi bo'lsa ham, bo'sh qoldirish yoki asl matnni qoldirish
                finalUzbekText = finalUzbekText || '';
            }
        }

        const message = new AIChatMessage();

        // SessionId'ni to'g'ridan-to'g'ri set qilish
        message.sessionId = sessionId;
        message.senderType = 'ai';
        message.originalText = null; // Foydalanuvchi xabari alohida saqlanadi

        // ✅ SSML teglarini olib tashlash - bazaga saqlashdan oldin
        // TTS uchun SSML audio yaratishda ishlatiladi, lekin bazaga saqlanmaydi
        const cleanAiResponse = stripSSML(aiResponse || '');
        message.aiResponseText = cleanAiResponse;
        message.aiResponseUzbek = finalUzbekText;
        message.isWithinLimit = withinLimit;

        // Audio strategiyasi - FAQAT ARABCHA!
        // TTS ga yuborishda SSML bo'lishi mumkin (agar mavjud bo'lsa)
        // TTS servisi SSML ni to'g'ri qayta ishlaydi
        if (audioUrl) {
            message.audioUrl = audioUrl;
            message.audioDuration = audioDuration || null; // AI audio duration
            console.log(`[MessageFactory] AI message audioDuration:`, {
                received: audioDuration,
                type: typeof audioDuration,
                set: message.audioDuration
            });
        } else {
            // TTS ga yuborishda asl aiResponse ishlatiladi (SSML bo'lsa ham)
            // TTS servisi SSML ni qo'llab-quvvatlaydi
            message.audioUrl = await this.tts.textToSpeech({
                text: aiResponse || '',
                language: 'ar'
            });
            message.audioDuration = null; // Old method, duration yo'q
        }

        return message;
    }
}
