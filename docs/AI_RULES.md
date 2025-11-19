# 🎯 AI Response Rules

## Asosiy Qoidalar

### 1️⃣ One Question Per Response Rule

**Qoida:** Bitta AI response'da faqat **1 ta savol** bo'lishi kerak.

**Sabab:**
- User experience yaxshiroq (confusion yo'q)
- Dialog tabiiy oqadi
- Bir vaqtda bir narsaga fokus

**Implementation:**
- File: `src/modules/ai/services/pipeline/gpt-step.service.ts`
- Utility: `src/modules/ai/utils/question-detector.util.ts`

**Logika:**
```typescript
// Material response savol ekanligini tekshirish
if (isQuestion(materialResponse)) {
  // Follow-up qo'shmaslik
  return materialResponse; // Faqat material savol
} else {
  // Follow-up qo'shish mumkin
  return materialResponse + followUpQuestion;
}
```

**Misol:**

❌ **Noto'g'ri:**
```
AI: "هَلْ يَعْمَلُ أَبُوكَ فِي الْمَحْكَمَةِ؟ هَلْ تَسْكُنُ أَخكَ فِي شَقَّةٍ؟"
    (Otang sudda ishlaydi? Akangiz kvartida yashaydi?)
    2 ta savol ❌
```

✅ **To'g'ri:**
```
AI: "هَلْ يَعْمَلُ أَبُوكَ فِي الْمَحْكَمَةِ؟"
    (Otang sudda ishlaydi?)
    1 ta savol ✓
```

**Savol aniqlash:**
- `؟` yoki `?` bilan tugasa
- `هَلْ` (hal) bilan boshlansa
- `مَا` (ma), `مَنْ` (man), `أَيْنَ` (ayna) va h.k.

---

### 2️⃣ Material Match Priority Rule

**Qoida:** Material'dan topilgan javob **GPT'dan ustun**.

**Sabab:**
- Material darsga mos
- To'g'ri grammatika
- User progressiga mos

---

### 3️⃣ Ha/Yo'q Response Rule

**Qoida:** Ha/yo'q javoblar material matchingdan **o'tkazib yuboriladi**.

**Sabab:**
- Oddiy tasdiqlash/rad etish
- Context-aware bo'lishi kerak (GPT history bilan)
- Material'da exact match yo'q

**Implementation:**
- File: `src/modules/ai/utils/text-normalization.util.ts`
- Function: `isYesNoResponse()`

---

### 4️⃣ Future Lesson Block Rule

**Qoida:** User hali ko'rmagan darslar materialini **ko'rsatmaslik**.

**Sabab:**
- User bu darsga tayyorlanmagan
- Yangi so'zlar, grammatika bilmaydi

**Check:**
```typescript
if (materialLessonOrder > userLastWatchedLesson) {
  return "Siz hali bu darsga kelmagansiz";
}
```

**Exception:** Agar bir nechta lessonOrder topilsa, eng kichigi `<= userProgress` bo'lsa, ruxsat beriladi.

---

### 5️⃣ Cache Consistency Rule

**Qoida:** Cached response **original bilan bir xil** bo'lishi kerak.

**Sabab:**
- Response structure o'zgarmasligi
- Logika buzilmasligi
- Predictability

---

### 6️⃣ Engagement Balance Rule

**Qoida:** Follow-up savollar **context-aware** va **relevant** bo'lishi kerak.

**Priority:**
1. Material'dan topilgan savol (90%+ confidence)
2. AI yaratgan savol (80%+ confidence)
3. Follow-up yo'q (confidence past)

**Anti-pattern:**
- Yangi mavzu kiritmaslik
- Suhbatda yo'q entity haqida so'ramaslik
- Random savol bermaslik

---

## 🧪 Testing

### One Question Rule Test:
```bash
# Material response savol
Input: "أسكن في الشارع الذي أمام المحكمة"
Material: "هَلْ يَعْمَلُ أَبُوكَ فِي الْمَحْكَمَةِ؟"
Expected: Faqat material savol (follow-up yo'q)
Log: "ℹ️  Material javob o'zi savol, follow-up qo'shilmaydi"

# Material response statement
Input: "السلام عليكم"
Material: "وَعَلَيْكُمُ السَّلَامُ"
Expected: Material + follow-up savol (agar mavjud bo'lsa)
Log: "🔄 Material javobga follow-up savol qo'shilmoqda"
```

---

## 📝 Rule Priorities

1. **Safety Rules** (highest priority)
   - Future lesson block
   - User progress check

2. **Quality Rules**
   - One question per response
   - Context-aware follow-up
   - Material match priority

3. **Performance Rules**
   - Cache consistency
   - Precomputed responses

---

## 🔄 Rule Updates

Yangi rule qo'shish uchun:
1. Bu faylga qo'shish
2. Implementation qilish
3. Test qilish
4. Documentation yangilash

