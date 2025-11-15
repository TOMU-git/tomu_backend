import { AIErrorCode } from './error-codes.enum';

/**
 * Error Message Configuration
 * -------------------------------------------------------
 * Defines user-friendly messages, retry behavior, and actions
 */
export interface ErrorMessage {
    code: AIErrorCode;
    message: string;
    retryable: boolean;
    action: string;
    httpStatus: number;
}

/**
 * User-friendly error messages (Uzbek)
 * Best Practice: Separate data from code
 */
export const AI_ERROR_MESSAGES: Record<AIErrorCode, ErrorMessage> = {
    [AIErrorCode.LIMIT_EXCEEDED]: {
        code: AIErrorCode.LIMIT_EXCEEDED,
        message: 'Oylik limitingiz tugagan.',
        retryable: false,
        action: 'wait_or_pay',
        httpStatus: 402, // Payment Required
    },

    [AIErrorCode.PAYMENT_REQUIRED]: {
        code: AIErrorCode.PAYMENT_REQUIRED,
        message: 'Bu kurs sotib olinmagan. Iltimos, kursni sotib oling.',
        retryable: false,
        action: 'purchase_course',
        httpStatus: 402,
    },

    [AIErrorCode.SUBSCRIPTION_EXPIRED]: {
        code: AIErrorCode.SUBSCRIPTION_EXPIRED,
        message: 'Obunangiz muddati tugagan. Iltimos, obunangizni yangilang.',
        retryable: false,
        action: 'renew_subscription',
        httpStatus: 402,
    },

    [AIErrorCode.INVALID_SESSION]: {
        code: AIErrorCode.INVALID_SESSION,
        message: 'Sessiya topilmadi yoki ruxsat yo\'q. Yangi sessiya yarating.',
        retryable: false,
        action: 'create_new_session',
        httpStatus: 400, // Bad Request
    },

    [AIErrorCode.INVALID_AUDIO]: {
        code: AIErrorCode.INVALID_AUDIO,
        message: 'Audio fayl noto\'g\'ri. MP3, WAV yoki WebM formatida (max: 25MB) yuboring.',
        retryable: false,
        action: 'upload_valid_audio',
        httpStatus: 400,
    },

    [AIErrorCode.AI_SERVICE_ERROR]: {
        code: AIErrorCode.AI_SERVICE_ERROR,
        message: 'AI xizmati vaqtincha ishlamayapti. Iltimos, bir necha daqiqa kutib, qayta urinib ko\'ring.',
        retryable: true,
        action: 'retry_later',
        httpStatus: 503, // Service Unavailable
    },

    [AIErrorCode.RATE_LIMIT_EXCEEDED]: {
        code: AIErrorCode.RATE_LIMIT_EXCEEDED,
        message: 'Juda ko\'p so\'rov yubordingiz. Iltimos, 1-2 daqiqa kutib turing.',
        retryable: true,
        action: 'wait_retry',
        httpStatus: 429, // Too Many Requests
    },

    [AIErrorCode.AUDIO_NOT_RECOGNIZED]: {
        code: AIErrorCode.AUDIO_NOT_RECOGNIZED,
        message: 'Audio tanib bo\'lmadi. Iltimos, ravshanroq va balandroq gapiring.',
        retryable: true,
        action: 'retry_audio',
        httpStatus: 400,
    },

    [AIErrorCode.NETWORK_ERROR]: {
        code: AIErrorCode.NETWORK_ERROR,
        message: 'Internetga ulanib bo\'lmadi. Internet aloqangizni tekshiring.',
        retryable: true,
        action: 'check_connection',
        httpStatus: 503,
    },

    [AIErrorCode.SERVER_ERROR]: {
        code: AIErrorCode.SERVER_ERROR,
        message: 'Serverda xatolik yuz berdi. Iltimos, qayta urinib ko\'ring.',
        retryable: true,
        action: 'retry',
        httpStatus: 500, // Internal Server Error
    },
};



