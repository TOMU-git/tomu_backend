import { Injectable } from "@nestjs/common";
import { MaterialFollowUpService, FollowUpQuestion } from "./material-followup.service";
import { AIFollowUpService } from "./ai-followup.service";
import { MaterialSequentialFollowUpService } from "./material-sequential-followup.service";
import { TranslationService } from "../../translation.service";

/**
 * Hybrid Follow-up Service
 * 
 * Gibrid yondashuv: birinchi material ketma-ketlik, keyin materialdan, topilmasa AI o'zi.
 * 
 * Strategiya (ustuvorlik tartibi):
 * 0. MaterialSequentialFollowUpService - material ketma-ketlik (BIRINCHI USTUVORLIK, 95% confidence)
 * 1. MaterialFollowUpService - materialdan qidirish (IKKINCHI USTUVORLIK, 90% confidence)
 * 2. Agar topilmasa → AIFollowUpService - AI o'zi yaratadi (UCHINCHI USTUVORLIK, 80% confidence)
 * 3. Agar AI ham yaratmasa → null (savol bermaslik)
 * 
 * Avzalligi:
 * - Material sequential (95% confidence) > Material-based (90% confidence) > AI-generated (80% confidence)
 * - Material dialogue ketma-ketligini saqlash
 * - Mavzudan chiqish xavfi minimal
 * - Kafolatli context-aware follow-up
 */

export interface HybridFollowUpResult {
    question: string;
    questionUz: string;
    source: 'material' | 'ai' | 'pattern';
    confidence: number;
    method: 'material-sequential' | 'material-exact' | 'material-pattern' | 'ai-generated';
}

@Injectable()
export class HybridFollowUpService {
    // Minimum confidence threshold
    private readonly MIN_CONFIDENCE = 0.6;

    constructor(
        private readonly materialFollowUp: MaterialFollowUpService,
        private readonly aiFollowUp: AIFollowUpService,
        private readonly materialSequentialFollowUp: MaterialSequentialFollowUpService,
        private readonly translation: TranslationService
    ) {}

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
        console.log('🔄 [HybridFollowUp] Boshlandi...');

        // Phase 0: Material ketma-ketlik (BIRINCHI USTUVORLIK)
        if (materialMatch) {
            const sequentialResult = this.materialSequentialFollowUp.findSequentialFollowUp({
                nextSentence: currentResponse,
                nextNextSentence: materialMatch.nextNextSentence,
                nextNextTranslationUz: materialMatch.nextNextTranslationUz,
                lessonOrder: materialMatch.lessonOrder,
            });
            
            if (sequentialResult && sequentialResult.confidence >= this.MIN_CONFIDENCE) {
                console.log(
                    `✅ [HybridFollowUp] Material ketma-ketlik topildi (confidence: ${sequentialResult.confidence})`,
                );
                return await this.formatResult(sequentialResult, 'material-sequential');
            }
        }

        // ⚡ OPTIMIZATION: Parallel processing - Material va AI parallel qidirish
        // Bu ikki operatsiya bir-biriga bog'liq emas
        console.log('📚 [HybridFollowUp] Phase 1&2: Material va AI parallel qidirish...');
        
        const [materialResult, aiResult] = await Promise.all([
            // Phase 1: Material-based follow-up
            Promise.resolve(this.materialFollowUp.findFollowUp(
                currentResponse,
                conversationHistory,
                context,
                lastWatchedLessonOrder
            )),
            // Phase 2: AI-generated follow-up (parallel)
            this.aiFollowUp.generateFollowUp(
                currentResponse,
                conversationHistory,
                context,
                lastWatchedLessonOrder
            )
        ]);

        // Phase 1: Material result (ikkinchi ustuvorlik)
        if (materialResult && materialResult.confidence >= this.MIN_CONFIDENCE) {
            console.log(`✅ [HybridFollowUp] Material'dan topildi (confidence: ${materialResult.confidence})`);
            return await this.formatResult(materialResult, 'material-exact');
        }

        // Phase 2: AI result (uchinchi ustuvorlik)
        if (aiResult && aiResult.confidence >= this.MIN_CONFIDENCE) {
            console.log(`✅ [HybridFollowUp] AI yaratdi (confidence: ${aiResult.confidence})`);
            return await this.formatResult(aiResult, 'ai-generated');
        }

        // Phase 3: Topilmadi - savol bermaslik
        console.log('❌ [HybridFollowUp] Follow-up topilmadi yoki confidence past');
        return null;
    }

    /**
     * Result'ni format qilish (translate va h.k.)
     */
    private async formatResult(
        followUp: FollowUpQuestion,
        method: 'material-sequential' | 'material-exact' | 'material-pattern' | 'ai-generated'
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

