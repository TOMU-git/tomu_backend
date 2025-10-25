import { BaseEntity } from "src/common/database/baseEntity";
import { Column, Entity, JoinColumn, ManyToOne, RelationId } from "typeorm";
import { AIChatSession } from "./ai-chat-session.entity";

/**
 * AIChatMessage
 * -------------------------------------------------------
 * Maqsad:
 *  - AIChatSession ichidagi har bir alohida xabarni saqlaydi.
 *  - Foydalanuvchi matni, AI javobi, tarjima, audio URL va ishlatilgan kontekstni
 *    (RAG) yozib boradi.
 *
 * Asosiy maydonlar:
 *  - sessionId: Qaysi sessiyaga tegishliligi (foreign key -> AIChatSession).
 *  - senderType: Xabar yuboruvchisi ('user' yoki 'ai').
 *  - originalText, aiResponseText, aiResponseUzbek: Matn tarkiblari.
 *  - audioUrl: TTS orqali yaratilgan ovozli javob manzili.
 *  - contextUsed: RAG natijasida ishlatilgan material/bo‘laklar.
 *  - isWithinLimit: 7-modul limitiga rioya qilinganmi.
 *
 * Bog‘lanishlar:
 *  - ManyToOne(AIChatSession): Xabar tegishli sessiyaga ulanadi.
 */
@Entity("ai_chat_messages")
export class AIChatMessage extends BaseEntity {
    // Qaysi sessiyaga tegishli ekanini bildiradi (scalar id @RelationId orqali olinadi)
    @RelationId((m: AIChatMessage) => m.session)
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

    // RAG orqali ishlatilgan kontekst bo'lagi(lar)i (audit va debug uchun)
    @Column({ type: "json", name: "context_used", nullable: true })
    contextUsed: any;

    // Ushbu javob 7-modul chegarasi ichida bo'ldimi-yo'qmi
    @Column({ type: "boolean", name: "is_within_limit", default: true })
    isWithinLimit: boolean;

    // Xabar tili (masalan: 'english', 'uzbek')
    @Column({ type: "varchar", length: 50, name: "message_language", nullable: true })
    messageLanguage: string;

    // Sessiya bilan bog'lanish (foreign key)
    @ManyToOne(() => AIChatSession, (session) => session.messages, { onDelete: "CASCADE" })
    @JoinColumn({ name: "session_id" })
    session: AIChatSession;
}