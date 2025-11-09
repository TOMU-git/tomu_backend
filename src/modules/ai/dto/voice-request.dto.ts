import { IsNumber, IsOptional, IsString } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

/**
 * VoiceRequestDto
 * -------------------------------------------------------
 * Voice chat so'rovi uchun DTO.
 * Faqat audio fayl qabul qiladi.
 * 
 * Eslatma: courseId va language session'dan avtomatik olinadi (session yaratilganda berilgan).
 */
export class VoiceRequestDto {
    @ApiProperty({
        description: "AI chat sessiya ID (majburiy)",
        type: Number,
        example: 123,
    })
    @Type(() => Number)
    @IsNumber()
    sessionId: number;

    @ApiPropertyOptional({
        description: "History so'rovi (agar 'history' bo'lsa, faqat message'lar qaytariladi, AI ga so'rov yuborilmaydi)",
        type: String,
        example: "history",
    })
    @IsOptional()
    @IsString()
    history?: string;

    // File property - multipart/form-data uchun
    // Bu property ValidationPipe tomonidan ignore qilinadi
    // @UploadedFile() decorator orqali olinadi
    @IsOptional()
    file?: any;
}


