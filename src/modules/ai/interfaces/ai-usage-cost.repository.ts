import { AIUsageCost } from "../entities/ai-usage-cost.entity";
import { ID } from "src/common/types/type";

/**
 * IAIUsageCostRepository
 * -------------------------------------------------------
 * Maqsad: AI usage cost tracking uchun repository interface.
 * 
 * Asosiy metodlar:
 *  - create: Yangi cost record yaratish
 *  - sumMonthlyByUser: Foydalanuvchi uchun oylik umumiy cost
 *  - findByUserAndMonth: Foydalanuvchi va oy bo'yicha barcha recordlar
 *  - findByUserId: Foydalanuvchi uchun barcha cost recordlar (tarix)
 */
export interface IAIUsageCostRepository {
    /**
     * Yangi cost record yaratish
     */
    create(entity: AIUsageCost): Promise<AIUsageCost>;

    /**
     * Foydalanuvchi uchun oylik umumiy cost'ni hisoblash
     * @param userId Foydalanuvchi ID
     * @param month Oylik ("2024-01" formatida)
     * @returns Umumiy cost (USD)
     */
    sumMonthlyByUser(userId: ID, month: string): Promise<number>;

    /**
     * Foydalanuvchi va oy bo'yicha barcha cost recordlarni olish
     * @param userId Foydalanuvchi ID
     * @param month Oylik ("2024-01" formatida)
     * @returns Cost recordlar ro'yxati
     */
    findByUserAndMonth(userId: ID, month: string): Promise<AIUsageCost[]>;

    /**
     * Foydalanuvchi uchun barcha cost recordlarni olish (tarix)
     * @param userId Foydalanuvchi ID
     * @returns Cost recordlar ro'yxati
     */
    findByUserId(userId: ID): Promise<AIUsageCost[]>;

    /**
     * ID bo'yicha bitta record topish
     */
    findOneById(id: ID): Promise<AIUsageCost | null>;

    /**
     * Barcha recordlarni olish (admin uchun)
     */
    findAll(): Promise<AIUsageCost[]>;
}



