import { BaseEntity } from "src/common/database/baseEntity";
import { User } from "src/modules/user/entities/user.entity";
import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";

/**
 * UserAIProfile
 * -------------------------------------------------------
 * Maqsad:
 *  - AI tizimi uchun foydalanuvchining shaxsiy sozlamalari va afzalliklarini saqlaydi.
 *  - AI javoblari foydalanuvchining tiliga va o‘rganish ehtiyojlariga mos kelishi uchun kontekst beradi.
 *
 * Asosiy maydonlar:
 *  - userId: Bu profil kimga tegishli ekanini bildiradi (foreign key -> User).
 *  - preferredLanguage: AI bilan muloqot uchun afzal til (masalan: english, uzbek).
 *  - learningGoals, weakAreas: Shaxsiy o‘rganish maqsadlari va kuchsiz tomonlar.
 *  - moduleLimit, useStrictMode: 7-modul limiti va qat’iy rejim siyosati (material-chegarali RAG uchun).
 *
 * Bog‘lanishlar:
 *  - ManyToOne(User): Har bir AI profil bitta foydalanuvchiga tegishli.
 */

@Entity("user_ai_profiles")
export class UserAIProfile extends BaseEntity {
    // Foydalanuvchining ID si (asosiy bog'lanish uchun)
    @Column({ type: "int", name: "user_id", nullable: false })
    userId: number;

    // AI suhbatlari uchun foydalanuvchining afzal tilini saqlaydi (masalan: 'english', 'uzbek')
    @Column({ type: "varchar", length: 50, name: "preferred_language" })
    preferredLanguage: string;

    // Foydalanuvchining AI o'quv maqsadlari (ixtiyoriy, masalan: speaking, grammar)
    @Column({ type: "json", name: "learning_goals", nullable: true })
    learningGoals?: string[];

    // Foydalanuvchining kuchsiz joylari (ixtiyoriy, masalan: pronunciation, tenses)
    @Column({ type: "json", name: "weak_areas", nullable: true })
    weakAreas?: string[];

    // 7-modul limitini belgilash (AI qat'iy rejim uchun)
    @Column({ type: "int", name: "module_limit", default: 7 })
    moduleLimit: number;

    // AI qat'iy rejimda ishlasinmi (true bo'lsa: 7-modulgacha faqat dars materiallari asosida)
    @Column({ type: "boolean", name: "use_strict_mode", default: true })
    useStrictMode: boolean;

    // Foydalanuvchi bilan bog'lanish (User jadvali bilan foreign key)
    @ManyToOne(() => User, (user) => user.id, { onDelete: "CASCADE" })
    @JoinColumn({ name: "user_id" })
    user: User;
}


