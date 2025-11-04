# AI Proactive Conversation - Implementation Rejasi

## Maqsad

AI o'zi ham gapga tortsin userni materiallardan kelib chiqib. Mavjud logikalarni buzmasdan, qo'shimcha funksional qo'shish.

## Hozirgi Holat

- ✅ User ovoz yuboradi → AI javob beradi (passive mode)
- ✅ Materiallar orqali RAG search
- ✅ User progress'iga qarab kontekst filter qilinadi
- ✅ Session lifecycle management

## Qo'shiladigan Funksional

- 🆕 AI o'zi gapga tortish (proactive mode)
- 🆕 Materiallardan mavzular taklif qilish
- 🆕 Savollar generatsiya qilish
- 🆕 User progress'iga mos conversation starter'lar

---

## 1. YANGI SERVICE: `ProactiveAIService`

### Maqsad

AI o'zi gapga tortish uchun proactive message'lar generatsiya qilish.

### Fayl: `src/modules/ai/services/proactive-ai.service.ts`

### Funksiyalar:

#### 1.1. `generateConversationStarter(params)`

**Maqsad**: User progress'iga mos conversation starter generatsiya qilish

**Input**:

```typescript
{
  userId: number;
  sessionId: number;
  courseId?: number;
}
```

**Logic**:

1. User progress'ini olish (hozirgi dars, tugallanganlar)
2. Materiallardan relevant chunk'lar olish (user ko'rgan darslar)
3. GPT'ga prompt yuborish:
   - "Based on these materials, generate a conversation starter question"
   - "Question should be appropriate for user's level"
   - "Use vocabulary from materials only"
4. TTS generatsiya qilish
5. Message'ni saqlash

**Output**: `AIChatMessage` (AI tomonidan boshlangan conversation)

---

#### 1.2. `generateTopicSuggestion(params)`

**Maqsad**: Materiallardan mavzu taklif qilish

**Input**:

```typescript
{
  userId: number;
  sessionId: number;
  courseId?: number;
}
```

**Logic**:

1. User progress'ini olish
2. Materiallardan keyingi mavzularni topish
3. GPT'ga prompt: "Suggest a topic for conversation based on user's progress"
4. TTS generatsiya qilish
5. Message'ni saqlash

**Output**: `AIChatMessage`

---

#### 1.3. `generatePracticeQuestion(params)`

**Maqsad**: Amaliyot savollari generatsiya qilish

**Input**:

```typescript
{
  userId: number;
  sessionId: number;
  courseId?: number;
  topic?: string; // Ixtiyoriy - mavzu
}
```

**Logic**:

1. User progress'ini olish
2. Materiallardan relevant content olish
3. GPT'ga prompt: "Generate a practice question based on materials"
4. TTS generatsiya qilish
5. Message'ni saqlash

**Output**: `AIChatMessage`

---

#### 1.4. `generateRandomConversationStarter(params)`

**Maqsad**: Tasodifiy conversation starter (user gapirishni boshlashi uchun)

**Input**:

```typescript
{
  userId: number;
  sessionId: number;
  courseId?: number;
}
```

**Logic**:

1. User progress'ini olish
2. Materiallardan tasodifiy chunk olish
3. GPT'ga prompt: "Generate a random conversation starter from this material"
4. TTS generatsiya qilish
5. Message'ni saqlash

**Output**: `AIChatMessage`

---

## 2. YANGI DTO: Proactive Request/Response

### 2.1. Request DTO: `proactive-request.dto.ts`

```typescript
export class ProactiveRequestDto {
  sessionId: number;
  courseId?: number;
  type?: "starter" | "topic" | "practice" | "random"; // Default: 'starter'
  topic?: string; // type='practice' bo'lsa kerak
}
```

### 2.2. Response DTO: `proactive-response.dto.ts`

```typescript
export class ProactiveResponseDto {
  messageId: number;
  sessionId: number;
  text: string; // AI tomonidan yuborilgan matn
  audioUrl: string; // TTS audio URL
  type: "starter" | "topic" | "practice" | "random";
  createdAt: Date;
}
```

---

## 3. YANGI CONTROLLER ENDPOINT

### Fayl: `src/modules/ai/controllers/ai-chat.controller.ts`

### Endpoint: `POST /ai/chat/proactive`

**Maqsad**: AI o'zi gapga tortish uchun proactive message generatsiya qilish

**Headers**:

```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body**:

```json
{
  "sessionId": 123,
  "courseId": 1, // Ixtiyoriy
  "type": "starter", // 'starter' | 'topic' | 'practice' | 'random'
  "topic": "food" // Ixtiyoriy, type='practice' bo'lsa
}
```

**Response**:

```json
{
  "message": "ok",
  "data": {
    "messageId": 789,
    "sessionId": 123,
    "text": "مَا هَذَا؟",
    "audioUrl": "/upload/audio/tts_1761595335910.mp3",
    "type": "starter",
    "createdAt": "2024-01-01T12:05:00Z"
  }
}
```

**Guards**: `AuthGuard`, `PaymentGuard` (mavjud logikalarni saqlash uchun)

---

## 4. GPT PROMPT STRATEGY

### 4.1. Conversation Starter Prompt

```
You are an Arabic language learning assistant.
Based on the user's progress and lesson materials, generate a conversation starter question.

RULES:
1. Use ONLY vocabulary from the provided materials
2. Question should match user's current level
3. Use Modern Standard Arabic with FULL diacritical marks (تشكيل)
4. Question should encourage user to respond
5. Keep it short (1-2 sentences max)

Materials:
{context}

User Progress:
- Current lesson: {currentLessonOrder}
- Completed lessons: {completedLessons}

Generate a conversation starter question:
```

---

### 4.2. Topic Suggestion Prompt

```
Based on the user's progress, suggest a topic for conversation.

RULES:
1. Topic should be from upcoming lessons or recently completed
2. Use vocabulary appropriate for user's level
3. Suggest in Arabic with diacritical marks

Generate a topic suggestion:
```

---

### 4.3. Practice Question Prompt

```
Generate a practice question based on the materials.

RULES:
1. Use ONLY vocabulary from materials
2. Question should test understanding of the topic
3. Use Modern Standard Arabic with FULL diacritical marks
4. Keep it simple and clear

Materials:
{context}

Topic: {topic} (if provided)

Generate a practice question:
```

---

## 5. INTEGRATION POINTS

### 5.1. Mavjud Service'lar bilan Integration

**AIChatService**:

- `buildContext()` - kontekst olish uchun (o'zgartirish yo'q, faqat ishlatish)

**GPTService**:

- `generateWithUsage()` - proactive message generatsiya qilish uchun (o'zgartirish yo'q, faqat ishlatish)

**TTSService**:

- Audio generatsiya qilish uchun (o'zgartirish yo'q, faqat ishlatish)

**ChromaService**:

- Materiallardan kontekst olish uchun (o'zgartirish yo'q, faqat ishlatish)

---

### 5.2. Database Integration

**AIChatMessage Entity**:

- Mavjud entity'ni ishlatish
- `userMessage` = `null` (AI tomonidan boshlangan)
- `aiResponseText` = proactive message text
- `audioUrl` = TTS audio

**Qo'shimcha field kerak emas** - mavjud struktura yetarli!

---

## 6. IMPLEMENTATION STEPS

### Step 1: Service Yaratish

1. ✅ `src/modules/ai/services/proactive-ai.service.ts` yaratish
2. ✅ Dependencies inject qilish (AIChatService, GPTService, TTSService, etc.)
3. ✅ Funksiyalarni implement qilish

### Step 2: DTO Yaratish

1. ✅ `src/modules/ai/dto/proactive-request.dto.ts`
2. ✅ `src/modules/ai/dto/proactive-response.dto.ts`

### Step 3: Controller Endpoint

1. ✅ `POST /ai/chat/proactive` endpoint qo'shish
2. ✅ Validation va guards
3. ✅ Response format

### Step 4: Module Registration

1. ✅ `ai.module.ts`'da `ProactiveAIService`'ni provider qilish
2. ✅ Dependencies tekshirish

### Step 5: Testing

1. ✅ Unit testlar (ProactiveAIService)
2. ✅ Integration testlar (endpoint)
3. ✅ E2E testlar (full flow)

---

## 7. YETARLI EKANLIGI

### 7.1. Mavjud Logikalarni Buzmaslik

- ✅ Mavjud pipeline'ga tegmaslik
- ✅ Mavjud endpoint'larni o'zgartirmaslik
- ✅ Mavjud service'lar faqat ishlatiladi, o'zgartirilmaydi

### 7.2. Materiallardan Kelib Chiqish

- ✅ `buildContext()` orqali materiallar olinadi
- ✅ User progress'iga mos filter qilinadi
- ✅ GPT'ga materiallar kontekst sifatida yuboriladi

### 7.3. AI O'zi Gapga Tortish

- ✅ Yangi endpoint orqali AI proactive message generatsiya qiladi
- ✅ Client tomonidan chaqiriladi (polling yoki button)
- ✅ Message database'ga saqlanadi (mavjud struktura)

---

## 8. FUTURE ENHANCEMENTS (Ixtiyoriy)

### 8.1. Auto-Proactive (Background Job)

- Session yaratilganda avtomatik proactive message generatsiya qilish
- Ma'lum vaqt o'tganda (masalan, 30 sekund) proactive message yuborish

### 8.2. WebSocket Integration

- Real-time proactive message'lar
- Server tomonidan push notification

### 8.3. Smart Timing

- User inactivity bo'lganda proactive message
- Conversation lull'da proactive message

### 8.4. Analytics

- Qaysi proactive message'lar eng ko'p response oladi
- User engagement metrics

---

## 9. FAYLLAR RO'YXATI

### Yaratilishi Kerak:

1. `src/modules/ai/services/proactive-ai.service.ts` ⭐
2. `src/modules/ai/dto/proactive-request.dto.ts`
3. `src/modules/ai/dto/proactive-response.dto.ts`
4. `src/modules/ai/controllers/ai-chat.controller.ts` (o'zgartirish - endpoint qo'shish)
5. `src/modules/ai/ai.module.ts` (o'zgartirish - provider qo'shish)

### O'zgartirilmaydi:

- ✅ `src/modules/ai/services/ai-chat.service.ts`
- ✅ `src/modules/ai/services/gpt.service.ts`
- ✅ `src/modules/ai/services/pipeline/*` (barcha pipeline step'lar)
- ✅ `src/modules/ai/services/chroma.service.ts`
- ✅ `src/modules/ai/entities/*` (barcha entity'lar)
- ✅ `src/modules/ai/repositories/*` (barcha repository'lar)

---

## 10. TESTING STRATEGY

### 10.1. Unit Tests

```typescript
describe("ProactiveAIService", () => {
  it("should generate conversation starter", async () => {});
  it("should use user progress for context", async () => {});
  it("should generate TTS audio", async () => {});
});
```

### 10.2. Integration Tests

```typescript
describe("POST /ai/chat/proactive", () => {
  it("should return proactive message", async () => {});
  it("should validate session ownership", async () => {});
  it("should require payment", async () => {});
});
```

---

## XULOSA

Bu reja:

- ✅ Mavjud logikalarni buzmaydi
- ✅ Materiallardan kelib chiqadi
- ✅ AI o'zi gapga tortadi
- ✅ Minimal o'zgarishlar (faqat yangi service + endpoint)
- ✅ Mavjud struktura bilan mos keladi
- ✅ Testing qilish oson

**Keyingi qadam**: Implementation qilish (hech qanday o'zgartirishsiz, faqat qo'shimcha kod)
