import { IsNumber, IsOptional, IsString } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";

/**
 * VoiceRequestDto
 * -------------------------------------------------------
 * Voice chat so'rovi uchun DTO (metadata qismi, audio fayl alohida keladi).
 * Faqat ovoz orqali muloqot uchun.
 */
export class VoiceRequestDto {
    @ApiProperty({
        description: "AI chat sessiya ID",
        type: Number,
        example: 123,
    })
    @Type(() => Number)
    @IsNumber()
    sessionId: number;

    @ApiProperty({
        description: "Kurs ID (ixtiyoriy)",
        type: Number,
        required: false,
        example: 1,
        nullable: true,
    })
    @Type(() => Number)
    @IsOptional()
    @IsNumber()
    courseId?: number;

    @ApiProperty({
        description: "STT uchun til (default: 'ar')",
        type: String,
        required: false,
        example: "ar",
    })
    @IsOptional()
    @IsString()
    language?: string; // STT tili (masalan: 'ar', 'en'); default: 'ar'
}


