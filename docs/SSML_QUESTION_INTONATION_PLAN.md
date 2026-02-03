# 📋 Reja: SSML Savol Ohangi (Question Intonation)

## 🎯 Muammo

Hozirgi holatda AI savol matni ham oddiy gap kabi o'qilayapti. Savol matni **savol ohangida** (question intonation) o'qilishi kerak.

**Misol:**

```
Javob: "نَعَمْ، إِنَّهُ بَيْتٌ أَيْضًا."
Savol: "أَيْنَ بَيْتٌ؟"
```

Hozirgi SSML:

```xml
<speak>نَعَمْ، إِنَّهُ بَيْتٌ أَيْضًا.<break time="1.5s"/>أَيْنَ بَيْتٌ؟</speak>
```

**Muammo:** Savol matni (`أَيْنَ بَيْتٌ؟`) oddiy gap kabi o'qilayapti, savol ohangida emas.

---

## 🔍 Hozirgi Kod Tahlili

### **1. SSML Utility (`ssml.util.ts`)**

**Mavjud funksiyalar:**

- ✅ `addPauseBetweenTexts()` - Pauza qo'shish
- ✅ `addEmphasis()` - Urg'u qo'shish
- ✅ `changeSpeakingRate()` - Tezlik o'zgartirish
- ❌ **Savol ohangi yo'q!**

**Hozirgi `addPauseBetweenTexts()` funksiyasi:**

```typescript
return `<speak>${mainText}${breakTag}${followUpText}</speak>`;
```

**Muammo:** `followUpText` (savol) oddiy text sifatida qo'shilayapti, savol ohangi yo'q.

---

### **2. Google Cloud TTS SSML Qo'llab-Quvvatlash**

**Google Cloud TTS SSML'da mavjud:**

- ✅ `<prosody>` - Ohang, tezlik, balandlik
- ✅ `<break>` - Pauza
- ✅ `<emphasis>` - Urg'u
- ✅ `<say-as>` - Maxsus format
- ❌ **To'g'ridan-to'g'ri "question intonation" tag'i yo'q**

**Yechim:** `<prosody>` tag'i bilan ohangni o'zgartirish:

- `pitch` - Balandlik (savollar uchun yuqoriroq)
- `contour` - Ohang konturi (savollar uchun oxirida ko'tarilish)

---

### **3. Savol Aniqlash (`question-detector.util.ts`)**

**Mavjud funksiya:**

- ✅ `isQuestion(text)` - Matnning savol ekanligini aniqlash
- ✅ `countQuestions(text)` - Savollar sonini sanash

**Foydalanish:** Savol matnini aniqlash uchun ishlatilishi mumkin.

---

## 📝 Reja: Savol Ohangi Qo'shish

### **1️⃣ Yangi SSML Utility Funksiyasi**

**Fayl:** `src/modules/ai/utils/ssml.util.ts`

**Yangi funksiya:**

```typescript
/**
 * Savol matniga savol ohangi qo'shish
 *
 * Google Cloud TTS'da savol ohangi uchun prosody contour ishlatiladi
 *
 * @param text - Savol matni
 * @param useSSML - SSML ishlatishmi
 * @returns SSML yoki oddiy text
 *
 * @example
 * addQuestionIntonation('أَيْنَ بَيْتٌ؟', true)
 * // Natija: <prosody contour="(0%,+0%) (50%,+5%) (100%,+10%)">أَيْنَ بَيْتٌ؟</prosody>
 */
export function addQuestionIntonation(
  text: string,
  useSSML: boolean = false,
): string {
  if (!useSSML || !text) {
    return text;
  }

  // Savol ohangi: oxirida balandlik ko'tariladi
  // Contour format: "(time%,pitch%) (time%,pitch%) ..."
  // 0% - boshlanish, 50% - o'rtasi, 100% - oxiri
  // +10% - oxirida 10% balandroq
  const questionContour = "(0%,+0%) (50%,+5%) (100%,+10%)";

  return `<prosody contour="${questionContour}">${text}</prosody>`;
}
```

**Yoki alternativ (pitch bilan):**

```typescript
export function addQuestionIntonation(
  text: string,
  useSSML: boolean = false,
): string {
  if (!useSSML || !text) {
    return text;
  }

  // Savol ohangi: pitch oshirish
  // +5% - 5% balandroq
  return `<prosody pitch="+5%">${text}</prosody>`;
}
```

---

### **2️⃣ `addPauseBetweenTexts()` Funksiyasini Yangilash**

**Fayl:** `src/modules/ai/utils/ssml.util.ts`

**O'zgartirish:**

```typescript
export function addPauseBetweenTexts(
  mainText: string,
  followUpText: string,
  pauseDuration: string = "1.5s",
  useSSML: boolean = false,
  isFollowUpQuestion: boolean = false, // ✅ YANGI: Savol ekanligini belgilash
): string {
  if (!mainText || !followUpText) {
    return mainText || followUpText || "";
  }

  // Agar SSML ishlatilmasa (OpenAI TTS), oddiy birlashtirish
  if (!useSSML) {
    return `${mainText} ${followUpText}`;
  }

  // SSML formatida pauza bilan birlashtirish (Google TTS)
  const breakTag = isValidPauseDuration(pauseDuration)
    ? `<break time="${pauseDuration}"/>`
    : `<break strength="${pauseDuration}"/>`;

  // ✅ YANGI: Agar follow-up savol bo'lsa, savol ohangi qo'shish
  const formattedFollowUp = isFollowUpQuestion
    ? addQuestionIntonation(followUpText, useSSML)
    : followUpText;

  return `<speak>${mainText}${breakTag}${formattedFollowUp}</speak>`;
}
```

---

### **3️⃣ GPTStepService'da Savol Aniqlash**

**Fayl:** `src/modules/ai/services/pipeline/gpt-step.service.ts`

**O'zgartirish (377 qator):**

```typescript
// ⏸️  SSML BREAK: Javob va savol orasiga pauza qo'shish
// Faqat Google TTS uchun SSML formatida, OpenAI uchun oddiy text
const useSSML = this.tts.supportsSSML();
const pauseDuration = "1.5s"; // 1.5 soniya pauza

// ✅ YANGI: Follow-up savol ekanligini tekshirish
const { isQuestion } = await import("../../utils/question-detector.util");
const isFollowUpQuestion = isQuestion(followUpResult.question);

const enrichedResponse = addPauseBetweenTexts(
  materialResponseResult.aiResponse,
  followUpResult.question,
  pauseDuration,
  useSSML,
  isFollowUpQuestion, // ✅ YANGI: Savol ekanligini o'tkazish
);
```

---

### **4️⃣ Google Cloud TTS Prosody Contour Format**

**Google Cloud TTS SSML'da `contour` parametri:**

**Format:**

```
contour="(time%,pitch%) (time%,pitch%) ..."
```

**Misol:**

```xml
<prosody contour="(0%,+0%) (50%,+5%) (100%,+10%)">أَيْنَ بَيْتٌ؟</prosody>
```

**Tushuntirish:**

- `(0%,+0%)` - Boshlanish: 0% vaqt, 0% pitch o'zgarishi
- `(50%,+5%)` - O'rtasi: 50% vaqt, +5% pitch (5% balandroq)
- `(100%,+10%)` - Oxiri: 100% vaqt, +10% pitch (10% balandroq)

**Yoki oddiy pitch:**

```xml
<prosody pitch="+5%">أَيْنَ بَيْتٌ؟</prosody>
```

---

## 🧪 Test Senaryolari

### **Test 1: Savol Ohangi Qo'shish**

**Input:**

```typescript
addQuestionIntonation("أَيْنَ بَيْتٌ؟", true);
```

**Expected Output:**

```xml
<prosody contour="(0%,+0%) (50%,+5%) (100%,+10%)">أَيْنَ بَيْتٌ؟</prosody>
```

---

### **Test 2: Javob + Savol (Pauza + Savol Ohangi)**

**Input:**

```typescript
addPauseBetweenTexts(
  "نَعَمْ، إِنَّهُ بَيْتٌ أَيْضًا.",
  "أَيْنَ بَيْتٌ؟",
  "1.5s",
  true,
  true, // isFollowUpQuestion
);
```

**Expected Output:**

```xml
<speak>نَعَمْ، إِنَّهُ بَيْتٌ أَيْضًا.<break time="1.5s"/><prosody contour="(0%,+0%) (50%,+5%) (100%,+10%)">أَيْنَ بَيْتٌ؟</prosody></speak>
```

---

### **Test 3: Javob + Statement (Pauza, Savol Ohangi Yo'q)**

**Input:**

```typescript
addPauseBetweenTexts(
  "نَعَمْ، إِنَّهُ بَيْتٌ أَيْضًا.",
  "هَذَا جَمِيلٌ.",
  "1.5s",
  true,
  false, // isFollowUpQuestion = false
);
```

**Expected Output:**

```xml
<speak>نَعَمْ، إِنَّهُ بَيْتٌ أَيْضًا.<break time="1.5s"/>هَذَا جَمِيلٌ.</speak>
```

---

## 📊 O'zgartirishlar Ro'yxati

### **1. Yangi Funksiya Qo'shish**

- **Fayl:** `src/modules/ai/utils/ssml.util.ts`
- **Funksiya:** `addQuestionIntonation()`
- **Maqsad:** Savol matniga savol ohangi qo'shish

### **2. Mavjud Funksiyani Yangilash**

- **Fayl:** `src/modules/ai/utils/ssml.util.ts`
- **Funksiya:** `addPauseBetweenTexts()`
- **O'zgartirish:** `isFollowUpQuestion` parametri qo'shish

### **3. GPTStepService Yangilash**

- **Fayl:** `src/modules/ai/services/pipeline/gpt-step.service.ts`
- **O'zgartirish:** Follow-up savol ekanligini tekshirish va `isFollowUpQuestion` o'tkazish

### **4. Test Qo'shish**

- **Fayl:** Test fayllar (agar mavjud bo'lsa)
- **Maqsad:** Savol ohangi to'g'ri ishlashini tekshirish

---

## ⚠️ Ehtiyotkorlik

### **Google Cloud TTS Contour Cheklovlari:**

- Contour format: `(time%,pitch%)` juftlari
- Time: 0% dan 100% gacha
- Pitch: -50% dan +50% gacha
- Minimum 2 nuqta kerak

### **Alternativ Yechim:**

Agar `contour` ishlamasa, oddiy `pitch` ishlatish:

```xml
<prosody pitch="+5%">أَيْنَ بَيْتٌ؟</prosody>
```

---

## 🎯 Xulosa

**Jami o'zgartirishlar:** 3 ta

- 1 ta yangi funksiya
- 1 ta mavjud funksiya yangilash
- 1 ta service yangilash

**Asosiy maqsad:** Savol matnini savol ohangida o'qish.

**Google Cloud TTS SSML qo'llab-quvvatlaydi:**

- ✅ `<prosody contour="...">` - Ohang konturi
- ✅ `<prosody pitch="...">` - Balandlik

**Test qilish:** Audio natijasini eshitib, savol ohangi to'g'ri ishlashini tekshirish.
