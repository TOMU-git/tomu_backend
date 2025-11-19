import { Injectable } from "@nestjs/common";
import { MaterialFollowUpService, FollowUpQuestion } from "./material-followup.service";
import { AIFollowUpService } from "./ai-followup.service";
import { TranslationService } from "../../translation.service";

/**
 * Hybrid Follow-up Service
 * 
 * Gibrid yondashuv: birinchi materialdan, topilmasa AI o'zi (qat'iy qoidalar bilan).
 * 
 * Strategiya:
 * 1. MaterialFollowUpService - materialdan qidirish (PRIORITY)
 * 2. Agar topilmasa → AIFollowUpService - AI o'zi yaratadi (qat'iy qoidalar bilan)
 * 3. Agar AI ham yaratmasa → null (savol bermaslik)
 * 
 * Avzalligi:
 * - Material-based (90%+ confidence) > AI-generated (80% confidence)
 * - Mavzudan chiqish xavfi minimal
 * - Kafolatli context-aware follow-up
 */

export interface HybridFollowUpResult {
    question: string;
    questionUz: string;
    source: 'material' | 'ai' | 'pattern';
    confidence: number;
    method: 'material-exact' | 'material-pattern' | 'ai-generated';
}

@Injectable()
export class HybridFollowUpService {
    // Minimum confidence threshold
    private readonly MIN_CONFIDENCE = 0.6;

    constructor(
        private readonly materialFollowUp: MaterialFollowUpService,
        private readonly aiFollowUp: AIFollowUpService,
        private readonly translation: TranslationService
    ) {}

    /**
     * Hybrid follow-up savol yaratish
     * 
     * @param currentResponse - Hozirgi AI javobi (materialdan)
     * @param conversationHistory - Suhbat tarixi
     * @param context - Dars materiallari
     * @param lastWatchedLessonOrder - Foydalanuvchi progress
     * @returns Follow-up savol yoki null
     */
    async generateFollowUp(
        currentResponse: string,
        conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
        context: any[],
        lastWatchedLessonOrder: number
    ): Promise<HybridFollowUpResult | null> {
        console.log('🔄 [HybridFollowUp] Boshlandi...');

        // Phase 1: Material-based follow-up (PRIORITY)
        console.log('📚 [HybridFollowUp] Phase 1: Materialdan qidirish...');
        const materialResult = this.materialFollowUp.findFollowUp(
            currentResponse,
            conversationHistory,
            context,
            lastWatchedLessonOrder
        );

        if (materialResult && materialResult.confidence >= this.MIN_CONFIDENCE) {
            console.log(`✅ [HybridFollowUp] Material'dan topildi (confidence: ${materialResult.confidence})`);
            return await this.formatResult(materialResult, 'material-exact');
        }

        // Phase 2: AI-generated follow-up (qat'iy qoidalar bilan)
        console.log('🤖 [HybridFollowUp] Phase 2: AI yaratmoqda (qat\'iy qoidalar bilan)...');
        const aiResult = await this.aiFollowUp.generateFollowUp(
            currentResponse,
            conversationHistory,
            context,
            lastWatchedLessonOrder
        );

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
        method: 'material-exact' | 'material-pattern' | 'ai-generated'
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

