# AI Proactive Conversation - Implementation Rejasi (V3)

## Maqsad

**User birinchi boshlaydi suhbatni**, AI javob beradi, keyin **AI o'zi ham gapga tortadi** (materiallardan kelib chiqib). **Performance muammosi bo'lmasligi kerak** - javob berish vaqti sekinlashmasligi kerak.

## Asosiy Talablar

1. ✅ **User birinchi boshlaydi** - proactive message emas
2. ✅ **AI javob beradi** - normal flow (hozirgi logika)
3. ✅ **AI o'zi gapga tortadi** - keyinroq (background'da)
4. ✅ **Performance** - sekinlashmasligi kerak

---

## 1. YONDASHUV

### 1.1. Asosiy Oqim

```
1. User: POST /ai/chat/voice (birinchi message)
   ↓
2. AI: Normal javob beradi (hozirgi logika - o'zgartirilmaydi)
   ↓
3. Background: AI o'zi gapga tortadi (proactive message generatsiya qilish)
   ↓
4. User: Keyingi message yuboradi
   ↓
5. AI: Normal javob beradi (conversation history bilan)
```

### 1.2. Performance Strategiyasi

**Asosiy qoida**: User message'ga javob berish **NON-BLOCKING** bo'lishi kerak.

**Proactive message generatsiya qilish**:

- User message'ga javob berilgandan **KEYIN** (background'da)
- **NON-BLOCKING** - user javob olishi kutmaydi
- **ASYNC** - parallel ishlaydi

---

## 2. IMPLEMENTATION STRATEGY

### 2.1. AIChatService Modifikatsiya

**Fayl**: `src/modules/ai/services/ai-chat.service.ts`

**O'zgartirish**: `sendVoiceMessage()` metodiga proactive message generatsiya qo'shish

**Yangi Kod**:

```typescript
async sendVoiceMessage(params: {
    userId: ID;
    sessionId: ID;
    audioBuffer: Buffer;
    courseId?: ID;
    language?: string;
}): Promise<AIChatMessage> {
    // Mavjud kod (o'zgartirilmaydi)
    const { userId, sessionId, audioBuffer, courseId, language } = params;

    // Validation
    if (!audioBuffer || audioBuffer.length === 0) {
        throw new BadRequestException(AI_ERROR_MESSAGES.AUDIO_NOT_FOUND);
    }

    // Session validation
    const session = await this.sessionRepo.findOneById(Number(sessionId));
    if (!session) {
        throw new BadRequestException(AI_ERROR_MESSAGES.SESSION_NOT_FOUND);
    }
    if (session.userId !== Number(userId)) {
        throw new SessionForbiddenException(AI_ERROR_MESSAGES.SESSION_NOT_FOUND);
    }

    // Pipeline input
    const pipelineInput: VoiceInput = {
        userId,
        sessionId,
        audioBuffer,
        courseId,
        language,
        session,
    };

    // Pipeline execution
    const result = await this.voicePipeline.execute(pipelineInput);

    // Save message and update session
    const saved = await this.messageRepo.create(result.message);
    result.session.lastActivityAt = new Date();
    await this.sessionRepo.update(result.session);

    // Cost tracking - message saqlangandan keyin (id mavjud bo'ladi)
    try {
        const usage = (result as any).usage;
        if (usage) {
            await this.trackCostAfterSave({
                userId: Number(userId),
                sessionId: saved.sessionId,
                messageId: saved.id as unknown as number,
                usage,
            });
        }
    } catch (error: any) {
        // Cost tracking xatosi request'ni to'xtatmaydi, faqat log qilamiz
        console.error('❌ Cost tracking error after message save:', error.message);
    }

    // 🆕 QO'SHIMCHA: Proactive message generatsiya qilish (background, non-blocking)
    // Faqat agar session'da proactive message bo'lmasa
    this.generateProactiveMessageIfNeeded(session).catch((err) => {
        console.error("❌ Proactive message generation failed:", err);
        // Silent failure - user experience'ga ta'sir qilmaydi
    });

    return saved; // User javobni oladi (proactive message kutilmaydi)
}
```

**Yangi Helper Metod**:

```typescript
private async generateProactiveMessageIfNeeded(session: AIChatSession): Promise<void> {
    // 1. Session'da proactive message bor-yo'qligini tekshirish
    const existingMessages = await this.messageRepo.findBySessionIdOrdered(Number(session.id));

    // 2. Agar proactive message bo'lsa, generatsiya qilish kerak emas
    const hasProactiveMessage = existingMessages.some(
        msg => msg.senderType === 'ai' && msg.originalText === null
    );

    if (hasProactiveMessage) {
        console.log(`✅ Proactive message already exists for session ${session.id}`);
        return;
    }

    // 3. Agar session'da kamida 2 ta message bo'lsa (user + AI), proactive generatsiya qilish
    // (1 ta message = user message, 2 ta message = user + AI response)
    // Proactive message generatsiya qilish uchun kamida 1 ta conversation cycle bo'lishi kerak
    const messageCount = existingMessages.length;
    if (messageCount < 2) {
        console.log(`⏳ Waiting for at least 2 messages (user + AI) before generating proactive message`);
        return;
    }

    // 4. Proactive message generatsiya qilish (background'da)
    console.log(`🚀 Generating proactive message for session ${session.id}...`);
    await this.proactiveMessageService.generateProactiveMessage(session);
    console.log(`✅ Proactive message generated for session ${session.id}`);
}
```

---

### 2.2. Proactive Message Service

**Fayl**: `src/modules/ai/services/proactive-message.service.ts`

**Maqsad**: Proactive message generatsiya qilish (background job)

**Asosiy Metod**:

```typescript
async generateProactiveMessage(session: AIChatSession): Promise<AIChatMessage> {
    // 1. Context olish
    const context = await this.contextBuilder.buildContext({
        userId: session.userId,
        courseId: session.courseId || undefined,
        userQuery: undefined, // Proactive uchun query yo'q
    });

    // 2. Conversation history olish (proactive message conversation history'ga asoslanadi)
    const conversationHistory = await this.getConversationHistory(session);

    // 3. GPT prompt generatsiya qilish
    const prompt = this.buildProactivePrompt(context, conversationHistory);

    // 4. GPT'ga so'rov yuborish
    const gptResult = await this.gptService.generateWithUsage({
        prompt: prompt,
        context: context.chromaContext || [],
        language: session.sessionLanguage || 'ar',
        strict: false,
        conversationHistory: conversationHistory, // Conversation history'ni yuborish
        conversationTopic: this.extractConversationTopic(conversationHistory, context),
    });

    // 5. TTS generatsiya qilish
    const audioUrl = await this.ttsService.textToSpeech({
        text: gptResult.text,
        language: session.sessionLanguage || 'ar',
    });

    // 6. Message yaratish va saqlash
    const message = new AIChatMessage();
    message.sessionId = session.id as unknown as any;
    message.session = session;
    message.senderType = 'ai';
    message.originalText = null; // Proactive uchun user message yo'q
    message.aiResponseText = gptResult.text;
    message.aiResponseUzbek = ''; // O'zbekcha yo'q
    message.isWithinLimit = true;
    message.messageLanguage = session.sessionLanguage || 'ar';
    message.contextUsed = context.chromaContext || [];
    message.audioUrl = audioUrl;

    // 7. Database'ga saqlash
    const saved = await this.messageRepo.create(message);

    // 8. Session'ni update qilish
    session.lastActivityAt = new Date();
    await this.sessionRepo.update(session);

    return saved;
}
```

**Conversation History Olish**:

```typescript
private async getConversationHistory(session: AIChatSession): Promise<Array<{ role: 'user' | 'assistant'; content: string }>> {
    const messages = await this.messageRepo.findBySessionIdOrdered(Number(session.id));

    return messages
        .filter(msg => {
            const content = msg.senderType === 'user' ? msg.originalText : msg.aiResponseText;
            return content && content.trim().length > 0;
        })
        .slice(-10) // Last 10 messages
        .map(msg => ({
            role: msg.senderType === 'user' ? 'user' as const : 'assistant' as const,
            content: (msg.senderType === 'user' ? msg.originalText : msg.aiResponseText) || '',
        }));
}
```

**Prompt Builder**:

```typescript
private buildProactivePrompt(context: any, conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>): string {
    const userLevel = context.userLevel || {};
    const currentLesson = userLevel.currentLessonOrder || 0;
    const materials = context.chromaContext || [];

    // Conversation history'dan topic/mavzuni aniqlash
    const hasConversationHistory = conversationHistory.length > 0;
    const conversationContext = hasConversationHistory
        ? `\n\nPrevious conversation:\n${conversationHistory.map(m => `${m.role}: ${m.content}`).join('\n')}`
        : '';

    return `You are an Arabic language learning assistant.

IMPORTANT: This is a PROACTIVE MESSAGE - you are continuing the conversation by asking a new question or suggesting a new topic.

Based on the user's progress and lesson materials, generate a conversation starter question to engage the user and continue the conversation naturally.

RULES:
1. Use ONLY vocabulary from the provided materials
2. Question should match user's current level (lesson ${currentLesson})
3. Use Modern Standard Arabic with FULL diacritical marks (تشكيل)
4. Make it ENGAGING and ENCOURAGING - user should want to respond
5. Keep it SHORT (1 sentence, max 2 sentences)
6. Make it feel NATURAL - like a friendly teacher continuing a conversation
7. Build upon the previous conversation if there is one
8. If the conversation was about a specific topic, you can ask a follow-up question or suggest a related topic
9. Use QUESTION format - encourages response${hasConversationHistory ? '\n10. Consider the conversation history - make it relevant to what was discussed' : ''}

Materials available:
${this.formatMaterials(materials)}

User Progress:
- Current lesson: ${currentLesson}
- Completed lessons: ${userLevel.completedLessons || 0}${conversationContext}

Generate a proactive conversation starter question that will engage the user:`;
}
```

---

## 3. PERFORMANCE OPTIMIZATION

### 3.1. Non-Blocking Approach

**Strategiya**: Proactive message generatsiya qilish **background'da**, user javob olishi kutmaydi.

**Implementation**:

```typescript
// User javobni oladi (proactive message kutilmaydi)
this.generateProactiveMessageIfNeeded(session).catch((err) => {
  console.error("❌ Proactive message generation failed:", err);
});
return saved; // User javobni oladi
```

**Natija**:

- User message'ga javob **tez** qaytariladi (hozirgi kabi)
- Proactive message **keyinroq** generatsiya qilinadi (background'da)

---

### 3.2. Conditional Generation

**Strategiya**: Proactive message faqat kerak bo'lganda generatsiya qilish.

**Shartlar**:

1. Session'da proactive message bo'lmasa
2. Session'da kamida 2 ta message bo'lsa (user + AI response)
3. Proactive message generatsiya qilinayotgan bo'lmasa (race condition)

**Implementation**:

```typescript
private async generateProactiveMessageIfNeeded(session: AIChatSession): Promise<void> {
    // 1. Proactive message bor-yo'qligini tekshirish
    const existingMessages = await this.messageRepo.findBySessionIdOrdered(Number(session.id));
    const hasProactiveMessage = existingMessages.some(
        msg => msg.senderType === 'ai' && msg.originalText === null
    );

    if (hasProactiveMessage) {
        return; // Proactive message allaqachon mavjud
    }

    // 2. Kamida 2 ta message bo'lishi kerak (user + AI)
    if (existingMessages.length < 2) {
        return; // Hali yetarli conversation yo'q
    }

    // 3. Proactive message generatsiya qilish
    await this.proactiveMessageService.generateProactiveMessage(session);
}
```

---

### 3.3. Rate Limiting

**Strategiya**: Proactive message generatsiya qilishni cheklash (session'da bir necha marta yuborilmasligi uchun).

**Implementation**:

```typescript
// Session'da proactive message generatsiya qilingan vaqtni tekshirish
const lastProactiveMessage = existingMessages
  .filter((msg) => msg.senderType === "ai" && msg.originalText === null)
  .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];

if (lastProactiveMessage) {
  const timeSinceLastProactive =
    Date.now() - lastProactiveMessage.createdAt.getTime();
  const MIN_INTERVAL = 60000; // 1 minute

  if (timeSinceLastProactive < MIN_INTERVAL) {
    console.log(
      `⏳ Too soon to generate another proactive message (${timeSinceLastProactive}ms ago)`,
    );
    return;
  }
}
```

---

### 3.4. Timeout Protection

**Strategiya**: Proactive message generatsiya qilish uchun timeout.

**Implementation**:

```typescript
private async generateProactiveMessageIfNeeded(session: AIChatSession): Promise<void> {
    const timeout = 15000; // 15 seconds
    const promise = this.proactiveMessageService.generateProactiveMessage(session);
    const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), timeout)
    );

    await Promise.race([promise, timeoutPromise]).catch((err) => {
        console.error('❌ Proactive message timeout:', err);
        // Silent failure
    });
}
```

---

## 4. MODULE REGISTRATION

**Fayl**: `src/modules/ai/ai.module.ts`

**O'zgartirish**: `ProactiveMessageService` va `ContextBuilderService`'ni provider qilish

```typescript
@Module({
    // ... existing code
    providers: [
        // ... existing providers
        ContextBuilderService, // 🆕 Qo'shish
        ProactiveMessageService, // 🆕 Qo'shish
    ],
    // ... existing code
})
```

---

## 5. DEPENDENCY INJECTION

### 5.1. ContextBuilderService

**Maqsad**: Context building logikasini alohida service'ga ajratish (circular dependency yechimi)

**Fayl**: `src/modules/ai/services/context-builder.service.ts`

**Funksiya**:

```typescript
async buildContext(params: { userId: number; courseId?: ID; userQuery?: string }): Promise<any>
```

**Dependencies**:

- `IUserAIProfileRepository`
- `IUserCourseProgressRepository`
- `ILessonProgressService`
- `ChromaService`

---

### 5.2. ProactiveMessageService

**Dependencies**:

- `ContextBuilderService` - context olish uchun
- `GPTService` - GPT generatsiya qilish uchun
- `TTSService` - TTS generatsiya qilish uchun
- `IAIChatMessageRepository` - message saqlash uchun
- `IAIChatSessionRepository` - session update qilish uchun

---

## 6. USER EXPERIENCE FLOW

### Senaryo 1: Birinchi Conversation

```
1. User: POST /ai/chat/voice (birinchi message)
   ↓
2. AI: Normal javob beradi (tez, hozirgi kabi)
   Response: { messageId: 1, text: "...", audioUrl: "..." }
   ↓ (background, non-blocking)
3. Background: Proactive message generatsiya qilinadi
   ↓
4. User: GET /ai/chat/sessions/:id/messages
   Response: [
     { id: 1, senderType: 'user', ... },
     { id: 2, senderType: 'ai', ... }, // AI response
     { id: 3, senderType: 'ai', originalText: null, ... } // Proactive message (keyinroq)
   ]
   ↓
5. User: POST /ai/chat/voice (proactive message'ga javob)
   ↓
6. AI: Normal javob beradi (conversation history bilan)
```

---

## 7. PERFORMANCE METRICS

### 7.1. User Message Response Time

**Hozirgi**: ~2-5 sekund (STT + GPT + TTS)

**Proactive message bilan**: **O'zgartirilmaydi** - proactive message background'da generatsiya qilinadi

**Natija**: ✅ Performance muammosi yo'q

---

### 7.2. Proactive Message Generation Time

**Vaqt**: ~2-5 sekund (GPT + TTS)

**Ta'sir**: **Yo'q** - background'da ishlaydi, user kutmaydi

**Natija**: ✅ Performance muammosi yo'q

---

## 8. FAYLLAR RO'YXATI

### Yaratilishi Kerak:

1. `src/modules/ai/services/context-builder.service.ts` ⭐
2. `src/modules/ai/services/proactive-message.service.ts` ⭐

### O'zgartiriladi:

1. `src/modules/ai/services/ai-chat.service.ts` - `sendVoiceMessage()` metodiga proactive message qo'shish
2. `src/modules/ai/ai.module.ts` - Provider'lar qo'shish

### O'zgartirilmaydi:

- ✅ `src/modules/ai/controllers/ai-chat.controller.ts` - Hech qanday o'zgartirish yo'q
- ✅ `src/modules/ai/services/pipeline/*` - Hech qanday o'zgartirish yo'q
- ✅ `src/modules/ai/services/gpt.service.ts` - Faqat ishlatiladi
- ✅ `src/modules/ai/entities/*` - Hech qanday o'zgartirish yo'q
- ✅ `src/modules/ai/repositories/*` - Hech qanday o'zgartirish yo'q

---

## 9. IMPLEMENTATION STEPS

### Step 1: Context Builder Service

1. ✅ `src/modules/ai/services/context-builder.service.ts` yaratish
2. ✅ `AIChatService.buildContext()` logikasini `ContextBuilderService`'ga ko'chirish
3. ✅ `AIChatService`'da `ContextBuilderService`'ni ishlatish

### Step 2: Proactive Message Service

1. ✅ `src/modules/ai/services/proactive-message.service.ts` yaratish
2. ✅ Dependencies inject qilish
3. ✅ `generateProactiveMessage()` metodini implement qilish
4. ✅ Prompt builder metodini yozish
5. ✅ Conversation history olish metodini yozish

### Step 3: AIChatService Integration

1. ✅ `sendVoiceMessage()` metodiga proactive message generatsiya qo'shish
2. ✅ `generateProactiveMessageIfNeeded()` helper metodini yozish
3. ✅ Conditional generation logikasini yozish
4. ✅ Error handling qo'shish
5. ✅ Non-blocking background job

### Step 4: Module Registration

1. ✅ `ai.module.ts`'da provider'lar qo'shish
2. ✅ Dependencies tekshirish

### Step 5: Testing

1. ✅ Unit testlar
2. ✅ Integration testlar
3. ✅ Performance testlar

---

## 10. XULOSA

Bu reja:

- ✅ **User birinchi boshlaydi** - proactive message emas
- ✅ **AI javob beradi** - normal flow (hozirgi logika)
- ✅ **AI o'zi gapga tortadi** - keyinroq (background'da)
- ✅ **Performance** - sekinlashmasligi kerak (non-blocking)
- ✅ **Mavjud logikalarni buzmaydi** - faqat qo'shimcha funksional
- ✅ **Materiallardan kelib chiqadi** - context building
- ✅ **Conversation history'ni ishlatadi** - proactive message conversation history'ga asoslanadi

**Keyingi qadam**: Implementation qilish
