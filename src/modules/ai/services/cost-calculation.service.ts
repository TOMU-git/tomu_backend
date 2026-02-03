import { Injectable, Logger } from "@nestjs/common";

/**
 * CostCalculationService
 * -------------------------------------------------------
 * Maqsad: OpenAI API cost'larini hisoblash.
 * 
 * Pricing asosida har bir servis (GPT, Whisper, TTS) uchun
 * cost hisoblash va umumiy cost'ni qaytarish.
 * 
 * Pricing source: https://openai.com/pricing (2024)
 * 
 * Environment variables:
 *  - GPT_4O_INPUT_PRICE: GPT-5 input tokens uchun ($ per 1K tokens)
 *  - GPT_4O_OUTPUT_PRICE: GPT-5 output tokens uchun ($ per 1K tokens)
 *  - WHISPER_PRICE_PER_MIN: Whisper uchun ($ per minute)
 *  - TTS_HD_PRICE_PER_1K_CHARS: TTS-1-HD uchun ($ per 1K characters)
 *  - GPT_MODEL: Ishlatilayotgan GPT model (default: gpt-5)
 *  - TTS_MODEL: Ishlatilayotgan TTS model (default: tts-1-hd)
 */

// OpenAI Pricing (2024) - Default qiymatlar
// Agar env variable'lar bo'lmasa, bu qiymatlar ishlatiladi

interface GPTPricing {
    input: number;
    output: number;
}

interface TTSPricing {
    per1KChars: number;
}

interface WhisperPricing {
    perMinute: number;
}

const GPT_PRICING: Record<string, GPTPricing> = {
    "gpt-5": {
        input: 0.0025,   // $ per 1K input tokens
        output: 0.01,    // $ per 1K output tokens
    },
    "gpt-4o": {
        input: 0.0025,   // $ per 1K input tokens
        output: 0.01,    // $ per 1K output tokens
    },
    "gpt-4": {
        input: 0.03,
        output: 0.06,
    },
    "gpt-3.5-turbo": {
        input: 0.0005,
        output: 0.0015,
    },
} as const;

const WHISPER_PRICING: WhisperPricing = {
    perMinute: 0.006, // $ per minute
};

const TTS_PRICING: Record<string, TTSPricing> = {
    "tts-1-hd": {
        per1KChars: 0.03, // $ per 1K characters
    },
    "tts-1": {
        per1KChars: 0.015,
    },
} as const;

@Injectable()
export class CostCalculationService {
    private readonly logger = new Logger(CostCalculationService.name);

    // Pricing configuration - environment'dan o'qiladi yoki default qiymatlar
    private readonly gptInputPrice: number;
    private readonly gptOutputPrice: number;
    private readonly whisperPricePerMin: number;
    private readonly ttsPricePer1KChars: number;
    private readonly gptModel: string;
    private readonly ttsModel: string;

    constructor() {
        // GPT pricing - model bo'yicha
        this.gptModel = process.env.GPT_MODEL || "gpt-4o";
        const gptPricing = GPT_PRICING[this.gptModel] || GPT_PRICING["gpt-4o"];

        this.gptInputPrice = Number(process.env.GPT_4O_INPUT_PRICE) || gptPricing.input;
        this.gptOutputPrice = Number(process.env.GPT_4O_OUTPUT_PRICE) || gptPricing.output;

        // Whisper pricing
        this.whisperPricePerMin = Number(process.env.WHISPER_PRICE_PER_MIN) || WHISPER_PRICING.perMinute;

        // TTS pricing - model bo'yicha
        this.ttsModel = process.env.TTS_MODEL || "tts-1-hd";
        const ttsPricing = TTS_PRICING[this.ttsModel] || TTS_PRICING["tts-1-hd"];
        this.ttsPricePer1KChars = Number(process.env.TTS_HD_PRICE_PER_1K_CHARS) || ttsPricing.per1KChars;

        // Log pricing configuration
        this.logger.log(`💰 Cost Calculation Service initialized:`);
        this.logger.log(`   GPT Model: ${this.gptModel}`);
        this.logger.log(`   GPT Input: $${this.gptInputPrice}/1K tokens`);
        this.logger.log(`   GPT Output: $${this.gptOutputPrice}/1K tokens`);
        this.logger.log(`   Whisper: $${this.whisperPricePerMin}/minute`);
        this.logger.log(`   TTS Model: ${this.ttsModel}`);
        this.logger.log(`   TTS: $${this.ttsPricePer1KChars}/1K characters`);
    }

    /**
     * GPT cost'ni hisoblash
     * @param promptTokens - Input tokens soni
     * @param completionTokens - Output tokens soni
     * @returns Cost (USD)
     */
    calculateGPTCost(promptTokens: number, completionTokens: number): number {
        if (promptTokens < 0 || completionTokens < 0) {
            this.logger.warn(`Invalid token values: prompt=${promptTokens}, completion=${completionTokens}`);
            return 0;
        }

        const inputCost = (promptTokens / 1000) * this.gptInputPrice;
        const outputCost = (completionTokens / 1000) * this.gptOutputPrice;
        const totalCost = inputCost + outputCost;

        return this.roundToSixDecimals(totalCost);
    }

    /**
     * Whisper cost'ni hisoblash
     * @param durationSeconds - Audio davomiyligi (seconds)
     * @returns Cost (USD)
     */
    calculateWhisperCost(durationSeconds: number): number {
        if (durationSeconds < 0) {
            this.logger.warn(`Invalid duration: ${durationSeconds}`);
            return 0;
        }

        const minutes = durationSeconds / 60;
        const cost = minutes * this.whisperPricePerMin;

        return this.roundToSixDecimals(cost);
    }

    /**
     * TTS cost'ni hisoblash
     * @param textLength - Matn uzunligi (characters)
     * @returns Cost (USD)
     */
    calculateTTSCost(textLength: number): number {
        if (textLength < 0) {
            this.logger.warn(`Invalid text length: ${textLength}`);
            return 0;
        }

        const chars1K = textLength / 1000;
        const cost = chars1K * this.ttsPricePer1KChars;

        return this.roundToSixDecimals(cost);
    }

    /**
     * Umumiy cost'ni hisoblash (GPT + Whisper + TTS)
     * @param gptUsage - GPT usage ma'lumotlari
     * @param whisperDuration - Whisper duration (seconds)
     * @param ttsChars - TTS characters
     * @returns Umumiy cost (USD) va breakdown
     */
    calculateTotalCost(params: {
        gptPromptTokens?: number;
        gptCompletionTokens?: number;
        whisperDurationSeconds?: number;
        ttsCharacters?: number;
    }): {
        gptCost: number;
        whisperCost: number;
        ttsCost: number;
        totalCost: number;
    } {
        const gptCost = this.calculateGPTCost(
            params.gptPromptTokens || 0,
            params.gptCompletionTokens || 0
        );

        const whisperCost = this.calculateWhisperCost(
            params.whisperDurationSeconds || 0
        );

        const ttsCost = this.calculateTTSCost(
            params.ttsCharacters || 0
        );

        const totalCost = this.roundToSixDecimals(gptCost + whisperCost + ttsCost);

        return {
            gptCost,
            whisperCost,
            ttsCost,
            totalCost,
        };
    }

    /**
     * Taxminiy cost'ni hisoblash (pre-flight check uchun)
     * Audio buffer asosida taxminiy cost hisoblaydi
     * 
     * @param audioBuffer - Audio buffer (bytes)
     * @returns Taxminiy cost breakdown
     */
    estimateCost(params: {
        audioBufferSize?: number; // bytes
        estimatedWhisperDurationSeconds?: number;
        estimatedResponseLength?: number; // characters
        textLength?: number; // text message uzunligi (characters)
    }): {
        whisperCost: number;
        ttsCost: number;
        gptCost: number;
        totalCost: number;
    } {
        // 1. Whisper cost estimation
        // Text message uchun whisper cost 0 (STT ishlatilmaydi)
        let estimatedWhisperDuration = params.estimatedWhisperDurationSeconds;
        if (params.textLength) {
            // Text message - whisper cost 0
            estimatedWhisperDuration = 0;
        } else if (!estimatedWhisperDuration && params.audioBufferSize) {
            // Audio buffer size'dan taxminiy duration hisoblash
            // Taxminan: 1MB audio ≈ 1 minute (128kbps)
            const estimatedMB = params.audioBufferSize / (1024 * 1024);
            estimatedWhisperDuration = estimatedMB * 60; // seconds
            // Maximum 60 seconds (1 minute)
            estimatedWhisperDuration = Math.min(estimatedWhisperDuration, 60);
        }
        const whisperCost = this.calculateWhisperCost(estimatedWhisperDuration || 0);

        // 2. TTS cost estimation
        // Taxminiy response length asosida (average Arabic response ~100-200 characters)
        let estimatedTTSSize = params.estimatedResponseLength;
        if (!estimatedTTSSize) {
            // Default: 150 characters (average Arabic response)
            estimatedTTSSize = 150;
        }
        const ttsCost = this.calculateTTSCost(estimatedTTSSize);

        // 3. GPT cost estimation
        // Text message uchun prompt tokens textLength asosida hisoblanadi
        let estimatedPromptTokens = 1000; // Default
        if (params.textLength) {
            // Taxminiy: 1 character ≈ 0.25 token (Arabic uchun)
            estimatedPromptTokens = Math.ceil(params.textLength * 0.25) + 500; // +500 context uchun
        }
        const estimatedCompletionTokens = 200; // Average response
        const gptCost = this.calculateGPTCost(estimatedPromptTokens, estimatedCompletionTokens);

        const totalCost = this.roundToSixDecimals(whisperCost + ttsCost + gptCost);

        return {
            whisperCost,
            ttsCost,
            gptCost,
            totalCost,
        };
    }

    /**
     * Cost'ni 6 o'nlik xonaga yaxlitlash (database precision uchun)
     */
    private roundToSixDecimals(value: number): number {
        return Math.round(value * 1000000) / 1000000;
    }
}

