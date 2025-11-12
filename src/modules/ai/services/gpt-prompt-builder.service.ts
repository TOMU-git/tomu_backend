import { Injectable } from "@nestjs/common";
import {
    SIMPLE_ARABIC_FEW_SHOT_EXAMPLES,
    COMPREHENSIVE_ARABIC_FEW_SHOT_EXAMPLES,
    ARABIC_SYSTEM_PROMPT_RULES,
    CONVERSATION_TOPIC_MAP,
    GPTMessage,
} from "../constants/gpt-examples.constants";

export interface BuildMessagesParams {
    systemPrompt: string;
    contextSummary: string;
    prompt: string;
    language: string;
    conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
    useComprehensiveExamples?: boolean;
    maxHistoryMessages?: number;
}

@Injectable()
export class GPTPromptBuilderService {
    /**
     * Build system prompt for basic generate() method
     */
    buildBasicSystemPrompt(language: string): string {
        if (language === 'ar' || language === 'arabic') {
            return ARABIC_SYSTEM_PROMPT_RULES.basic.join(" ");
        } else {
            return `Siz til o'rgatuvchi yordamchisiz. Javob tilini: ${language}.`;
        }
    }

    /**
     * Build comprehensive system prompt for generateWithUsage() method
     */
    buildComprehensiveSystemPrompt(
        language: string,
        options: {
            conversationNames?: string[];
            conversationTopic?: { topic: string | null; keywords: string[] };
        }
    ): string {
        if (language !== 'ar' && language !== 'arabic') {
            return `Siz til o'rgatuvchi yordamchisiz. Javob tilini: ${language}.`;
        }

        const systemParts: string[] = [];
        systemParts.push(ARABIC_SYSTEM_PROMPT_RULES.comprehensive.introduction);
        systemParts.push("");

        // Subject Matching Rule
        systemParts.push(...ARABIC_SYSTEM_PROMPT_RULES.comprehensive.criticalRules.subjectMatching);
        systemParts.push("");

        // Conversation Context Rule
        systemParts.push(...ARABIC_SYSTEM_PROMPT_RULES.comprehensive.criticalRules.conversationContext);
        
        if (options.conversationNames && options.conversationNames.length > 0) {
            systemParts.push(`- REMEMBER: In this conversation, the user's name is: ${options.conversationNames.join(', ')}`);
            systemParts.push(`- ALWAYS use this name when addressing the user (يَا ${options.conversationNames[0]}...)`);
            systemParts.push(`- NEVER ask for the name again if you already know it from conversation history`);
        }

        // Conversation topic/mavzu haqida context
        if (options.conversationTopic && options.conversationTopic.topic) {
            const topicName = CONVERSATION_TOPIC_MAP[options.conversationTopic.topic] || options.conversationTopic.topic;
            systemParts.push(`- Current conversation topic: ${topicName} (${options.conversationTopic.keywords.slice(0, 3).join(', ')})`);
            systemParts.push("- Respond naturally based on the conversation flow and current topic");
            systemParts.push("- If the topic changes, adapt your responses accordingly");
        }

        systemParts.push(...ARABIC_SYSTEM_PROMPT_RULES.comprehensive.conversationFlow);
        systemParts.push("");
        systemParts.push(...ARABIC_SYSTEM_PROMPT_RULES.comprehensive.otherRules);

        return systemParts.join("\n");
    }

    /**
     * Build messages array for GPT API call
     */
    buildMessages(params: BuildMessagesParams): Array<{ role: string; content: string }> {
        const messages: Array<{ role: string; content: string }> = [
            { role: "system", content: params.systemPrompt },
            { role: "system", content: `Lesson materials${params.useComprehensiveExamples ? '' : ' context'}:\n${params.contextSummary}` },
        ];

        // Add few-shot examples
        if (params.language === 'ar' || params.language === 'arabic') {
            const examples = params.useComprehensiveExamples
                ? COMPREHENSIVE_ARABIC_FEW_SHOT_EXAMPLES
                : SIMPLE_ARABIC_FEW_SHOT_EXAMPLES;
            messages.push(...examples);
        }

        // Add conversation history before current prompt
        if (params.conversationHistory && params.conversationHistory.length > 0) {
            const maxMessages = params.maxHistoryMessages || 10;
            const recentHistory = params.conversationHistory.slice(-maxMessages);
            messages.push(...recentHistory);
        }

        // Current user prompt
        messages.push({ role: "user", content: params.prompt });

        return messages;
    }
}

