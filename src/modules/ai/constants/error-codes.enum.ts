/**
 * AI moduli xato kodlari
 * 
 * Xato kodlari kategoriyalari:
 * - Foydalanuvchi/Biznes logika xatolari (4xx pattern)
 * - Tashqi servis xatolari (5xx pattern)
 * - Infratuzilma xatolari (5xx pattern)
 */
export enum AIErrorCode {
  // Foydalanuvchi/Biznes logika xatolari
  LIMIT_EXCEEDED = 'LIMIT_EXCEEDED', // Limit oshib ketdi
  PAYMENT_REQUIRED = 'PAYMENT_REQUIRED', // To'lov talab qilinadi
  SUBSCRIPTION_EXPIRED = 'SUBSCRIPTION_EXPIRED', // Obuna muddati tugagan
  INVALID_SESSION = 'INVALID_SESSION', // Noto'g'ri yoki yaroqsiz sessiya
  INVALID_AUDIO = 'INVALID_AUDIO', // Noto'g'ri audio format

  // Tashqi servis xatolari
  AI_SERVICE_ERROR = 'AI_SERVICE_ERROR', // AI servisi xatosi
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED', // So'rovlar tezligi limiti oshib ketdi
  AUDIO_NOT_RECOGNIZED = 'AUDIO_NOT_RECOGNIZED', // Audio tani olindi (STT xatosi)

  // Infratuzilma xatolari
  NETWORK_ERROR = 'NETWORK_ERROR', // Tarmoq xatosi
  SERVER_ERROR = 'SERVER_ERROR', // Server xatosi
}

