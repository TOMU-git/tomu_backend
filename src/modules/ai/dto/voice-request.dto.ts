import { IsNumber, IsOptional, IsString } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

/**
 * VoiceRequestDto
 * -------------------------------------------------------
 * Voice/Text chat so'rovi uchun DTO.
 * Audio fayl yoki text qabul qiladi.
 * 
 * Eslatma: courseId va language session'dan avtomatik olinadi (session yaratilganda berilgan).
 * Bu parametrlarni yuborish shart emas - session'dan olinadi.
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
        description: "Kurs ID (ixtiyoriy - session'dan olinadi, yuborish shart emas)",
        type: Number,
        example: 1,
        nullable: true,
    })
    @Type(() => Number)
    @IsOptional()
    @IsNumber()
    courseId?: number;

    @ApiPropertyOptional({
        description: "STT uchun til (ixtiyoriy - session'dan olinadi, default: 'ar', yuborish shart emas)",
        type: String,
        example: "ar",
    })
    @IsOptional()
    @IsString()
    language?: string; // STT tili (masalan: 'ar', 'en'); default: 'ar' - session'dan olinadi

    @ApiPropertyOptional({
        description: "Text xabar (ixtiyoriy - agar file bo'lmasa, text yuboriladi)",
        type: String,
        example: "مَا هَٰذَا؟",
    })
    @IsOptional()
    @IsString()
    text?: string;

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


