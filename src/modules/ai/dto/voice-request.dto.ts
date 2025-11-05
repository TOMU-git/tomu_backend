import { IsNumber, IsOptional, IsString } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

/**
 * VoiceRequestDto
 * -------------------------------------------------------
 * Voice chat so'rovi uchun DTO (metadata qismi, audio fayl alohida keladi).
 * Faqat ovoz orqali muloqot uchun.
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
}


