# AI Proactive Conversation - Implementation Rejasi (V2)

## Maqsad

AI o'zi ham gapga tortsin userni materiallardan kelib chiqib. **Hozirgi API'larni saqlab qolish**, lekin suhbatni AI o'zi boshlashi kerak.

## Hozirgi API'lar (O'zgartirilmaydi)

- ✅ `POST /ai/chat/sessions` - Session yaratish
- ✅ `POST /ai/chat/voice` - Voice message yuborish
- ✅ `GET /ai/chat/sessions/:id/messages` - Xabarlarni olish

## Qo'shiladigan Funksional

- 🆕 Session yaratilganda avtomatik proactive message generatsiya qilish
- 🆕 AI o'zi gapga tortish (materiallardan kelib chiqib)
- 🆕 Mavjud API'larni saqlab qolish (hech qanday o'zgartirish yo'q)

---

## 1. YONDASHUV

### Asosiy G'oya

Session yaratilganda, **background'da** (non-blocking) proactive message generatsiya qilish. User `getMessages()` chaqirganda, proactive message allaqachon mavjud bo'ladi.

### Oqim

```
1. User: POST /ai/chat/sessions → Session yaratiladi
   ↓
2. Background: Proactive message generatsiya qilinadi (async)
   ↓
3. User: GET /ai/chat/sessions/:id/messages → Proactive message + user messages
   ↓
4. User: POST /ai/chat/voice → Normal conversation davom etadi
```

---

## 2. IMPLEMENTATION STRATEGY

### 2.1. Proactive Message Service

**Fayl**: `src/modules/ai/services/proactive-message.service.ts`

**Maqsad**: Proactive message generatsiya qilish (background job)

**Funksiya**:

```typescript
async generateProactiveMessage(session: AIChatSession): Promise<AIChatMessage>
```

**Logic**:

1. User progress'ini olish (`buildContext()`)
2. Materiallardan relevant chunk'lar olish
3. GPT'ga prompt yuborish (conversation starter)
4. TTS generatsiya qilish
5. Message'ni database'ga saqlash
6. Session'ni update qilish

---

### 2.2. AIChatService Modifikatsiya

**Fayl**: `src/modules/ai/services/ai-chat.service.ts`

**O'zgartirish**: `createSession()` metodiga proactive message generatsiya qo'shish

**Yangi Kod**:

```typescript
async createSession(...): Promise<AIChatSession> {
    // Mavjud kod (o'zgartirilmaydi)
    const session = new AIChatSession();
    session.userId = Number(userId);
    session.courseId = courseId ? Number(courseId) : null;
    session.sessionLanguage = sessionLanguage || 'ar';
    session.sessionTitle = sessionTitle || null;
    session.isActive = true;
    session.lastActivityAt = new Date();
    const createdSession = await this.sessionRepo.create(session);

    // 🆕 QO'SHIMCHA: Proactive message generatsiya qilish (background)
    this.generateProactiveMessageAsync(createdSession).catch(err => {
        console.error('❌ Proactive message generation failed:', err);
        // Xato bo'lsa ham, session yaratilgan bo'ladi (non-blocking)
    });

    return createdSession;
}
```

**Yangi Helper Metod**:

```typescript
private async generateProactiveMessageAsync(session: AIChatSession): Promise<void> {
    // Background'da proactive message generatsiya qilish
    const proactiveMessage = await this.proactiveMessageService.generateProactiveMessage(session);
    // Message allaqachon database'ga saqlangan bo'ladi
}
```

---

### 2.3. Proactive Message Service Implementation

**Fayl**: `src/modules/ai/services/proactive-message.service.ts`

**Asosiy Metod**:

```typescript
async generateProactiveMessage(session: AIChatSession): Promise<AIChatMessage> {
    // 1. Context olish
    const context = await this.aiChatService.buildContext({
        userId: session.userId,
        courseId: session.courseId || undefined,
        userQuery: undefined, // Proactive uchun query yo'q
    });

    // 2. GPT prompt generatsiya qilish
    const prompt = this.buildProactivePrompt(context);

    // 3. GPT'ga so'rov yuborish
    const gptResult = await this.gptService.generateWithUsage({
        prompt: prompt,
        context: context.chromaContext || [],
        language: session.sessionLanguage || 'ar',
        strict: false,
        conversationHistory: [], // Proactive uchun history yo'q
        conversationTopic: null,
    });

    // 4. TTS generatsiya qilish
    const audioUrl = await this.ttsService.textToSpeech({
        text: gptResult.text,
        language: session.sessionLanguage || 'ar',
    });

    // 5. Message yaratish va saqlash
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

    // 6. Database'ga saqlash
    const saved = await this.messageRepo.create(message);

    // 7. Session'ni update qilish
    session.lastActivityAt = new Date();
    await this.sessionRepo.update(session);

    return saved;
}
```

**Prompt Builder**:

```typescript
private buildProactivePrompt(context: any): string {
    const userLevel = context.userLevel || {};
    const currentLesson = userLevel.currentLessonOrder || 0;
    const materials = context.chromaContext || [];

    return `You are an Arabic language learning assistant.

Based on the user's progress and lesson materials, generate a conversation starter question to engage the user.

RULES:
1. Use ONLY vocabulary from the provided materials
2. Question should match user's current level (lesson ${currentLesson})
3. Use Modern Standard Arabic with FULL diacritical marks (تشكيل)
4. Question should encourage user to respond (be engaging)
5. Keep it short (1-2 sentences max)
6. Make it feel natural and conversational
7. Do NOT echo any previous conversation (this is the first message)

Materials available:
${this.formatMaterials(materials)}

User Progress:
- Current lesson: ${currentLesson}
- Completed lessons: ${userLevel.completedLessons || 0}

Generate a conversation starter question that will engage the user:`;
}
```

---

## 3. MODULE REGISTRATION

**Fayl**: `src/modules/ai/ai.module.ts`

**O'zgartirish**: `ProactiveMessageService`'ni provider qilish

```typescript
@Module({
    // ... existing code
    providers: [
        // ... existing providers
        ProactiveMessageService, // 🆕 Qo'shish
    ],
    // ... existing code
})
```

---

## 4. DEPENDENCY INJECTION

**ProactiveMessageService Dependencies**:

- `AIChatService` - context olish uchun
- `GPTService` - GPT generatsiya qilish uchun
- `TTSService` - TTS generatsiya qilish uchun
- `IAIChatMessageRepository` - message saqlash uchun
- `IAIChatSessionRepository` - session update qilish uchun

**AIChatService Dependency**:

- `ProactiveMessageService` - proactive message generatsiya qilish uchun

**⚠️ Circular Dependency Ehtimoli**: `AIChatService` → `ProactiveMessageService` → `AIChatService`

**Yechim**: `ProactiveMessageService`'da `AIChatService`'ni `forwardRef()` bilan inject qilish yoki `ProactiveMessageService`'da `buildContext()` logikasini duplicate qilish.

**Tavsiya**: `ProactiveMessageService`'da `buildContext()` logikasini duplicate qilish (yoki `AIChatService`'dan `buildContext()` metodini extract qilish).

---

## 5. ALTERNATIVE APPROACH (Circular Dependency Yechimi)

### 5.1. Context Service Extract

**Yangi Service**: `src/modules/ai/services/context-builder.service.ts`

**Maqsad**: Context building logikasini alohida service'ga ajratish

**Funksiya**:

```typescript
async buildContext(params: { userId: number; courseId?: ID; userQuery?: string }): Promise<any>
```

**Faydalar**:

- `AIChatService` va `ProactiveMessageService` ikkalasi ham `ContextBuilderService`'ni ishlatadi
- Circular dependency yo'q
- Code reusability

---

### 5.2. Updated Dependencies

**AIChatService**:

```typescript
constructor(
    // ... existing
    private readonly contextBuilder: ContextBuilderService, // 🆕
    // ... existing
) {}

async buildContext(...) {
    return this.contextBuilder.buildContext(...); // Delegate
}
```

**ProactiveMessageService**:

```typescript
constructor(
    private readonly contextBuilder: ContextBuilderService, // 🆕
    private readonly gptService: GPTService,
    private readonly ttsService: TTSService,
    private readonly messageRepo: IAIChatMessageRepository,
    private readonly sessionRepo: IAIChatSessionRepository,
) {}
```

---

## 6. ERROR HANDLING

### 6.1. Proactive Message Generation Failure

**Strategiya**: Non-blocking, silent failure

```typescript
this.generateProactiveMessageAsync(createdSession).catch((err) => {
  console.error("❌ Proactive message generation failed:", err);
  // Xato bo'lsa ham, session yaratilgan bo'ladi
  // User session'ni oladi, lekin proactive message bo'lmaydi
  // Keyingi user message'da normal conversation boshlanadi
});
```

**Sabab**:

- Session yaratish muvaffaqiyatli bo'lishi kerak
- Proactive message ixtiyoriy (nice-to-have)
- User experience'ga ta'sir qilmaydi

---

### 6.2. Timeout Protection

**Strategiya**: Proactive message generatsiya qilish uchun timeout

```typescript
private async generateProactiveMessageAsync(session: AIChatSession): Promise<void> {
    const timeout = 10000; // 10 seconds
    const promise = this.proactiveMessageService.generateProactiveMessage(session);
    const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), timeout)
    );

    await Promise.race([promise, timeoutPromise]).catch(err => {
        console.error('❌ Proactive message timeout:', err);
    });
}
```

---

## 7. DATABASE CONSIDERATIONS

### 7.1. Message Structure

**AIChatMessage Entity** (o'zgartirish yo'q):

- `originalText` = `null` (proactive message uchun user message yo'q)
- `aiResponseText` = proactive message text
- `senderType` = `'ai'`
- `audioUrl` = TTS audio URL

**⚠️ Eslatma**: Mavjud entity struktura yetarli, o'zgartirish kerak emas.

---

### 7.2. Message Ordering

**GET /ai/chat/sessions/:id/messages**:

- Proactive message birinchi bo'lishi kerak (agar mavjud bo'lsa)
- Keyin user messages

**Current Implementation**: `findBySessionIdOrdered()` - `createdAt` bo'yicha tartiblanadi

**Natija**: Proactive message birinchi bo'ladi (eng eski message).

---

## 8. TESTING STRATEGY

### 8.1. Unit Tests

**ProactiveMessageService**:

```typescript
describe("ProactiveMessageService", () => {
  it("should generate proactive message", async () => {});
  it("should use user progress for context", async () => {});
  it("should generate TTS audio", async () => {});
  it("should save message to database", async () => {});
});
```

**AIChatService**:

```typescript
describe("AIChatService.createSession", () => {
  it("should create session and generate proactive message", async () => {});
  it("should not fail if proactive message generation fails", async () => {});
});
```

---

### 8.2. Integration Tests

**Session Creation**:

```typescript
describe("POST /ai/chat/sessions", () => {
  it("should create session with proactive message", async () => {
    const session = await createSession();
    await waitForProactiveMessage(); // Wait for background job
    const messages = await getMessages(session.id);
    expect(messages[0].senderType).toBe("ai");
    expect(messages[0].originalText).toBeNull();
  });
});
```

---

## 9. FAYLLAR RO'YXATI

### Yaratilishi Kerak:

1. `src/modules/ai/services/proactive-message.service.ts` ⭐
2. `src/modules/ai/services/context-builder.service.ts` ⭐ (Circular dependency yechimi uchun)

### O'zgartiriladi:

1. `src/modules/ai/services/ai-chat.service.ts` - `createSession()` metodiga proactive message qo'shish
2. `src/modules/ai/ai.module.ts` - `ProactiveMessageService` va `ContextBuilderService` provider qo'shish

### O'zgartirilmaydi:

- ✅ `src/modules/ai/controllers/ai-chat.controller.ts` - Hech qanday o'zgartirish yo'q
- ✅ `src/modules/ai/services/gpt.service.ts` - Faqat ishlatiladi
- ✅ `src/modules/ai/services/pipeline/*` - Hech qanday o'zgartirish yo'q
- ✅ `src/modules/ai/entities/*` - Hech qanday o'zgartirish yo'q
- ✅ `src/modules/ai/repositories/*` - Hech qanday o'zgartirish yo'q

---

## 10. IMPLEMENTATION STEPS

### Step 1: Context Builder Service

1. ✅ `src/modules/ai/services/context-builder.service.ts` yaratish
2. ✅ `AIChatService.buildContext()` logikasini `ContextBuilderService`'ga ko'chirish
3. ✅ `AIChatService`'da `ContextBuilderService`'ni ishlatish

### Step 2: Proactive Message Service

1. ✅ `src/modules/ai/services/proactive-message.service.ts` yaratish
2. ✅ Dependencies inject qilish
3. ✅ `generateProactiveMessage()` metodini implement qilish
4. ✅ Prompt builder metodini yozish

### Step 3: AIChatService Integration

1. ✅ `createSession()` metodiga proactive message generatsiya qo'shish
2. ✅ Error handling qo'shish
3. ✅ Non-blocking background job

### Step 4: Module Registration

1. ✅ `ai.module.ts`'da provider'lar qo'shish
2. ✅ Dependencies tekshirish

### Step 5: Testing

1. ✅ Unit testlar
2. ✅ Integration testlar
3. ✅ E2E testlar

---

## 11. USER EXPERIENCE FLOW

### Senaryo 1: Yangi Session

```
1. User: POST /ai/chat/sessions
   Response: { id: 123, ... }

2. Background: Proactive message generatsiya qilinadi (async)

3. User: GET /ai/chat/sessions/123/messages
   Response: [
     {
       id: 1,
       senderType: 'ai',
       originalText: null, // Proactive message
       aiResponseText: "مَا هَذَا؟",
       audioUrl: "/upload/audio/tts_123.mp3",
       createdAt: "2024-01-01T12:00:00Z"
     }
   ]

4. User: POST /ai/chat/voice (audio with response to proactive message)
   Response: { messageId: 2, text: "...", audioUrl: "..." }

5. User: GET /ai/chat/sessions/123/messages
   Response: [
     { id: 1, senderType: 'ai', ... }, // Proactive message
     { id: 2, senderType: 'user', ... }, // User response
     { id: 3, senderType: 'ai', ... }, // AI response
   ]
```

---

## 12. ADVANTAGES

### 12.1. Mavjud API'larni Buzmaslik

- ✅ `POST /ai/chat/sessions` - Faqat background job qo'shildi
- ✅ `POST /ai/chat/voice` - Hech qanday o'zgartirish yo'q
- ✅ `GET /ai/chat/sessions/:id/messages` - Hech qanday o'zgartirish yo'q

### 12.2. Materiallardan Kelib Chiqish

- ✅ `buildContext()` orqali materiallar olinadi
- ✅ User progress'iga mos filter qilinadi
- ✅ GPT'ga materiallar kontekst sifatida yuboriladi

### 12.3. AI O'zi Gapga Tortish

- ✅ Session yaratilganda avtomatik proactive message
- ✅ Background'da generatsiya qilinadi (non-blocking)
- ✅ User experience'ga ta'sir qilmaydi

---

## 13. FUTURE ENHANCEMENTS (Ixtiyoriy)

### 13.1. Smart Proactive Timing

- Session'da xabar bo'lmasa, proactive message generatsiya qilish
- Conversation lull'da proactive message

### 13.2. Proactive Message Types

- Conversation starter
- Topic suggestion
- Practice question

### 13.3. Proactive Message Cache

- Bir xil progress'ga ega user'lar uchun cache
- Performance improvement

---

## XULOSA

Bu reja:

- ✅ **Mavjud API'larni saqlaydi** (hech qanday o'zgartirish yo'q)
- ✅ **Materiallardan kelib chiqadi** (context building)
- ✅ **AI o'zi gapga tortadi** (session yaratilganda proactive message)
- ✅ **Non-blocking** (background job)
- ✅ **Error-tolerant** (failure'da ham session yaratiladi)
- ✅ **Minimal o'zgarishlar** (faqat service'lar qo'shiladi)

**Keyingi qadam**: Implementation qilish
