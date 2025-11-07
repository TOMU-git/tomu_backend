import { AIChatSession } from "../../entities/ai-chat-session.entity";
import { ID } from "src/common/types/type";

/**
 * Pipeline Types and Interfaces
 * -------------------------------------------------------
 * Pipeline uchun umumiy type va interface'lar
 */

export interface VoiceInput {
    userId: ID;
    sessionId: ID;
    audioBuffer: Buffer;
    courseId?: ID;
    language?: string;
    session: AIChatSession;
    validatedText?: string;
    transcribedText?: string;
    context?: any;
    conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
    lastWatchedLessonOrder?: number;
    aiResponse?: string;
    aiResponseUz?: string;
    // Cost tracking ma'lumotlari
    usage?: {
        whisper?: {
            duration: number; // seconds
        };
        gpt?: {
            promptTokens: number;
            completionTokens: number;
            totalTokens: number;
        };
        tts?: {
            characters: number;
        };
    };
}

export interface VoiceOutput {
    message: any; // AIChatMessage
    session: AIChatSession;
    usage?: VoiceInput['usage'];
    transcribedText?: string; // Foydalanuvchi xabarini saqlash uchun
}

export interface PipelineStep {
    execute(input: VoiceInput): Promise<VoiceInput | VoiceOutput>;
}


