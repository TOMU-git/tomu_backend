import { IsBoolean, IsNumber, IsOptional, IsString } from "class-validator";
import { Type } from "class-transformer";

/**
 * VoiceRequestDto
 * -------------------------------------------------------
 * Voice chat so'rovi uchun DTO (metadata qismi, audio fayl alohida keladi).
 * Faqat ovoz orqali muloqot uchun.
 */
export class VoiceRequestDto {
    @Type(() => Number)
    @IsNumber()
    sessionId: number;

    @Type(() => Number)
    @IsOptional()
    @IsNumber()
    courseId?: number;

    @IsOptional()
    @IsString()
    language?: string; // STT tili (masalan: 'ar', 'en'); default: 'ar'
}


