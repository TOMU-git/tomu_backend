import { BadRequestException } from "@nestjs/common";

/**
 * LimitExceededException
 * -------------------------------------------------------
 * Maqsad: Kontekst yoki siyosat limitlari buzilganda tashlanadi.
 */
export class LimitExceededException extends BadRequestException {
    constructor(message: string = "Limit buzildi") {
        super(message);
    }
}


