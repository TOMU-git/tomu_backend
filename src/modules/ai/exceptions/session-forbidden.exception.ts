import { ForbiddenException } from "@nestjs/common";

/**
 * SessionForbiddenException
 * -------------------------------------------------------
 * Maqsad: Foydalanuvchi sessiya egasi bo'lmaganda tashlanadi.
 */
export class SessionForbiddenException extends ForbiddenException {
    constructor(message: string = "Sessiyaga ruxsat yo'q") {
        super(message);
    }
}


