import { BaseEntity } from "src/common/database/baseEntity";
import { Column, Entity, Index } from "typeorm";

/**
 * AIUsageCost
 * -------------------------------------------------------
 * Maqsad:
 *  - AI servislari (GPT, Whisper, TTS) uchun har bir request'ning
 *    cost'ini saqlash va tracking qilish.
 *  - Oylik limit (2$) tekshiruvi uchun ma'lumotlar bazasi.
 *
 * Asosiy maydonlar:
 *  - userId: Qaysi foydalanuvchi uchun (index qilingan - tez qidiruv uchun).
 *  - sessionId: Qaysi sessiyaga tegishli.
 *  - messageId: Qaysi xabarga tegishli (AIChatMessage.id).
 *  - gptCost, whisperCost, ttsCost: Har bir servis uchun alohida cost.
 *  - totalCost: Umumiy cost (USD).
 *  - gptTokens, whisperDuration, ttsCharacters: Usage ma'lumotlari (audit uchun).
 *  - month: Oylik tracking uchun ("2024-01" formatida, index qilingan).
 *
 * Performance:
 *  - month + userId index: Oylik limit tekshiruvi uchun tez qidiruv.
 *  - userId index: Foydalanuvchi tarixi uchun tez qidiruv.
 */
@Entity("ai_usage_costs")
@Index(["userId", "month"]) // Composite index for monthly cost queries
@Index(["userId"]) // Index for user history queries
@Index(["messageId"], { unique: true }) // Unique index to prevent duplicate records per message
export class AIUsageCost extends BaseEntity {
    // Foydalanuvchi ID (tez qidiruv uchun index qilingan)
    @Column({ type: "int", name: "user_id", nullable: false })
    userId: number;

    // Sessiya ID (qaysi sessiyaga tegishli ekanligini bildiradi)
    @Column({ type: "int", name: "session_id", nullable: false })
    sessionId: number;

    // Xabar ID (qaysi xabarga tegishli ekanligini bildiradi)
    @Column({ type: "int", name: "message_id", nullable: false })
    messageId: number;

    // GPT cost (USD) - GPT API dan foydalanish uchun
    @Column({ type: "decimal", precision: 10, scale: 6, name: "gpt_cost", nullable: false, default: 0 })
    gptCost: number;

    // Whisper cost (USD) - STT (Speech-to-Text) uchun
    @Column({ type: "decimal", precision: 10, scale: 6, name: "whisper_cost", nullable: false, default: 0 })
    whisperCost: number;

    // TTS cost (USD) - Text-to-Speech uchun
    @Column({ type: "decimal", precision: 10, scale: 6, name: "tts_cost", nullable: false, default: 0 })
    ttsCost: number;

    // Umumiy cost (USD) - gptCost + whisperCost + ttsCost
    @Column({ type: "decimal", precision: 10, scale: 6, name: "total_cost", nullable: false, default: 0 })
    totalCost: number;

    // GPT usage ma'lumotlari (audit va debugging uchun)
    @Column({ type: "int", name: "gpt_prompt_tokens", nullable: true })
    gptPromptTokens: number;

    @Column({ type: "int", name: "gpt_completion_tokens", nullable: true })
    gptCompletionTokens: number;

    @Column({ type: "int", name: "gpt_total_tokens", nullable: true })
    gptTotalTokens: number;

    // Whisper usage ma'lumotlari (audit uchun)
    @Column({ type: "decimal", precision: 10, scale: 2, name: "whisper_duration_seconds", nullable: true })
    whisperDurationSeconds: number;

    // TTS usage ma'lumotlari (audit uchun)
    @Column({ type: "int", name: "tts_characters", nullable: true })
    ttsCharacters: number;

    // Oylik tracking uchun ("2024-01" formatida) - index qilingan
    @Column({ type: "varchar", length: 7, name: "month", nullable: false })
    month: string;

    // Qo'shimcha metadata (ixtiyoriy - kelajakda kengaytirish uchun)
    @Column({ type: "json", name: "metadata", nullable: true })
    metadata?: Record<string, any>;
}



