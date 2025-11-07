/**
 * AI Module Exceptions - Barrel Export
 * -------------------------------------------------------
 * Centralized export for all exception classes
 */

// Base exception
export * from './ai-exception.base';

// Specific exceptions
export * from './limit-exceeded.exception';
export * from './payment-required.exception';
export * from './subscription-expired.exception';
export * from './invalid-session.exception';
export * from './invalid-audio.exception';
export * from './ai-service-unavailable.exception';
export * from './rate-limit.exception';
export * from './audio-not-recognized.exception';

// Legacy exports (deprecated, will be removed)
export * from './session-forbidden.exception';



