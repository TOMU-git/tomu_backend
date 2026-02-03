import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
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
    conversationEntities?: string; // Entity'lar haqida ma'lumot (formatted string)
}

@Injectable()
export class GPTPromptBuilderService {
    private readonly enableUserEngagement: boolean;

    constructor(private readonly configService: ConfigService) {
        // Environment variable'dan engagement flag'ini o'qish
        // Default: true (engagement yoqilgan)
        // O'chirish uchun: ENABLE_USER_ENGAGEMENT=false
        this.enableUserEngagement = this.configService.get<string>("ENABLE_USER_ENGAGEMENT", "true") === "true";
    }

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
     * Build system prompt for free mode (erkin rejim)
     * Materiallarga havola qilmaydi
     */
    buildFreeModeSystemPrompt(language: string): string {
        if (language === 'ar' || language === 'arabic') {
            return [
                "You are an Arabic language learning assistant for beginners.",
                "RULES:",
                "1. Respond ONLY in Modern Standard Arabic (الفصحى) with FULL diacritical marks (تشكيل) on every letter.",
                "2. Give natural, helpful answers in Arabic - you can use any appropriate vocabulary.",
                "3. Give short, clear answers that directly respond (never echo user's words).",
                "4. For yes/no questions (هَلْ), answer with نَعَمْ or لَا naturally.",
                "5. Response MUST be logically correct and different from user's input.",
                "6. Be friendly and helpful - answer naturally as a native Arabic speaker would.",
                "7. CRITICAL - Question Response Rule:",
                "   - If user asks a question (؟ bilan tugasa yoki هَلْ, مَا, مَنْ, أَيْنَ bilan boshlansa),",
                "     you MUST answer with a STATEMENT (not a question).",
                "   - Example: User: 'مَا هَذَا؟' → You: 'هَذَا بُرْتُقَالٌ' (NOT 'مَا هَذَا؟')",
                "   - Example: User: 'هَلْ هَذَا بَيْتٌ؟' → You: 'نَعَمْ، هَذَا بَيْتٌ' (NOT 'هَلْ هُوَ بَيْتٌ؟')",
                "   - Only ask questions when user gives a STATEMENT (not a question).",
                ...(this.enableUserEngagement ? [
                    "7. CRITICAL - Context-Aware Engagement:",
                    "   - ALWAYS ask follow-up questions that are DIRECTLY RELATED to the current dialogue",
                    "   - If user mentions an object → ask about THAT object (location, ownership, properties)",
                    "   - If user mentions a place → ask about THAT place (what's there, who's there)",
                    "   - If user mentions a person → ask about THAT person (name, location, relationship)",
                    "   - AVOID asking random questions unrelated to the current topic",
                    "   - Pattern: Answer directly + Ask contextually relevant follow-up question",
                ] : []),
            ].join(" ");
        } else {
            return `Siz til o'rgatuvchi yordamchisiz. Javob tilini: ${language}. Erkin rejimda ishlaysiz - materiallarga bog'liq emassiz.`;
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
        
        // Mantiqiy fikrlash va entity tracking qoidalari
        systemParts.push(...ARABIC_SYSTEM_PROMPT_RULES.comprehensive.logicalReasoning);
        systemParts.push("");
        
        // User engagement qoidalari (flag'ga qarab)
        if (this.enableUserEngagement) {
            systemParts.push(...ARABIC_SYSTEM_PROMPT_RULES.comprehensive.userEngagement);
            systemParts.push("");
        }
        
        systemParts.push(...ARABIC_SYSTEM_PROMPT_RULES.comprehensive.otherRules);

        return systemParts.join("\n");
    }

    /**
     * Build messages array for GPT API call
     */
    buildMessages(params: BuildMessagesParams): Array<{ role: string; content: string }> {
        const messages: Array<{ role: string; content: string }> = [
            { role: "system", content: params.systemPrompt },
        ];

        // Context summary'ni faqat bo'sh bo'lmasa qo'shamiz
        if (params.contextSummary && params.contextSummary.trim().length > 0) {
            messages.push({ role: "system", content: `Lesson materials${params.useComprehensiveExamples ? '' : ' context'}:\n${params.contextSummary}` });
        }

        // Conversation entities'ni qo'shamiz (entity tracking uchun)
        if (params.conversationEntities && params.conversationEntities.trim().length > 0) {
            messages.push({ 
                role: "system", 
                content: `Conversation context (entities mentioned):\n${params.conversationEntities}\n\nUse this context to give logical and contextually appropriate responses.` 
            });
        }

        // Add few-shot examples (faqat contextSummary bo'lsa - materiallarga asoslangan rejimda)
        // Erkin rejimda few-shot examples'ni o'tkazib yuboramiz
        if (params.contextSummary && params.contextSummary.trim().length > 0) {
            if (params.language === 'ar' || params.language === 'arabic') {
                let examples = params.useComprehensiveExamples
                    ? COMPREHENSIVE_ARABIC_FEW_SHOT_EXAMPLES
                    : SIMPLE_ARABIC_FEW_SHOT_EXAMPLES;
                
                // Engagement o'chirilgan bo'lsa, engagement misollarini filter qilish
                if (!this.enableUserEngagement) {
                    examples = this.filterEngagementExamples(examples);
                }
                
                messages.push(...examples);
            }
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

    /**
     * Engagement misollarini filter qilish
     * Engagement o'chirilganda, AI o'zi savol bergan misollarni olib tashlaydi
     */
    private filterEngagementExamples(examples: GPTMessage[]): GPTMessage[] {
        const filtered: GPTMessage[] = [];

        for (let i = 0; i < examples.length; i++) {
            const example = examples[i];
            
            // Engagement misollarini aniqlash (Misol 9-12)
            // Pattern: AI o'zi savol beradi (؟ bilan tugaydi va oldingi user message oddiy javob)
            
            if (example.role === 'assistant' && example.content) {
                const content = example.content;
                
                // AI o'zi savol bergan holatni aniqlash
                // Engagement pattern: tasdiq + savol yoki faqat savol
                const hasQuestion = content.includes('؟');
                const hasEngagementPattern = 
                    // Misol 9: "أَيْنَ الْقَلَمُ؟"
                    (content.includes('أَيْنَ') && hasQuestion) ||
                    // Misol 10, 12: "نَعَمْ... هَلْ...؟" (tasdiq + savol)
                    (content.includes('نَعَمْ') && content.includes('هَلْ') && hasQuestion) ||
                    // Misol 11: "جَيِّدٌ! مَاذَا...؟" (tasdiq + savol)
                    (content.includes('جَيِّد') && content.includes('مَاذَا') && hasQuestion) ||
                    // Umumiy: "هَلْ...كَ؟" (mulkiyat savoli)
                    (content.includes('هَلْ') && content.includes('كَ؟'));
                
                if (hasEngagementPattern) {
                    // Oldingi user message'ni tekshirish
                    if (i > 0 && examples[i - 1].role === 'user') {
                        const prevUserContent = examples[i - 1].content;
                        // Agar oldingi user message oddiy javob yoki statement bo'lsa
                        // Engagement pattern: user statement/javob → AI savol beradi
                        if (prevUserContent.includes('نَعَمْ') || 
                            prevUserContent.includes('هَٰذَا') || 
                            prevUserContent.includes('أَنَا') ||
                            prevUserContent.trim().length < 10) {
                            // Bu engagement misoli - oldingi user message'ni ham olib tashlash
                            if (filtered.length > 0 && filtered[filtered.length - 1].role === 'user') {
                                filtered.pop();
                            }
                            // Bu assistant message'ni ham olib tashlash
                            continue;
                        }
                    } else if (i > 1 && examples[i - 2].role === 'user') {
                        // Misol 10, 12: user statement → AI tasdiq + savol
                        // Oldingi assistant message'ni tekshirish
                        const prevAssistantContent = examples[i - 1].content;
                        if (prevAssistantContent && prevAssistantContent.includes('نَعَمْ')) {
                            // Bu engagement misoli - oldingi 2 ta message'ni ham olib tashlash
                            if (filtered.length > 1) {
                                filtered.pop(); // assistant
                                filtered.pop(); // user
                            }
                            continue;
                        }
                    }
                }
            }
            
            // System message'lardan engagement haqidagi qismlarni olib tashlash
            if (example.role === 'system' && example.content) {
                const content = example.content;
                if (
                    content.includes('ENGAGE') ||
                    content.includes('ask follow-up questions') ||
                    (content.includes('OFF-TOPIC') && content.includes('ask about'))
                ) {
                    continue;
                }
            }
            
            filtered.push(example);
        }

        return filtered;
    }
}

