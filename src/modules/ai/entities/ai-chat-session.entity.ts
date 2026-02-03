import { BaseEntity } from "src/common/database/baseEntity";
import { User } from "src/modules/user/entities/user.entity";
import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from "typeorm";
import { AIChatMessage } from "./ai-chat-message.entity";

/**
 * AIChatSession
 * -------------------------------------------------------
 * Maqsad:
 *  - Foydalanuvchi bilan AI o‘rtasidagi muloqotni sessiya ko‘rinishida saqlaydi.
 *  - Sessiya tilini, kurs kontekstini va faoliyat vaqtini ko‘rsatadi.
 *  - Chat tarixini (AIChatMessage) bog‘laydi va resume qilishni osonlashtiradi.
 *
 * Asosiy maydonlar:
 *  - userId: Sessiya kimga tegishli (foreign key -> User).
 *  - courseId: Muloqot qaysi kurs kontekstida (ixtiyoriy).
 *  - sessionLanguage: Sessiyadagi aloqa tili.
 *  - sessionTitle: UX uchun sarlavha.
 *  - isActive, lastActivityAt: Sessiya holati va time management.
 *
 * Bog‘lanishlar:
 *  - ManyToOne(User): Sessiya egasi.
 *  - OneToMany(AIChatMessage): Sessiyaga tegishli xabarlar tarixi.
 */
@Entity("ai_chat_sessions")
export class AIChatSession extends BaseEntity {
    // Foydalanuvchining ID si (sessiya kimga tegishli ekanini bildiradi)
    @Column({ type: "int", name: "user_id", nullable: false })
    userId: number;

    // Sessiya qaysi kursga tegishli (ixtiyoriy, umumiy suhbat bo'lishi ham mumkin)
    @Column({ type: "int", name: "course_id", nullable: true })
    courseId: number;

    // Sessiyada ishlatiladigan til (masalan: 'english', 'uzbek')
    @Column({ type: "varchar", length: 50, name: "session_language" })
    sessionLanguage: string;

    // Sessiya nomi/sarlavhasi (ixtiyoriy, UX uchun)
    @Column({ type: "varchar", length: 255, name: "session_title", nullable: true })
    sessionTitle: string;

    // Sessiya faolmi yoki yopilganmi
    @Column({ type: "boolean", name: "is_active", default: true })
    isActive: boolean;

    // Oxirgi faoliyat vaqti (resume qilish uchun qulay)
    @Column({ type: "timestamp", name: "last_activity_at", nullable: true })
    lastActivityAt: Date;

    // Foydalanuvchi bilan bog'lanish (User jadvali bilan foreign key)
    @ManyToOne(() => User, (user) => user.id, { onDelete: "CASCADE" })
    @JoinColumn({ name: "user_id" })
    user: User;

    // Note: messages relation olib tashlandi
    // Xabarlar repository'da findBySessionId() orqali olinadi
    // Bu TypeORM relation conflict'larini oldini oladi
    messages?: AIChatMessage[];
}


