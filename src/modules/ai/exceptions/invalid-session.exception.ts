import { AIException } from './ai-exception.base';
import { AIErrorCode } from '../constants/error-codes.enum';

/**
 * Noto'g'ri sessiya xatosi
 * 
 * Sessiya topilmagan yoki foydalanuvchi unga kirish huquqiga ega emasligida tashlanadi
 * SessionForbiddenException o'rniga ishlatiladi
 */
export class InvalidSessionException extends AIException {
    constructor(details?: {
        sessionId?: number; // Sessiya ID
        userId?: number; // Foydalanuvchi ID
        reason?: 'not_found' | 'forbidden' | 'invalid'; // Xato sababi
    }) {
        super(AIErrorCode.INVALID_SESSION, details);
    }
}



