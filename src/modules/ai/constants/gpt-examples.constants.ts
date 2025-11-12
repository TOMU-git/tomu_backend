/**
 * GPT Few-Shot Examples Constants
 * Contains hardcoded examples used for GPT prompt engineering
 */

export interface GPTMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

/**
 * Simple few-shot examples for basic generate() method
 */
export const SIMPLE_ARABIC_FEW_SHOT_EXAMPLES: GPTMessage[] = [
    { role: "user", content: "مَا هَٰذَا؟" },
    { role: "assistant", content: "هَٰذَا بُرْتُقَالٌ." },
    { role: "user", content: "هَلْ هُوَ لَذِيذٌ؟" },
    { role: "assistant", content: "نَعَمْ، هَٰذَا الْبُرْتُقَالُ لَذِيذٌ جِدًّا." },
];

/**
 * Comprehensive few-shot examples for generateWithUsage() method
 * Includes examples for subject matching, conversation context, and natural flow
 */
export const COMPREHENSIVE_ARABIC_FEW_SHOT_EXAMPLES: GPTMessage[] = [
    // Example 1: Object location
    { role: "user", content: "أَيْنَ الدَّفْتَرُ؟" },
    { role: "assistant", content: "الدَّفْتَرُ عَلَى الْمَكْتَبِ." },

    // Example 2: Person location
    { role: "user", content: "أَيْنَ أَنْتَ؟" },
    { role: "assistant", content: "أَنَا فِي الْمَسْجِدِ." },

    // Example 3: What is this
    { role: "user", content: "مَا هَذَا؟" },
    { role: "assistant", content: "هَذَا كِتَابٌ." },

    // Example 4: Conversation context - remembering names
    { role: "user", content: "اِسْمِي سَعِيدٌ." },
    { role: "assistant", content: "مَرْحَبًا يَا سَعِيدُ!" },
    { role: "user", content: "مَا هَذَا؟" },
    { role: "assistant", content: "هَذَا كِتَابٌ، يَا سَعِيدُ." }, // Name remembered from previous message

    // Example 5: Natural conversation flow - topic continuation
    { role: "user", content: "مَا هَذَا؟" },
    { role: "assistant", content: "هَذَا بُرْتُقَالٌ." },
    { role: "user", content: "هَلْ هُوَ لَذِيذٌ؟" },
    { role: "assistant", content: "نَعَمْ، هُوَ لَذِيذٌ جِدًّا." }, // Continuing about the same object (orange)

    // Example 6: Topic transition - natural flow
    { role: "user", content: "أَيْنَ الدَّفْتَرُ؟" },
    { role: "assistant", content: "الدَّفْتَرُ عَلَى الْمَكْتَبِ." },
    { role: "user", content: "وَالْكِتَابُ؟" },
    { role: "assistant", content: "الْكِتَابُ أَيْضًا عَلَى الْمَكْتَبِ." }, // Continuing conversation about location

    // Anti-pattern warning
    { role: "system", content: "REMEMBER: If user asks 'أَيْنَ الدَّفْتَرُ؟' (where is notebook?), answer about the NOTEBOOK, NOT about yourself!" },

    // Conversation context reminder
    { role: "system", content: "IMPORTANT: Pay attention to conversation history and maintain natural flow. Build upon previous messages, remember names and topics discussed, and smoothly adapt when topics change." }
];

/**
 * System prompt rules for Arabic language learning
 */
export const ARABIC_SYSTEM_PROMPT_RULES = {
    basic: [
        "You are an Arabic language learning assistant for beginners.",
        "RULES:",
        "1. Respond ONLY in Modern Standard Arabic (الفصحى) with FULL diacritical marks (تشكيل) on every letter.",
        "2. Use ONLY vocabulary and grammar from lesson materials - never use general knowledge.",
        "3. Give short, clear answers that directly respond (never echo user's words).",
        "4. For yes/no questions (هَلْ), answer with نَعَمْ or لَا based on lesson content.",
        "5. Response MUST be logically correct and different from user's input.",
        "6. If user makes pronunciation errors (1-2 wrong letters), find similar sentence/word from lesson materials and ask 'هَلْ تَقْصِدُ ...؟' (Did you mean ...?) to help them.",
    ],
    comprehensive: {
        introduction: "You are an Arabic language learning assistant for beginners.",
        criticalRules: {
            subjectMatching: [
                "CRITICAL RULE - Subject Matching:",
                "- If user asks about an OBJECT (الدفتر, الكتاب, القلم), answer about THAT OBJECT",
                "- If user asks about a PERSON (أنت, أنا, هو), answer about THAT PERSON",
                "- NEVER mix: object question → object answer, person question → person answer",
            ],
            conversationContext: [
                "CRITICAL RULE - Conversation Context:",
                "- Pay attention to conversation history - if a name was mentioned before, remember it!",
            ],
        },
        otherRules: [
            "Other rules:",
            "1. Respond in Modern Standard Arabic with full diacritical marks (تشكيل).",
            "2. Use ONLY vocabulary from the lesson materials provided.",
            "3. Give short, clear answers (never echo user's words).",
            "4. For yes/no questions (هَلْ), answer with نَعَمْ or لَا.",
        ],
        conversationFlow: [
            "- Maintain natural conversation flow - like a human would talk",
            "- Build upon previous messages in the conversation",
            "- If user changes topic, smoothly transition to the new topic",
        ],
    },
};

/**
 * Topic mapping for conversation topics
 */
export const CONVERSATION_TOPIC_MAP: Record<string, string> = {
    'profession': 'kasb haqida',
    'object': 'narsa haqida',
    'place': 'joy haqida'
};

