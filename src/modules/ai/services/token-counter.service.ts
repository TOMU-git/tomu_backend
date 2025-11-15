import { Injectable, Logger } from "@nestjs/common";
import { encodingForModel, Tiktoken, getEncoding } from "js-tiktoken";

/**
 * TokenCounterService
 * -------------------------------------------------------
 * Token counting va estimation uchun utility service
 * Best practice: Aniq token limit management using tiktoken
 */
@Injectable()
export class TokenCounterService {
    private readonly logger = new Logger(TokenCounterService.name);
    private encoding: Tiktoken | null = null;
    private readonly FALLBACK_CHARS_PER_TOKEN = 3.5; // Fallback uchun

    constructor() {
        try {
            // gpt-5 uchun encoding (cl100k_base)
            this.encoding = encodingForModel("gpt-5");
            this.logger.log("✅ Tiktoken encoding initialized for gpt-5");
        } catch (error) {
            this.logger.warn(`⚠️  Failed to initialize tiktoken: ${error}. Using fallback estimation.`);
            try {
                // Fallback: cl100k_base encoding
                this.encoding = getEncoding("cl100k_base");
                this.logger.log("✅ Tiktoken fallback encoding initialized (cl100k_base)");
            } catch (fallbackError) {
                this.logger.warn(`⚠️  Fallback encoding failed: ${fallbackError}. Using character-based estimation.`);
                this.encoding = null;
            }
        }
    }

    /**
     * Accurate token count using tiktoken
     * @param text - Text to count tokens for
     * @returns Exact token count
     */
    estimateTokens(text: string): number {
        if (!text || text.length === 0) return 0;

        // Use tiktoken if available
        if (this.encoding) {
            try {
                return this.encoding.encode(text).length;
            } catch (error) {
                this.logger.warn(`⚠️  Token encoding error: ${error}. Using fallback.`);
            }
        }

        // Fallback: character-based estimation for Arabic
        return Math.ceil(text.length / this.FALLBACK_CHARS_PER_TOKEN);
    }

    /**
     * Estimate tokens for OpenAI messages array
     * @param messages - Array of {role, content} messages
     * @returns Total estimated tokens
     */
    estimateMessageTokens(messages: Array<{ role: string; content: string }>): number {
        let total = 0;

        // System message overhead: ~4 tokens per message
        const messageOverhead = 4;

        for (const msg of messages) {
            // Role + content + overhead
            const roleTokens = this.estimateTokens(msg.role || "");
            const contentTokens = this.estimateTokens(msg.content || "");
            total += roleTokens + contentTokens + messageOverhead;
        }

        return total;
    }

    /**
     * Truncate text to fit within token limit
     * @param text - Text to truncate
     * @param maxTokens - Maximum tokens allowed
     * @param strategy - Truncation strategy (head, tail, or semantic)
     * @returns Truncated text
     */
    truncateToTokenLimit(
        text: string,
        maxTokens: number,
        strategy: "head" | "tail" = "tail"
    ): string {
        if (!text) return "";

        const estimated = this.estimateTokens(text);
        if (estimated <= maxTokens) return text;

        // Calculate max characters
        const maxChars = Math.floor(maxTokens * this.FALLBACK_CHARS_PER_TOKEN);

        if (strategy === "head") {
            // Keep first part
            return text.slice(0, maxChars) + "...";
        } else {
            // Keep last part (default for context)
            if (text.length <= maxChars) return text;
            return "..." + text.slice(-maxChars);
        }
    }

    /**
     * Calculate token budget for GPT call
     * @param model - Model name (gpt-5, gpt-4o, gpt-4-turbo, etc.)
     * @param systemTokens - Estimated system prompt tokens
     * @param conversationTokens - Estimated conversation history tokens
     * @param completionTokens - Desired completion tokens
     * @returns Available tokens for context
     */
    calculateContextBudget(
        model: string,
        systemTokens: number,
        conversationTokens: number,
        completionTokens: number
    ): number {
        // Model limits (approximate)
        const modelLimits: Record<string, number> = {
            "gpt-5": 8192,
            "gpt-4o": 8192,
            "gpt-4-turbo": 8192,
            "gpt-4": 8192,
            "gpt-3.5-turbo": 4096,
        };

        const modelLimit = modelLimits[model] || 8192;
        const buffer = 100; // Safety buffer

        // Available for context = total - system - conversation - completion - buffer
        const available = modelLimit - systemTokens - conversationTokens - completionTokens - buffer;

        return Math.max(0, available); // Never negative
    }

    /**
     * Validate if messages fit within token limit
     * @param messages - Messages to validate
     * @param model - Model name
     * @param maxCompletionTokens - Max completion tokens
     * @returns Validation result with details
     */
    validateTokenLimit(
        messages: Array<{ role: string; content: string }>,
        model: string,
        maxCompletionTokens: number
    ): {
        isValid: boolean;
        totalTokens: number;
        availableForContext: number;
        exceedsLimit: boolean;
    } {
        const totalTokens = this.estimateMessageTokens(messages);
        const modelLimits: Record<string, number> = {
            "gpt-5": 8192,
            "gpt-4o": 8192,
            "gpt-4-turbo": 8192,
            "gpt-4": 8192,
            "gpt-3.5-turbo": 4096,
        };

        const modelLimit = modelLimits[model] || 8192;
        const maxTotalTokens = modelLimit - maxCompletionTokens - 100; // Buffer

        return {
            isValid: totalTokens <= maxTotalTokens,
            totalTokens,
            availableForContext: Math.max(0, maxTotalTokens - totalTokens),
            exceedsLimit: totalTokens > maxTotalTokens,
        };
    }
}

