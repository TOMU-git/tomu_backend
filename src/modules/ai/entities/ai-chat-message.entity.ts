import { BaseEntity } from "src/common/database/baseEntity";
import { Column, Entity } from "typeorm";

/**
 * AIChatMessage
 * -------------------------------------------------------
 * Maqsad: AI chat xabarlarini saqlash
 * 
 * Asosiy maydonlar:
 *  - sessionId: Qaysi sessiyaga tegishliligi (REAL COLUMN, faqat number)
 *  - senderType: Xabar yuboruvchisi ('user' yoki 'ai')
 *  - aiResponseText, aiResponseUzbek: Matn tarkiblari
 *  - audioUrl: TTS audio fayl URL
 *  - isWithinLimit: 7-modul limitiga rioya qilinganmi
 */
@Entity("ai_chat_messages")
export class AIChatMessage extends BaseEntity {
    // Session ID - REAL COLUMN (faqat number, relation YO'Q!)
    @Column({ type: "int", name: "session_id", nullable: true })
    sessionId: number;

    // Xabar yuboruvchisi (foydalanuvchi yoki AI)
    @Column({ type: "enum", enum: ["user", "ai"], name: "sender_type" })
    senderType: "user" | "ai";

    // Foydalanuvchining asl matni (agar voice bo'lsa — STT natijasi)
    @Column({ type: "text", name: "original_text", nullable: true })
    originalText: string;

    // AI ning javobi (asl tilida)
    @Column({ type: "text", name: "ai_response_text", nullable: true })
    aiResponseText: string;

    // AI javobining o'zbek tilidagi tarjimasi
    @Column({ type: "text", name: "ai_response_uzbek", nullable: true })
    aiResponseUzbek: string;

    // AI tomonidan yaratilgan audio javob faylining URL manzili
    @Column({ type: "varchar", length: 500, name: "audio_url", nullable: true })
    audioUrl: string;

    // Audio davomiyligi (soniyalarda)
    // User message: user yuborgan audio duration
    // AI message: AI TTS audio duration
    @Column({ type: "float", name: "audio_duration", nullable: true })
    audioDuration: number;

    // Ushbu javob 7-modul chegarasi ichida bo'ldimi-yo'qmi
    @Column({ type: "boolean", name: "is_within_limit", default: true })
    isWithinLimit: boolean;
}
