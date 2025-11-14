# AI Modul - Struktura va Arxitektura

## 📁 File Struktura

```
ai/
├── ai.module.ts                    # Modul konfiguratsiyasi
├── commands/                       # CLI komandalar
│   ├── index-lessons.commanad.ts   # Darslarni index qilish komandasi
│   └── run-index-lessons.ts       # Index komandani ishga tushirish
├── constants/                      # Konstanta va enum'lar
│   ├── ai-constants.ts            # AI limitlar va sozlamalar
│   ├── error-codes.enum.ts        # Xato kodlari
│   ├── error-messages.constant.ts # Xato xabarlari
│   └── gpt-examples.constants.ts  # GPT misollar
├── controllers/                    # HTTP endpoint'lar
│   ├── ai-chat.controller.ts      # Chat API (text/voice)
│   └── ai-admin.controller.ts     # Admin API
├── dto/                           # Data Transfer Objects
│   ├── chat-response.dto.ts       # Chat javob formati
│   ├── voice-request.dto.ts       # Voice so'rov formati
│   └── error-response.dto.ts      # Xato javob formati
├── entities/                      # Database entity'lar
│   ├── ai-chat-session.entity.ts  # Chat sessiyalari
│   ├── ai-chat-message.entity.ts  # Chat xabarlari
│   ├── user-ai-profile.entity.ts  # User AI profili
│   ├── user-course-progress.entity.ts # User progress
│   └── ai-usage-cost.entity.ts    # Xarajatlar
├── exceptions/                    # Custom exception'lar
│   ├── limit-exceeded.exception.ts
│   ├── payment-required.exception.ts
│   └── ...
├── filters/                       # Exception filter'lar
│   └── ai-exception.filter.ts     # AI xatolarini filter qilish
├── guards/                        # Auth guard'lar
│   └── payment.guard.ts           # To'lov tekshiruvi
├── interfaces/                    # Repository interface'lar
│   ├── ai-chat-session.repository.ts
│   ├── ai-chat-message.repository.ts
│   └── ...
├── repositories/                  # Repository implementatsiyalari
│   ├── ai-chat-session.repository.ts
│   ├── ai-chat-message.repository.ts
│   └── ...
├── services/                      # Business logic
│   ├── ai-chat.service.ts         # Asosiy chat servisi
│   ├── gpt.service.ts             # GPT API integratsiyasi
│   ├── whisper.service.ts         # Speech-to-Text (STT)
│   ├── tts.service.ts             # Text-to-Speech (TTS)
│   ├── chroma.service.ts          # RAG (Vector DB)
│   ├── translation.service.ts     # Tarjima servisi
│   ├── voice-processing-pipeline.service.ts # Voice pipeline
│   ├── user-course-progress.service.ts      # Progress tracking
│   ├── cost-calculation.service.ts          # Xarajat hisoblash
│   ├── limit-check.service.ts               # Limit tekshiruvi
│   ├── gpt-prompt-builder.service.ts        # Prompt yaratish
│   ├── chroma-connection.service.ts         # Chroma ulanish
│   ├── chroma-embedding.service.ts          # Embedding yaratish
│   ├── chroma-search.service.ts             # Vector qidiruv
│   ├── memory-index.service.ts              # Memory index
│   ├── lesson-indexing.service.ts           # Darslarni index qilish
│   └── pipeline/                  # Pipeline step'lar
│       ├── stt-step.service.ts    # STT qadami
│       ├── validation-step.service.ts
│       ├── context-step.service.ts
│       ├── gpt-step.service.ts
│       └── response-step.service.ts
└── utils/                         # Utility funksiyalar
    ├── audio.util.ts              # Audio processing
    ├── arabic-text.util.ts        # Arabic text utils
    └── user-progress-calculator.util.ts
```

## 🎯 Har bir File Maqsadi

### **Controllers**

- **ai-chat.controller.ts**: Text va voice chat endpoint'larini ta'minlaydi
- **ai-admin.controller.ts**: Admin uchun statistika va boshqaruv

### **Services (Asosiy)**

- **ai-chat.service.ts**: Chat so'rovlarini boshqaradi, pipeline'ni boshqaradi
- **gpt.service.ts**: OpenAI GPT API bilan aloqa
- **whisper.service.ts**: Audio'ni text'ga aylantiradi
- **tts.service.ts**: Text'ni audio'ga aylantiradi
- **chroma.service.ts**: RAG tizimi - vector qidiruv va kontekst olish
- **translation.service.ts**: Matnlarni tarjima qilish

### **Services (Yordamchi)**

- **voice-processing-pipeline.service.ts**: Voice so'rovlarni step-by-step qayta ishlash
- **user-course-progress.service.ts**: User progress'ni kuzatish
- **cost-calculation.service.ts**: API xarajatlarini hisoblash
- **limit-check.service.ts**: User limitlarini tekshirish
- **gpt-prompt-builder.service.ts**: GPT uchun prompt yaratish
- **chroma-\*.service.ts**: ChromaDB bilan ishlash (connection, embedding, search)
- **memory-index.service.ts**: Memory index'ni boshqarish
- **lesson-indexing.service.ts**: Darslarni vector DB'ga index qilish

### **Pipeline Services**

- **stt-step.service.ts**: Audio → Text konvertatsiya
- **validation-step.service.ts**: Input validatsiya
- **context-step.service.ts**: Kontekst yig'ish (RAG, progress)
- **gpt-step.service.ts**: GPT'ga so'rov yuborish
- **response-step.service.ts**: Javobni formatlash

### **Repositories**

- Database operatsiyalari (CRUD)
- Interface va Implementation ajratilgan (Dependency Injection)

### **Entities**

- Database jadvallari (TypeORM)

### **DTOs**

- Request/Response formatlari
- Validation qoidalari

### **Exceptions & Filters**

- Custom xatolar va ularni handle qilish

## 🔄 Asosiy Oqim (Flow)

### Text Chat:

```
Controller → AIChatService → ContextStep → GPTPromptBuilder → GPTService → Response
```

### Voice Chat:

```
Controller → VoiceProcessingPipeline →
  STTStep → ValidationStep → ContextStep → GPTStep → TTSStep → Response
```

### RAG (Retrieval Augmented Generation):

```
User Query → ChromaSearch → Vector Search → Context Retrieval → GPT Prompt → Response
```

## 🏗️ Arxitektura Prinsiplari

1. **Separation of Concerns**: Har bir servis bitta vazifani bajaradi
2. **Dependency Injection**: Interface'lar orqali coupling kamaytirilgan
3. **Pipeline Pattern**: Voice processing step-by-step
4. **Repository Pattern**: Database logikasi ajratilgan
5. **RAG Architecture**: Vector DB orqali kontekst olish
