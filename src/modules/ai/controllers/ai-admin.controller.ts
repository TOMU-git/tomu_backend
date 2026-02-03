import { Controller, Get } from "@nestjs/common";

/**
 * AiAdminController
 * -------------------------------------------------------
 * Maqsad: AI moduliga oid admin yordamchi endpointlar.
 */
@Controller('ai/admin')
export class AiAdminController {
    /**
     * Soddalashtirilgan healthcheck
     */
    @Get('health')
    health() {
        return { message: 'ok' };
    }
}