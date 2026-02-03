import { Injectable, BadRequestException } from "@nestjs/common";

export interface GenerateParams {
    prompt: string;
    context: any;
    language: string;
    strict: boolean;
}

export interface GenerateWithUsageParams extends GenerateParams {
    conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
    conversationTopic?: { topic: string | null; keywords: string[] };
}

@Injectable()
export class GPTInputValidatorService {
    /**
     * Validate parameters for generate() method
     */
    validateGenerateParams(params: any): asserts params is GenerateParams {
        if (!params) {
            throw new BadRequestException('Parameters are required');
        }
        if (!params.prompt || typeof params.prompt !== 'string' || params.prompt.trim().length === 0) {
            throw new BadRequestException('Prompt must be a non-empty string');
        }
        if (!params.language || typeof params.language !== 'string') {
            throw new BadRequestException('Language must be a non-empty string');
        }
        if (params.context === null || params.context === undefined) {
            throw new BadRequestException('Context is required');
        }
        if (typeof params.strict !== 'boolean') {
            throw new BadRequestException('Strict must be a boolean value');
        }
    }

    /**
     * Validate parameters for generateWithUsage() method
     */
    validateGenerateWithUsageParams(params: any): asserts params is GenerateWithUsageParams {
        if (!params) {
            throw new BadRequestException('Parameters are required');
        }
        if (!params.prompt || typeof params.prompt !== 'string' || params.prompt.trim().length === 0) {
            throw new BadRequestException('Prompt must be a non-empty string');
        }
        if (!params.language || typeof params.language !== 'string') {
            throw new BadRequestException('Language must be a non-empty string');
        }
        if (params.context === null || params.context === undefined) {
            throw new BadRequestException('Context is required');
        }
        if (typeof params.strict !== 'boolean') {
            throw new BadRequestException('Strict must be a boolean value');
        }
        if (params.conversationHistory !== undefined && !Array.isArray(params.conversationHistory)) {
            throw new BadRequestException('ConversationHistory must be an array if provided');
        }
        if (params.conversationTopic !== undefined) {
            if (typeof params.conversationTopic !== 'object' || params.conversationTopic === null) {
                throw new BadRequestException('ConversationTopic must be an object if provided');
            }
            if (params.conversationTopic.keywords !== undefined && !Array.isArray(params.conversationTopic.keywords)) {
                throw new BadRequestException('ConversationTopic.keywords must be an array if provided');
            }
        }
    }
}

