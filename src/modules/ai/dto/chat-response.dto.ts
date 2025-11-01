import { ApiProperty } from "@nestjs/swagger";

/**
 * ChatResponseDto
 * -------------------------------------------------------
 * Chat javobi uchun DTO.
 */
export class ChatResponseDto {
    @ApiProperty({ description: "Xabar ID", example: 789 })
    messageId: number;
    @ApiProperty({ description: "Sessiya ID", example: 123 })
    sessionId: number;
    @ApiProperty({ description: "AI javobi (arab tilida)", example: "هَذَا بُرْتُقَالٌ." })
    text: string;
    @ApiProperty({ description: "AI javobi (o'zbek tarjima)", example: "Bu apelsin.", default: "", required: false })
    textUz: string;
    @ApiProperty({ description: "Audio URL (TTS)", example: "/upload/audio/tts_1761595335910.mp3", required: false, nullable: true })
    audioUrl?: string;
    @ApiProperty({ description: "Limit ichida", example: true })
    isWithinLimit: boolean;
    @ApiProperty({ description: "Yaratilgan vaqt", example: "2024-01-01T12:05:00.000Z" })
    createdAt: Date;
}


