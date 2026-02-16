/**
 * Retry Helper with Exponential Backoff
 * 
 * Telegram API call'lari fail bo'lganda avtomatik retry qiladi.
 */

export interface RetryOptions {
    maxRetries?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    backoffMultiplier?: number;
    retryableErrors?: string[]; // Qaysi errorlarda retry qilish
}

export class RetryHelper {
    /**
     * Exponential backoff bilan retry qilish
     */
    static async withRetry<T>(
        operation: () => Promise<T>,
        options: RetryOptions = {}
    ): Promise<T> {
        const {
            maxRetries = 3,
            initialDelayMs = 1000,
            maxDelayMs = 10000,
            backoffMultiplier = 2,
            retryableErrors = ['ETELEGRAM', 'ETIMEDOUT', 'ECONNRESET', 'Network'],
        } = options;

        let lastError: Error;
        let delay = initialDelayMs;

        for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error;

                // Oxirgi attempt bo'lsa, throw qilish
                if (attempt > maxRetries) {
                    throw error;
                }

                // Retry qilish mumkinmi tekshirish
                const isRetryable = retryableErrors.some(err =>
                    error.message?.includes(err) || error.code?.includes(err)
                );

                if (!isRetryable) {
                    throw error; // Retry qilmaslik kerak bo'lgan error
                }

                console.warn(
                    `[RetryHelper] Attempt ${attempt}/${maxRetries} failed: ${error.message}. ` +
                    `Retrying in ${delay}ms...`
                );

                // Exponential backoff wait
                await this.sleep(delay);

                // Keyingi delay'ni hisoblash
                delay = Math.min(delay * backoffMultiplier, maxDelayMs);
            }
        }

        throw lastError;
    }

    /**
     * Sleep helper
     */
    private static sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Specific Telegram retry wrapper
     */
    static async retryTelegramCall<T>(
        operation: () => Promise<T>,
        operationName: string
    ): Promise<T> {
        console.log(`[Telegram] Executing: ${operationName}`);

        return this.withRetry(operation, {
            maxRetries: 3,
            initialDelayMs: 500,
            maxDelayMs: 5000,
            backoffMultiplier: 2,
            retryableErrors: [
                'ETELEGRAM',
                'ETIMEDOUT',
                'ECONNRESET',
                'ECONNREFUSED',
                'Network',
                'timeout',
                '429', // Rate limit
                '500', // Internal server error
                '502', // Bad gateway
                '503', // Service unavailable
            ],
        });
    }
}
