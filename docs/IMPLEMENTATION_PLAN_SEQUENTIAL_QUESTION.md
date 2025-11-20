# 📋 Reja: Material Ketma-Ketlik Savol Qoidasi

## 🎯 Maqsad

Material'dan topilgan javobdan keyin, agar material'da ketma-ket savol bo'lsa, uni birinchi ustuvorlik bilan qo'shish.

**Misol:**

```
Material (1-dars):
1. Ma haza ya farid? (savol)
2. Haza burtukol (javob)
3. Hal huva laziz? (savol)
4. Nam innahu lazizun jiddan (javob)

User: "Ma haza ya farid?"
AI javob: "Haza burtukol. Hal huva laziz?" (2 va 3 qatorlarni birga)
```

---

## 📝 O'zgartirishlar Ro'yxati

### **1️⃣ MaterialMatchResult Interface'ni Kengaytirish**

**Fayl:** `src/modules/ai/services/pipeline/matchers/material-matching.service.ts`  
**Qator:** 13-23

**O'zgartirish:**

```typescript
export interface MaterialMatchResult {
  nextSentence: string;
  lessonOrder: number | null;
  translationUz: string | null;
  // ✅ YANGI: Keyingi gap (next'ning next'i) - agar savol bo'lsa
  nextNextSentence: string | null; // Material'dan keyingi gap (agar mavjud bo'lsa)
  nextNextTranslationUz: string | null; // Keyingi gapning tarjimasi
  // ... existing fields
}
```

**Sabab:** Material'dan keyingi gapni (next'ning next'ini) saqlash uchun.

---

### **2️⃣ MaterialMatchingService'da Keyingi Gapni Topish**

**Fayl:** `src/modules/ai/services/pipeline/matchers/material-matching.service.ts`  
**Qator:** 160-166 (result.nextSentence topilganda)

**O'zgartirish:**

```typescript
// Agar keyingi gap topilgan va u user gapining o'zi bo'lmasa
if (candidate && candidate.length > 1 && !isFinalCandidateSameAsUser) {
  result.nextSentence = candidate;
  result.lessonOrder = lessonOrder;
  result.translationUz = candidateTranslationUz;

  // ✅ YANGI: Keyingi gapni (next'ning next'ini) topish
  const nextNextResult = this.findNextNextSentence(
    candidate,
    matchedTurn,
    turnsWithNext,
    sentences,
    i,
    lessonOrder,
  );
  result.nextNextSentence = nextNextResult.sentence;
  result.nextNextTranslationUz = nextNextResult.translationUz;

  console.log(
    `   ✅ Material match: "${s.substring(0, 40)}" → "${candidate.substring(0, 40)}"`,
  );
  return result;
}
```

**Yangi metod qo'shish:**

```typescript
/**
 * Keyingi gapni (next'ning next'ini) topish
 * Agar keyingi gap savol bo'lsa, uni qaytarish
 */
private findNextNextSentence(
    currentNext: string,
    matchedTurn: any,
    turnsWithNext: Array<{ text: string; next: string | null; nextTranslationUz: string | null }>,
    sentences: Array<{ text: string; translationUz: string | null }>,
    currentIndex: number,
    lessonOrder: number
): { sentence: string | null; translationUz: string | null } {
    // 1. Avval matchedTurn.next'ning next'ini tekshirish
    if (matchedTurn?.next) {
        const nextTurn = turnsWithNext.find(t =>
            normalizeText(t.text) === normalizeText(matchedTurn.next)
        );
        if (nextTurn?.next) {
            // Keyingi gap topildi
            return {
                sentence: nextTurn.next,
                translationUz: nextTurn.nextTranslationUz || null
            };
        }
    }

    // 2. Agar next key yo'q bo'lsa, sentences massividan keyingi gapni topish
    // currentNext'ni topish va uning keyingisini olish
    const currentNextIndex = sentences.findIndex(s =>
        normalizeText(s.text) === normalizeText(currentNext)
    );

    if (currentNextIndex !== -1 && currentNextIndex + 1 < sentences.length) {
        const nextNextSentence = sentences[currentNextIndex + 1];
        return {
            sentence: nextNextSentence.text,
            translationUz: nextNextSentence.translationUz
        };
    }

    return { sentence: null, translationUz: null };
}
```

**Sabab:** Material'dan keyingi gapni (next'ning next'ini) topish uchun.

---

### **3️⃣ Material Sequential Follow-up Service Yaratish**

**Yangi fayl:** `src/modules/ai/services/pipeline/builders/material-sequential-followup.service.ts`

**Maqsad:** Material'dan ketma-ketlikni tekshirish va savol topish.

**Kod:**

```typescript
import { Injectable } from "@nestjs/common";
import { isQuestion } from "../../../utils/question-detector.util";
import { FollowUpQuestion } from "./material-followup.service";

@Injectable()
export class MaterialSequentialFollowUpService {
  /**
   * Material'dan ketma-ketlikni tekshirish
   * Agar material javobdan keyin ketma-ket savol bo'lsa, uni qaytarish
   *
   * @param materialMatch - Material match natijasi
   * @returns Follow-up savol yoki null
   */
  findSequentialFollowUp(materialMatch: {
    nextSentence: string;
    nextNextSentence: string | null;
    nextNextTranslationUz: string | null;
    lessonOrder: number | null;
  }): FollowUpQuestion | null {
    // Agar keyingi gap mavjud bo'lsa va u savol bo'lsa
    if (
      materialMatch.nextNextSentence &&
      isQuestion(materialMatch.nextNextSentence)
    ) {
      console.log(
        `[MaterialSequential] Ketma-ket savol topildi: "${materialMatch.nextNextSentence}"`,
      );
      return {
        question: materialMatch.nextNextSentence,
        questionUz: materialMatch.nextNextTranslationUz || undefined,
        source: "material",
        confidence: 0.95, // Eng yuqori confidence (birinchi ustuvorlik)
      };
    }

    return null;
  }
}
```

**Sabab:** Material ketma-ketlikni alohida service'da boshqarish.

---

### **4️⃣ HybridFollowUpService'ga Sequential Qo'shish**

**Fayl:** `src/modules/ai/services/pipeline/builders/hybrid-followup.service.ts`  
**Qator:** 30-94

**O'zgartirish:**

```typescript
import { MaterialSequentialFollowUpService } from "./material-sequential-followup.service";

@Injectable()
export class HybridFollowUpService {
    constructor(
        private readonly materialFollowUp: MaterialFollowUpService,
        private readonly aiFollowUp: AIFollowUpService,
        private readonly materialSequentialFollowUp: MaterialSequentialFollowUpService, // ✅ YANGI
        private readonly translation: TranslationService
    ) {}

    async generateFollowUp(
        currentResponse: string,
        conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
        context: any[],
        lastWatchedLessonOrder: number,
        materialMatch?: { // ✅ YANGI: Material match ma'lumotlari
            nextNextSentence: string | null;
            nextNextTranslationUz: string | null;
            lessonOrder: number | null;
        }
    ): Promise<HybridFollowUpResult | null> {
        console.log('🔄 [HybridFollowUp] Boshlandi...');

        // ✅ YANGI: Phase 0 - Material ketma-ketlik (BIRINCHI USTUVORLIK)
        if (materialMatch) {
            const sequentialResult = this.materialSequentialFollowUp.findSequentialFollowUp(materialMatch);
            if (sequentialResult && sequentialResult.confidence >= this.MIN_CONFIDENCE) {
                console.log(`✅ [HybridFollowUp] Material ketma-ketlik topildi (confidence: ${sequentialResult.confidence})`);
                return await this.formatResult(sequentialResult, 'material-sequential');
            }
        }

        // Phase 1 & 2: Parallel qidirish (mavjud logika)
        const [materialResult, aiResult] = await Promise.all([
            this.materialFollowUp.findFollowUp(...),
            this.aiFollowUp.generateFollowUp(...)
        ]);

        // Phase 1: Material result (ikkinchi ustuvorlik)
        if (materialResult && materialResult.confidence >= this.MIN_CONFIDENCE) {
            console.log(`✅ [HybridFollowUp] Material'dan topildi (confidence: ${materialResult.confidence})`);
            return await this.formatResult(materialResult, 'material-exact');
        }

        // Phase 2: AI result (uchinchi ustuvorlik)
        if (aiResult && aiResult.confidence >= this.MIN_CONFIDENCE) {
            console.log(`✅ [HybridFollowUp] AI yaratdi (confidence: ${aiResult.confidence})`);
            return await this.formatResult(aiResult, 'ai-generated');
        }

        // Phase 3: Topilmadi
        console.log('❌ [HybridFollowUp] Follow-up topilmadi yoki confidence past');
        return null;
    }
}
```

**Sabab:** Material ketma-ketlikni birinchi ustuvorlik bilan qo'llash.

---

### **5️⃣ GPTStepService'da Material Match'ni O'tkazish**

**Fayl:** `src/modules/ai/services/pipeline/gpt-step.service.ts`  
**Qator:** 333-360

**O'zgartirish:**

```typescript
// Valid material response
const materialResponseResult =
  await this.fallbackResponse.createMaterialResponse(
    materialMatch.nextSentence,
    materialMatch.translationUz,
    context,
    lastWatchedLessonOrder,
  );

// Material javobga follow-up savol qo'shish (faqat engagement yoqilgan bo'lsa)
if (this.enableUserEngagement) {
  try {
    const { isQuestion } = await import("../../utils/question-detector.util");
    const materialIsQuestion = isQuestion(materialResponseResult.aiResponse);

    if (materialIsQuestion) {
      console.log(
        "ℹ️  Material javob o'zi savol, follow-up qo'shilmaydi (1 response = 1 savol)",
      );
    } else {
      console.log(
        "🔄 Material javobga follow-up savol qo'shilmoqda (Hybrid)...",
      );

      // ✅ YANGI: Material match ma'lumotlarini o'tkazish
      const followUpResult = await this.hybridFollowUp.generateFollowUp(
        materialResponseResult.aiResponse,
        conversationHistory,
        context,
        lastWatchedLessonOrder,
        {
          // ✅ Material match ma'lumotlari
          nextNextSentence: materialMatch.nextNextSentence || null,
          nextNextTranslationUz: materialMatch.nextNextTranslationUz || null,
          lessonOrder: materialMatch.lessonOrder,
        },
      );

      // ... existing code
    }
  } catch (error) {
    // ... existing code
  }
}
```

**Sabab:** Material match ma'lumotlarini HybridFollowUpService'ga o'tkazish.

---

### **6️⃣ AI Module'ga Yangi Service Qo'shish**

**Fayl:** `src/modules/ai/ai.module.ts`

**O'zgartirish:**

```typescript
import { MaterialSequentialFollowUpService } from './services/pipeline/builders/material-sequential-followup.service';

@Module({
    // ... existing imports
    providers: [
        // ... existing providers
        MaterialSequentialFollowUpService, // ✅ YANGI
    ],
    // ... rest of module
})
```

**Sabab:** Yangi service'ni dependency injection'ga qo'shish.

---

### **7️⃣ HybridFollowUpResult Interface'ni Yangilash**

**Fayl:** `src/modules/ai/services/pipeline/builders/hybrid-followup.service.ts`  
**Qator:** 22-28

**O'zgartirish:**

```typescript
export interface HybridFollowUpResult {
  question: string;
  questionUz: string;
  source: "material" | "ai" | "pattern";
  confidence: number;
  method:
    | "material-sequential"
    | "material-exact"
    | "material-pattern"
    | "ai-generated"; // ✅ YANGI: material-sequential
}
```

**Sabab:** Yangi method type'ni qo'shish.

---

### **8️⃣ Documentation Yangilash**

**Fayl:** `docs/AI_QUESTION_FLOW.md`

**O'zgartirish:**

- Yangi qoida qo'shish: "Material Sequential Follow-up Rule"
- Ustuvorlik tartibini yangilash
- Misollar qo'shish

**Fayl:** `docs/AI_RULES.md`

**O'zgartirish:**

- Yangi qoida qo'shish: "Material Sequential Priority Rule"

---

## 🔄 Ustuvorlik Tartibi (Yangi)

```
1. ✅ Material Sequential Follow-up (confidence: 0.95) - BIRINCHI USTUVORLIK
   └─ Material'dan ketma-ketlik (next'ning next'i savol bo'lsa)
      ↓
2. Material Follow-up (confidence: 0.9) - IKKINCHI USTUVORLIK
   └─ Material'dan entity-based pattern
      ↓
3. AI Follow-up (confidence: 0.8) - UCHINCHI USTUVORLIK
   └─ AI o'zi yaratadi (qat'iy qoidalar bilan)
      ↓
4. Follow-up yo'q (confidence < 0.6)
```

---

## ✅ Tekshiruvlar

### **Asosiy Qoidalar:**

- ✅ Bitta response'da faqat 1 ta savol (mavjud qoida saqlanadi)
- ✅ Material sequential birinchi ustuvorlik
- ✅ Boshqa logikalar buzilmaydi

### **Edge Cases:**

- ✅ Agar `nextNextSentence` null bo'lsa → keyingi phase'ga o'tish
- ✅ Agar `nextNextSentence` savol emas bo'lsa → keyingi phase'ga o'tish
- ✅ Agar materialMatch yo'q bo'lsa → mavjud logika ishlaydi

---

## 📊 Test Senaryolari

### **Test 1: Material Sequential Topildi**

```
Input: "Ma haza ya farid?"
Material Match:
  - nextSentence: "Haza burtukol"
  - nextNextSentence: "Hal huva laziz?"
Expected: "Haza burtukol. Hal huva laziz?"
```

### **Test 2: Material Sequential Yo'q, Material Follow-up Topildi**

```
Input: "Haza burtukol"
Material Match:
  - nextSentence: "Nam innahu lazizun jiddan"
  - nextNextSentence: null
Material Follow-up: "أَيْنَ الْكِتَابُ؟"
Expected: "Nam innahu lazizun jiddan. أَيْنَ الْكِتَابُ؟"
```

### **Test 3: Material Sequential Yo'q, AI Follow-up Topildi**

```
Input: "Haza burtukol"
Material Match:
  - nextSentence: "Nam innahu lazizun jiddan"
  - nextNextSentence: null
Material Follow-up: null
AI Follow-up: "هَلْ هُوَ كِتَابُكَ؟"
Expected: "Nam innahu lazizun jiddan. هَلْ هُوَ كِتَابُكَ؟"
```

---

## 🎯 Xulosa

**Jami o'zgartirishlar:** 8 ta

- 1 ta interface kengaytirish
- 1 ta yangi metod
- 1 ta yangi service
- 3 ta mavjud service o'zgartirish
- 1 ta module yangilash
- 1 ta documentation yangilash

**Asosiy maqsad:** Material ketma-ketlikni birinchi ustuvorlik bilan qo'llash, boshqa logikalar buzilmasligi.
