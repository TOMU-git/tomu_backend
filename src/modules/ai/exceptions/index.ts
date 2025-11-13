/**
 * AI moduli exceptionlari - Barrel Export
 * 
 * Barcha exception klasslarini markazlashtirilgan export
 */

// Asosiy exception
export * from './ai-exception.base';

// Maxsus exceptionlar
export * from './limit-exceeded.exception';
export * from './payment-required.exception';
export * from './subscription-expired.exception';
export * from './invalid-session.exception';
export * from './invalid-audio.exception';
export * from './ai-service-unavailable.exception';
export * from './rate-limit.exception';
export * from './audio-not-recognized.exception';

// Legacy exportlar (deprecated, keyinroq olib tashlanadi)
export * from './session-forbidden.exception';



