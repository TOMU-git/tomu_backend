/**
 * ChatResponseDto
 * -------------------------------------------------------
 * Chat javobi uchun DTO.
 */
export class ChatResponseDto {
    messageId: number;
    sessionId: number;
    text: string;
    textUz: string;
    audioUrl?: string;
    isWithinLimit: boolean;
    createdAt: Date;
}


