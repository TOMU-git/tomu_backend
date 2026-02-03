import { Injectable, Logger } from "@nestjs/common";

/**
 * RetryHelperService
 * -------------------------------------------------------
 * Exponential backoff bilan retry logic
 * Best practice: OpenAI API va boshqa external API calls uchun
 */
@Injectable()
export class RetryHelperService {
    private readonly logger = new Logger(RetryHelperService.name);

    private readonly DEFAULT_MAX_RETRIES = 3;
    private readonly DEFAULT_INITIAL_DELAY = 1000; // 1 second
    private readonly DEFAULT_MAX_DELAY = 10000; // 10 seconds
    private readonly DEFAULT_MULTIPLIER = 2; // exponential backoff

    /**
     * Retriable error types - qaytadan urinib ko'rish mumkin bo'lgan xatolar
     */
    private readonly RETRIABLE_STATUS_CODES = [
        429, // Rate limit
        500, // Internal server error
        502, // Bad gateway
        503, // Service unavailable
        504, // Gateway timeout
    ];

    /**
     * Execute function with exponential backoff retry
     * @param fn - Function to execute
     * @param options - Retry configuration
     * @returns Result of function execution
     */
    async executeWithRetry<T>(
        fn: () => Promise<T>,
        options?: {
            maxRetries?: number;
            initialDelay?: number;
            maxDelay?: number;
            multiplier?: number;
            onRetry?: (attempt: number, error: any) => void;
        }
    ): Promise<T> {
        const maxRetries = options?.maxRetries ?? this.DEFAULT_MAX_RETRIES;
        const initialDelay = options?.initialDelay ?? this.DEFAULT_INITIAL_DELAY;
        const maxDelay = options?.maxDelay ?? this.DEFAULT_MAX_DELAY;
        const multiplier = options?.multiplier ?? this.DEFAULT_MULTIPLIER;

        let lastError: any;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                return await fn();
            } catch (error: any) {
                lastError = error;

                // Agar retriable error bo'lmasa, darhol throw qil
                if (!this.isRetriableError(error)) {
                    this.logger.warn(
                        `Non-retriable error on attempt ${attempt + 1}: ${error.message}`
                    );

                    // Log response data if available for debugging
                    if (error.response?.data) {
                        this.logger.warn(
                            `Non-retriable error response data: ${JSON.stringify(error.response.data, null, 2)}`
                        );
                    }
                    if (error.response?.status) {
                        this.logger.warn(
                            `Non-retriable error status: ${error.response.status}`
                        );
                    }

                    throw error;
                }

                // Agar max retries ga yetib kelgan bo'lsa, throw qil
                if (attempt >= maxRetries) {
                    this.logger.error(
                        `Max retries (${maxRetries}) exceeded. Last error: ${error.message}`
                    );
                    throw error;
                }

                // Exponential backoff delay
                const delay = Math.min(
                    initialDelay * Math.pow(multiplier, attempt),
                    maxDelay
                );

                // Retry callback
                if (options?.onRetry) {
                    options.onRetry(attempt + 1, error);
                }

                this.logger.warn(
                    `Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms. Error: ${error.message}`
                );

                // Wait before retry
                await this.sleep(delay);
            }
        }

        // Bu holatga kelmasligi kerak, lekin type safety uchun
        throw lastError || new Error("Unknown error in retry logic");
    }

    /**
     * Error retriable ekanligini tekshirish
     */
    private isRetriableError(error: any): boolean {
        // Network errors (timeout, connection)
        if (error.code === "ECONNRESET" || error.code === "ETIMEDOUT" || error.code === "ENOTFOUND") {
            return true;
        }

        // HTTP status codes
        if (error.response?.status) {
            return this.RETRIABLE_STATUS_CODES.includes(error.response.status);
        }

        // OpenAI API specific errors
        if (error.response?.data?.error?.code) {
            const code = error.response.data.error.code;
            // Rate limit errors
            if (code === "rate_limit_exceeded" || code === "insufficient_quota") {
                return true;
            }
            // Server errors
            if (code === "server_error" || code === "overloaded") {
                return true;
            }
        }

        // Default: retriable emas (client errors, validation errors, etc.)
        return false;
    }

    /**
     * Sleep utility
     */
    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}


