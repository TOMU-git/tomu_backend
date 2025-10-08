import { Logger } from "@nestjs/common";
import { config } from "src/common/config";

/**
 * AI Repository lari uchun base class
 * Production-optimized logging bilan
 */
export abstract class BaseAIRepository {
    protected readonly logger: Logger;
    protected readonly isDebugMode: boolean;
    protected readonly isDevelopment: boolean;

    constructor(loggerName: string) {
        this.logger = new Logger(loggerName);
        this.isDevelopment = config.isDevelopment;
        this.isDebugMode = config.logLevel === 'debug';
    }

    /**
     * Debug log - faqat development va debug mode da
     * @param message - Log xabari
     * @param context - Qo'shimcha ma'lumot
     */
    protected debugLog(message: string, context?: any): void {
        if (this.isDebugMode) {
            this.logger.log(message, context);
        }
    }

    /**
     * Info log - faqat development da
     * @param message - Log xabari
     * @param context - Qo'shimcha ma'lumot
     */
    protected infoLog(message: string, context?: any): void {
        if (this.isDevelopment) {
            this.logger.log(message, context);
        }
    }

    /**
     * Warning log - har doim
     * @param message - Log xabari
     * @param context - Qo'shimcha ma'lumot
     */
    protected warnLog(message: string, context?: any): void {
        this.logger.warn(message, context);
    }

    /**
     * Error log - har doim
     * @param message - Log xabari
     * @param context - Qo'shimcha ma'lumot
     */
    protected errorLog(message: string, context?: any): void {
        this.logger.error(message, context);
    }

    /**
     * Performance-optimized log - faqat muhim operatsiyalar uchun
     * @param operation - Operatsiya nomi
     * @param id - Entity ID
     * @param startTime - Boshlanish vaqti
     */
    protected performanceLog(operation: string, id: any, startTime?: number): void {
        if (this.isDebugMode) {
            const duration = startTime ? Date.now() - startTime : 0;
            this.logger.log(`${operation} ${id}${duration ? ` (${duration}ms)` : ''}`);
        }
    }
}
