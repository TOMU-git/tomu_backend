/**
 * AI Module Error Codes
 * -------------------------------------------------------
 * Convention: CATEGORY_SPECIFIC_ERROR
 * 
 * Categories:
 * - User/Business Logic Errors (4xx pattern)
 * - External Service Errors (5xx pattern)
 * - Infrastructure Errors (5xx pattern)
 */
export enum AIErrorCode {
  // User/Business Logic Errors
  LIMIT_EXCEEDED = 'LIMIT_EXCEEDED',
  PAYMENT_REQUIRED = 'PAYMENT_REQUIRED',
  SUBSCRIPTION_EXPIRED = 'SUBSCRIPTION_EXPIRED',
  INVALID_SESSION = 'INVALID_SESSION',
  INVALID_AUDIO = 'INVALID_AUDIO',

  // External Service Errors
  AI_SERVICE_ERROR = 'AI_SERVICE_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  AUDIO_NOT_RECOGNIZED = 'AUDIO_NOT_RECOGNIZED',

  // Infrastructure Errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
}

