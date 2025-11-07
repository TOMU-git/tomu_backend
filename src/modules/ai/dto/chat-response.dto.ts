import { ApiProperty } from "@nestjs/swagger";

/**
 * ChatMessageDto
 * -------------------------------------------------------
 * Chat xabari uchun DTO.
 */
export class ChatMessageDto {
    @ApiProperty({ description: "Xabar ID", example: 789 })
    id: number;
    @ApiProperty({ description: "Sessiya ID", example: 123 })
    sessionId: number;
    @ApiProperty({ description: "Yuboruvchi turi", example: "ai", enum: ["user", "ai"] })
    senderType: "user" | "ai";
    @ApiProperty({ description: "Foydalanuvchi matni", example: "مَا هَٰذَا؟", nullable: true })
    originalText?: string;
    @ApiProperty({ description: "AI javobi (arab tilida)", example: "هَذَا بُرْتُقَالٌ.", nullable: true })
    aiResponseText?: string;
    @ApiProperty({ description: "AI javobi (o'zbek tarjima)", example: "Bu apelsin.", nullable: true })
    aiResponseUzbek?: string;
    @ApiProperty({ description: "Audio URL (TTS)", example: "/upload/audio/tts_1761595335910.mp3", nullable: true })
    audioUrl?: string;
    @ApiProperty({ description: "Limit ichida", example: true })
    isWithinLimit: boolean;
    @ApiProperty({ description: "Yaratilgan vaqt", example: "2024-01-01T12:05:00.000Z" })
    createdAt: Date;
}

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
    @ApiProperty({
        description: "Sessiya xabarlari (oxirgi 20 ta)",
        type: [ChatMessageDto],
        required: false
    })
    messages?: ChatMessageDto[];
}


