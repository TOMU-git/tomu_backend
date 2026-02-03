import { ForbiddenException } from "@nestjs/common";

/**
 * Sessiyaga ruxsat yo'q xatosi
 * 
 * Foydalanuvchi sessiya egasi bo'lmaganda tashlanadi
 * Eslatma: Bu exception deprecated, InvalidSessionException ishlatiladi
 */
export class SessionForbiddenException extends ForbiddenException {
    constructor(message: string = "Sessiyaga ruxsat yo'q") {
        super(message);
    }
}


