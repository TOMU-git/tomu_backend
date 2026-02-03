import { HttpException } from '@nestjs/common';
import { AIErrorCode } from '../constants/error-codes.enum';
import { AI_ERROR_MESSAGES } from '../constants/error-messages.constant';

/**
 * AI moduli barcha exceptionlar uchun asosiy klass
 * 
 * Eng yaxshi amaliyot: Domain exceptionlar uchun bitta inheritance ierarxiyasi
 * 
 * Afzalliklari:
 * - Bir xil xato javob strukturi
 * - Markazlashtirilgan xato konfiguratsiyasi
 * - Filterlarda oson tutish va boshqarish
 * - Type-safe xato kodlari
 */
export abstract class AIException extends HttpException {
    public readonly errorCode: AIErrorCode; // Xato kodi
    public readonly retryable: boolean; // Qayta urinish mumkinmi
    public readonly action: string; // Foydalanuvchi uchun tavsiya (qanday harakat qilish)
    public readonly timestamp: string; // Xato vaqti
    public readonly details?: any; // Logging uchun texnik tafsilotlar

    constructor(
        errorCode: AIErrorCode,
        details?: any,
    ) {
        // Xato konfiguratsiyasini olish
        const errorConfig = AI_ERROR_MESSAGES[errorCode];

        // HttpException ni chaqirish (NestJS standart xato formati)
        super(
            {
                message: errorConfig.message,
                statusCode: errorConfig.httpStatus,
                data: [],
            },
            errorConfig.httpStatus,
        );

        // Xato xususiyatlarini o'rnatish
        this.errorCode = errorCode;
        this.retryable = errorConfig.retryable;
        this.action = errorConfig.action;
        this.timestamp = new Date().toISOString();
        this.details = details;

        // To'g'ri instanceof tekshiruvlari uchun prototype ni o'rnatish
        Object.setPrototypeOf(this, new.target.prototype);
    }

    /**
     * API uchun xato javobini olish
     */
    getErrorResponse() {
        return this.getResponse();
    }

    /**
     * Logging uchun tafsilotlarni olish
     * 
     * Bu metod xatolarni log qilish yoki monitoring uchun ishlatiladi
     */
    getLogDetails() {
        return {
            errorCode: this.errorCode,
            timestamp: this.timestamp,
            retryable: this.retryable,
            action: this.action,
            details: this.details,
            httpStatus: this.getStatus(),
        };
    }
}



