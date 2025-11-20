# 🔄 AI Savol Berish Ketma-Ketligi

Bu hujjat AI'ning foydalanuvchi savoliga javob bergandan keyin qanday qilib o'zi savol berishini tushuntiradi.

---

## 📋 Umumiy Ketma-Ketlik

```
1. Foydalanuvchi savol beradi
   ↓
2. AI javob beradi (material'dan yoki GPT'dan)
   ↓
3. AI javobni tekshiradi: Savol bormi?
   ├─ Agar AI javob o'zi savol bo'lsa → Follow-up qo'shmaslik ❌
   └─ Agar AI javob statement bo'lsa → Follow-up qidirish ✅
      ↓
4. Hybrid Follow-up Service ishga tushadi
   ├─ Phase 1: Material'dan qidirish (parallel)
   └─ Phase 2: AI o'zi yaratish (parallel)
      ↓
5. Natijani tanlash (confidence bo'yicha)
   ├─ Material topildi (≥0.6) → Material savol ✅
   ├─ AI yaratdi (≥0.6) → AI savol ✅
   └─ Topilmadi (<0.6) → Savol bermaslik ❌
      ↓
6. Final response: Material javob + Follow-up savol
```

---

## 🔍 Batafsil Ketma-Ketlik

### **1️⃣ Boshlang'ich Tekshiruv**

**Fayl:** `src/modules/ai/services/pipeline/gpt-step.service.ts`  
**Qator:** 343-351

```typescript
// Material javobga follow-up savol qo'shish (faqat engagement yoqilgan bo'lsa)
if (this.enableUserEngagement) {
    // ⚠️ RULE: Agar material response o'zi savol bo'lsa, follow-up qo'shmaslik
    const materialIsQuestion = isQuestion(materialResponseResult.aiResponse);

    if (materialIsQuestion) {
        // ❌ Follow-up qo'shmaslik
        return materialResponse; // Faqat material savol
    } else {
        // ✅ Follow-up qidirish
        const followUpResult = await this.hybridFollowUp.generateFollowUp(...)
    }
}
```

**Qoida:** Bitta response'da faqat **1 ta savol** bo'lishi kerak.

**Savol aniqlash:**

- `؟` yoki `?` bilan tugasa
- `هَلْ` (hal), `مَا` (ma), `مَنْ` (man), `أَيْنَ` (ayna) va h.k. bilan boshlansa

---

### **2️⃣ Hybrid Follow-up Service**

**Fayl:** `src/modules/ai/services/pipeline/builders/hybrid-followup.service.ts`  
**Qator:** 50-94

#### **Phase 1 & 2: Parallel Qidirish**

```typescript
// ⚡ OPTIMIZATION: Parallel processing
const [materialResult, aiResult] = await Promise.all([
    // Phase 1: Material-based follow-up
    this.materialFollowUp.findFollowUp(...),
    // Phase 2: AI-generated follow-up (parallel)
    this.aiFollowUp.generateFollowUp(...)
]);
```

**Ikki yo'nalish parallel ishlaydi:**

---

### **3️⃣ Material Follow-up Service**

**Fayl:** `src/modules/ai/services/pipeline/builders/material-followup.service.ts`  
**Qator:** 33-64

#### **Ketma-Ketlik:**

```
1. Current response'dan entity ajratish
   ├─ Entity topildi → Keyingi qadamga
   └─ Entity topilmadi → null qaytarish ❌
      ↓
2. Material'dan entity'ga aloqador pattern qidirish
   ├─ Pattern topildi → confidence: 0.9 ✅
   └─ Pattern topilmadi → Keyingi qadamga
      ↓
3. Generic pattern'lardan foydalanish
   ├─ Obyektlar: "أَيْنَ {entity}؟" (confidence: 0.7)
   ├─ Shaxslar: "مَنْ {entity}؟" (confidence: 0.7)
   └─ Joylar: "مَاذَا فِي {entity}؟" (confidence: 0.7)
```

#### **Entity Pattern'lar:**

**Obyektlar:**

- كِتَابٌ (kitob), قَلَمٌ (qalam), دَفْتَرٌ (daftar)
- مَوْزٌ (banan), بُرْتُقَالٌ (apelsin), تُفَّاحٌ (olma)
- مِكْتَبٌ (stol), كُرْسِيٌّ (stul), حَقِيبَةٌ (sumka), بَيْتٌ (uy)

**Kasblar:**

- طَبِيبٌ (shifokor), مُعَلِّمٌ (o'qituvchi), طَالِبٌ (talaba)

**Joylar:**

- مَدْرَسَةٌ (maktab), مَسْجِدٌ (masjid), سُوقٌ (bozor)

---

### **4️⃣ AI Follow-up Service**

**Fayl:** `src/modules/ai/services/pipeline/builders/ai-followup.service.ts`  
**Qator:** 35-105

#### **Ketma-Ketlik:**

```
1. Conversation entities ajratish
   ├─ Entity topildi → Keyingi qadamga
   └─ Entity topilmadi → null qaytarish ❌
      ↓
2. Material vocabulary yig'ish
   └─ Faqat foydalanuvchi ko'rgan darslar (lastWatchedLessonOrder)
      ↓
3. Strict system prompt yaratish
   └─ Qat'iy qoidalar bilan prompt
      ↓
4. GPT'ga so'rov (freeMode: true)
   └─ Custom qoidalar bilan erkin rejim
      ↓
5. Validatsiya
   ├─ Savol belgisi bormi? (؟)
   ├─ Entity eslatilganmi?
   └─ Barchasi to'g'ri → confidence: 0.8 ✅
```

#### **Qat'iy Qoidalar:**

1. ✅ **Faqat conversation'dagi entity'lar haqida** so'rash
2. ✅ **Faqat material vocabulary'dan** foydalanish
3. ✅ **Bitta qisqa savol** (to'liq diacritics bilan)
4. ✅ **Savol `؟` bilan tugashi** kerak
5. ❌ **Yangi mavzu kiritmaslik**
6. ❌ **Suhbatda yo'q entity haqida so'ramaslik**

#### **Misol:**

**To'g'ri savol:**

```
Entity: كِتَابٌ (kitob)
Savol: "أَيْنَ الْكِتَابُ؟" (Kitob qayerda?)
```

**Noto'g'ri savol:**

```
❌ "مَا اسْمُكَ؟" (Ismingiz nima?) - Yangi mavzu
❌ "أَيْنَ أَبُوكَ؟" (Otangiz qayerda?) - Yangi entity
```

---

### **5️⃣ Natijani Tanlash**

**Fayl:** `src/modules/ai/services/pipeline/builders/hybrid-followup.service.ts`  
**Qator:** 79-93

#### **Prioritet:**

```
1. Material result (confidence ≥ 0.6)
   └─ ✅ Material'dan topildi (90%+ confidence)
      ↓
2. AI result (agar material topilmasa, confidence ≥ 0.6)
   └─ ✅ AI yaratdi (80% confidence)
      ↓
3. Topilmadi (confidence < 0.6)
   └─ ❌ Follow-up yo'q
```

**Minimum confidence:** `0.6`

---

### **6️⃣ Final Response**

**Fayl:** `src/modules/ai/services/pipeline/gpt-step.service.ts`  
**Qator:** 363-390

```typescript
if (followUpResult && followUpResult.question) {
  // ⏸️ SSML BREAK: Javob va savol orasiga pauza qo'shish
  const enrichedResponse = addPauseBetweenTexts(
    materialResponseResult.aiResponse,
    followUpResult.question,
    "1.5s", // 1.5 soniya pauza
    useSSML,
  );

  return {
    aiResponse: enrichedResponse,
    aiResponseUz: `${materialResponseResult.aiResponseUz} ${followUpResult.questionUz}`,
  };
}
```

**Format:**

```
Material javob + [1.5s pauza] + Follow-up savol
```

---

## 📊 Qoida Jadvali

| #   | Qoida                                   | Fayl                           | Qator      | Priority  |
| --- | --------------------------------------- | ------------------------------ | ---------- | --------- |
| 1   | **One Question Per Response**           | `gpt-step.service.ts`          | 345-351    | 🔴 High   |
| 2   | **Material Match Priority**             | `hybrid-followup.service.ts`   | 79-82      | 🔴 High   |
| 3   | **Entity-based Follow-up**              | `material-followup.service.ts` | 39-44      | 🟡 Medium |
| 4   | **Context-aware (Material vocabulary)** | `ai-followup.service.ts`       | 51         | 🟡 Medium |
| 5   | **No New Topics**                       | `ai-followup.service.ts`       | 125-126    | 🟡 Medium |
| 6   | **Confidence Threshold (≥0.6)**         | `hybrid-followup.service.ts`   | 33, 80, 86 | 🟢 Low    |
| 7   | **Future Lesson Block**                 | `material-followup.service.ts` | 118-120    | 🔴 High   |

---

## 🎯 Misollar

### **Misol 1: Material javob savol**

```
Input: "أسكن في الشارع الذي أمام المحكمة"
Material Response: "هَلْ يَعْمَلُ أَبُوكَ فِي الْمَحْكَمَةِ؟"
Result: ❌ Follow-up qo'shmaslik (material o'zi savol)
```

### **Misol 2: Material javob statement + Material follow-up**

```
Input: "السلام عليكم"
Material Response: "وَعَلَيْكُمُ السَّلَامُ"
Entity: None
Material Follow-up: ❌ Topilmadi
AI Follow-up: ❌ Topilmadi
Result: ❌ Follow-up yo'q
```

### **Misol 3: Material javob statement + Entity + Material follow-up**

```
Input: "هذا كتاب"
Material Response: "نعم، هذا كتاب"
Entity: كِتَابٌ
Material Follow-up: "أَيْنَ الْكِتَابُ؟" (confidence: 0.9)
Result: ✅ "نعم، هذا كتاب [1.5s] أَيْنَ الْكِتَابُ؟"
```

### **Misol 4: Material javob statement + Entity + AI follow-up**

```
Input: "هذا كتاب"
Material Response: "نعم، هذا كتاب"
Entity: كِتَابٌ
Material Follow-up: ❌ Topilmadi
AI Follow-up: "هَلْ هُوَ كِتَابُكَ؟" (confidence: 0.8)
Result: ✅ "نعم، هذا كتاب [1.5s] هَلْ هُوَ كِتَابُكَ؟"
```

---

## 🔧 Konfiguratsiya

### **Enable/Disable Follow-up**

**Fayl:** `src/modules/ai/services/pipeline/gpt-step.service.ts`

```typescript
private readonly enableUserEngagement: boolean = true; // false qilsa, follow-up o'chadi
```

### **Confidence Threshold**

**Fayl:** `src/modules/ai/services/pipeline/builders/hybrid-followup.service.ts`

```typescript
private readonly MIN_CONFIDENCE = 0.6; // 0.0 - 1.0 oralig'ida
```

### **Pause Duration**

**Fayl:** `src/modules/ai/services/pipeline/gpt-step.service.ts`

```typescript
const pauseDuration = "1.5s"; // Javob va savol orasidagi pauza
```

---

## 📝 Xulosa

AI savol berish ketma-ketligi:

1. ✅ **Material javob savol emasligini** tekshirish
2. ✅ **Parallel qidirish:** Material va AI
3. ✅ **Prioritet:** Material > AI
4. ✅ **Validatsiya:** Confidence ≥ 0.6
5. ✅ **Format:** Material javob + pauza + Follow-up savol

**Asosiy qoida:** Bitta response'da faqat **1 ta savol** bo'lishi kerak.
