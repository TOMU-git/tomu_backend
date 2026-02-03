import { Injectable } from "@nestjs/common";
import { MaterialFollowUpService, FollowUpQuestion } from "./material-followup.service";
import { AIFollowUpService } from "./ai-followup.service";
import { MaterialSequentialFollowUpService } from "./material-sequential-followup.service";
import { UserLastMessageFollowUpService } from "./user-last-message-followup.service";
import { TranslationService } from "../../translation.service";

/**
 * Hybrid Follow-up Service
 * 
 * YANGI LOGIKA: User oxirgi gapiga fokus, keyin tarix, keyin AI fallback
 * 
 * Strategiya (ustuvorlik tartibi):
 * 1. MaterialSequentialFollowUpService - material ketma-ketlik (BIRINCHI USTUVORLIK, 95% confidence)
 * 2. UserLastMessageFollowUpService - user oxirgi gapidan entity (IKKINCHI USTUVORLIK, 92% confidence)
 * 3. MaterialFollowUpService - oxirgi 2 xabardan entity (UCHINCHI USTUVORLIK, 88% confidence)
 * 4. AIFollowUpService - AI generic fallback (TO'RTINCHI USTUVORLIK, 80% confidence)
 * 
 * Avzalliklari:
 * - Material dialogue ketma-ketligini saqlash (95%)
 * - User hozirgi gapiga aniq javob (92%)
 * - Yaqin tarix context (88%)
 * - Har doim savol berish (80% fallback)
 * - Tez va samarali (1-2 xabar tahlil, 5 emas)
 */

export interface HybridFollowUpResult {
    question: string;
    questionUz: string;
    source: 'material' | 'ai' | 'pattern';
    confidence: number;
    method: 'material-sequential' | 'user-last-message' | 'recent-history' | 'ai-generated';
}

@Injectable()
export class HybridFollowUpService {
    // Minimum confidence threshold
    private readonly MIN_CONFIDENCE = 0.6;

    constructor(
        private readonly materialFollowUp: MaterialFollowUpService,
        private readonly aiFollowUp: AIFollowUpService,
        private readonly materialSequentialFollowUp: MaterialSequentialFollowUpService,
        private readonly userLastMessageFollowUp: UserLastMessageFollowUpService,
        private readonly translation: TranslationService
    ) { }

    /**
     * Hybrid follow-up savol yaratish
     * 
     * @param currentResponse - Hozirgi AI javobi (materialdan)
     * @param conversationHistory - Suhbat tarixi
     * @param context - Dars materiallari
     * @param lastWatchedLessonOrder - Foydalanuvchi progress
     * @param materialMatch - Material match ma'lumotlari (optional, sequential uchun)
     * @returns Follow-up savol yoki null
     */
    async generateFollowUp(
        currentResponse: string,
        conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
        context: any[],
        lastWatchedLessonOrder: number,
        materialMatch?: {
            nextNextSentence: string | null;
            nextNextTranslationUz: string | null;
            lessonOrder: number | null;
        }
    ): Promise<HybridFollowUpResult | null> {
        console.log('🔄 [HybridFollowUp] YANGI LOGIKA: Boshlandi...');

        // Phase 1: Material ketma-ketlik (BIRINCHI USTUVORLIK - 95%)
        if (materialMatch) {
            const sequentialResult = this.materialSequentialFollowUp.findSequentialFollowUp({
                nextSentence: currentResponse,
                nextNextSentence: materialMatch.nextNextSentence,
                nextNextTranslationUz: materialMatch.nextNextTranslationUz,
                lessonOrder: materialMatch.lessonOrder,
            });

            if (sequentialResult && sequentialResult.confidence >= this.MIN_CONFIDENCE) {
                console.log(
                    `✅ [HybridFollowUp] Phase 1: Material ketma-ketlik topildi (confidence: ${sequentialResult.confidence})`,
                );
                return await this.formatResult(sequentialResult, 'material-sequential');
            }
        }

        // Phase 2: User oxirgi gapidan entity (IKKINCHI USTUVORLIK - 92%)
        console.log('🗣️ [HybridFollowUp] Phase 2: User oxirgi gapidan entity qidirish...');
        const userLastMessageResult = this.userLastMessageFollowUp.findFollowUpFromLastMessage(
            conversationHistory,
            context,
            lastWatchedLessonOrder
        );

        if (userLastMessageResult && userLastMessageResult.confidence >= this.MIN_CONFIDENCE) {
            console.log(`✅ [HybridFollowUp] Phase 2: User oxirgi gapidan topildi (confidence: ${userLastMessageResult.confidence})`);
            return await this.formatResult(userLastMessageResult, 'user-last-message');
        }

        // Phase 3: Oxirgi 2 xabardan entity (UCHINCHI USTUVORLIK - 88%)
        console.log('📚 [HybridFollowUp] Phase 3: Oxirgi 2 xabardan entity qidirish...');
        const recentHistoryResult = this.materialFollowUp.findFollowUpFromRecentHistory(
            conversationHistory,
            context,
            lastWatchedLessonOrder,
            2 // Oxirgi 2 xabar
        );

        if (recentHistoryResult && recentHistoryResult.confidence >= this.MIN_CONFIDENCE) {
            console.log(`✅ [HybridFollowUp] Phase 3: Oxirgi 2 xabardan topildi (confidence: ${recentHistoryResult.confidence})`);
            return await this.formatResult(recentHistoryResult, 'recent-history');
        }

        // Phase 4: AI generic fallback O'CHIRILDI (uncontrolled follow-up muammosi)
        // Sabab: AI o'zi yaratgan savol materialdan tashqarida bo'lishi mumkin
        // Faqat material-based follow-up'lar ishlatiladi (Phase 1-3)
        console.log('⚠️  [HybridFollowUp] Phase 4: AI fallback o\'chirilgan (faqat material-based)');

        // Hech narsa topilmadi - bu normal holat
        console.log('ℹ️  [HybridFollowUp] Follow-up topilmadi (faqat material-based qidiruv)');
        return null;
    }

    /**
     * Result'ni format qilish (translate va h.k.)
     */
    private async formatResult(
        followUp: FollowUpQuestion,
        method: 'material-sequential' | 'user-last-message' | 'recent-history' | 'ai-generated'
    ): Promise<HybridFollowUpResult> {
        let questionUz = followUp.questionUz;

        // Agar o'zbek tarjimasi bo'lmasa, tarjima qilish
        if (!questionUz) {
            try {
                questionUz = await this.translation.translateToUzbek(followUp.question);
            } catch (error) {
                console.error(`[HybridFollowUp] Tarjima xatosi: ${error.message}`);
                questionUz = ''; // Fallback
            }
        }

        return {
            question: followUp.question,
            questionUz: questionUz || '',
            source: followUp.source,
            confidence: followUp.confidence,
            method,
        };
    }

    /**
     * Debug va monitoring uchun statistika
     */
    getStats(): {
        totalRequests: number;
        materialSuccess: number;
        aiSuccess: number;
        failed: number;
    } {
        // Bu yerda statslarni track qilish mumkin (keyinchalik implement qilish mumkin)
        return {
            totalRequests: 0,
            materialSuccess: 0,
            aiSuccess: 0,
            failed: 0,
        };
    }
}

