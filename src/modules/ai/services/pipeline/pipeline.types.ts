import { AIChatSession } from "../../entities/ai-chat-session.entity";
import { ID } from "src/common/types/type";

/**
 * Pipeline Types va Interfaces
 * 
 * Pipeline uchun umumiy type va interface'lar
 */

/**
 * Pipeline input ma'lumotlari
 * Har bir step bu ma'lumotlarni qabul qiladi va yangilaydi
 */
export interface VoiceInput {
    userId: ID;
    sessionId: ID;
    audioBuffer: Buffer; // Audio fayl buffer
    courseId?: ID;
    language?: string; // Audio tili (default: 'ar')
    session: AIChatSession;
    validatedText?: string; // Validatsiya qilingan matn
    transcribedText?: string; // STT natijasi
    context?: any; // Dars materiallari (kontekst)
    conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>; // Suhbat tarixi
    lastWatchedLessonOrder?: number; // Foydalanuvchi ko'rgan eng oxirgi dars tartibi
    aiResponse?: string; // AI javobi (arab tilida)
    aiResponseUz?: string; // AI javobi (o'zbek tilida)
    // Xarajat kuzatish ma'lumotlari
    usage?: {
        whisper?: {
            duration: number; // Audio davomiyligi (soniya)
        };
        gpt?: {
            promptTokens: number; // Prompt tokenlar soni
            completionTokens: number; // Completion tokenlar soni
            totalTokens: number; // Jami tokenlar soni
        };
        tts?: {
            characters: number; // TTS uchun ishlatilgan belgilar soni
            duration?: number; // TTS audio davomiyligi (soniya)
        };
    };
}

/**
 * Pipeline output ma'lumotlari
 * Pipeline yakunlanganda qaytariladi
 */
export interface VoiceOutput {
    message: any; // AIChatMessage entity
    session: AIChatSession;
    usage?: VoiceInput['usage']; // Xarajat ma'lumotlari
    transcribedText?: string; // Foydalanuvchi xabarini saqlash uchun
}

/**
 * Pipeline step interface
 * Har bir step bu interface'ni implement qilishi kerak
 */
export interface PipelineStep {
    execute(input: VoiceInput): Promise<VoiceInput | VoiceOutput>;
}


