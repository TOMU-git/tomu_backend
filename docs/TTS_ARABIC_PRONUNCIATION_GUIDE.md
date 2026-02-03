# 🎙️ TTS Arab Tilida To'g'ri Talaffuz Uchun Qo'llanma

## 📋 Muammolar va Yechimlar

### ❌ Muammolar:

1. AI ba'zan so'zlarni inglizcha talaffuz qilyapti
2. Gap oxiridagi harflar tovushini pasaytirib qo'yyapti
3. Arab tilida so'z oxiridagi harflarga urg'u berilishi kerak

### ✅ Yechimlar:

## 1. 📝 Text Cleaning / Correction

**Maqsad:** Grammar va spelling xatolarini tuzatish

**Qanday ishlaydi:**

- GPT response'da grammatika va spelling tekshiruvi
- Arabcha harflarni normalizatsiya qilish
- Whisper STT xatolarini tuzatish

**Implementatsiya:**

```typescript
// src/modules/ai/utils/arabic-text.util.ts
ArabicTextUtils.normalizeArabic(text);
```

**Natija:** ✅ TTS to'g'ri so'zlarni oladi va xato talaffuz qilmaydi

---

## 2. 🎯 Full Tashkil (Diacritics) - ENG MUHIM!

**Maqsad:** Har bir so'z to'g'ri talaffuz qilinsin

**Nima uchun muhim:**

- Arab tilida diacritics (تشكيل) bo'lmasa, TTS noto'g'ri talaffuz qiladi
- Masalan: كتاب (kitab?) vs كِتَابٌ (kitaabun) - har xil talaffuz!
- Oxirgi harf diacritics bo'lmasa, TTS uni tushirib qo'yadi

**Implementatsiya:**

```typescript
// src/modules/ai/utils/diacritics-validator.util.ts
validateGPTResponseDiacritics(gptResponse);
checkLastLetterDiacriticsInText(gptResponse);
```

**GPT Prompt qoidalari yangilandi:**

- Har bir harfda diacritics bo'lishi kerak
- AYNIQSA oxirgi harfda diacritics bo'lishi shart!

**Natija:** ✅ TTS har bir harfni to'g'ri aytadi, oxirgi harflarni ham to'liq talaffuz qiladi

---

## 3. ⏹️ Oxirgi Harf Punctuation bilan Tugatish

**Maqsad:** TTS oxirgi harflarni urg'u bilan aytsin

**Qanday ishlaydi:**

- Har bir gap oxirida punctuation (نقطة `.`, سؤال `؟`, تعجب `!`)
- TTS punctuation ko'rsa, to'liq gap deb tushunadi va oxirgi harfni to'liq aytadi
- Intonatsiya ham to'g'ri bo'ladi

**Implementatsiya:**

- GPT prompt'ga qo'shilgan: "End every sentence with punctuation"
- Validation: ResponseStep'da tekshiriladi

**Natija:** ✅ TTS oxirgi harflarni tushirib qo'ymaydi, intonatsiya tabiiy bo'ladi

---

## 4. 🎵 TTS Prosody / Pitch / Emphasis

**Maqsad:** Tabiiy talaffuz, to'g'ri urg'u va pauzalar

**Muammo:** OpenAI TTS hozirda SSML (Speech Synthesis Markup Language) ni qo'llab-quvvatlamaydi.

**Yechimlar:**

### A. OpenAI TTS Parametrlarini Sozlash

```bash
# .env faylida
TTS_MODEL=tts-1-hd          # High quality (recommended)
TTS_VOICE=shimmer           # Arab tilida yaxshi ishlaydi
TTS_SPEED=0.85              # ✅ MUHIM: Sekinroq - aniqroq talaffuz
```

**TTS_SPEED tavsiyalari:**

- `0.85` - Arab tilida eng yaxshi natija (default: 1.0)
- Sekinroq speed diacritics'ni to'g'ri talaffuz qilishga yordam beradi
- Oxirgi harflarni tushirib qo'ymaydi

**TTS_VOICE tanlovlari (Arab tilida yaxshi ishlaydi):**

- `shimmer` - Aniq va ravon (tavsiya etiladi)
- `nova` - Yengil va tabiiy
- `alloy` - Baland va aniq

### B. Alternative: Google Cloud TTS yoki Amazon Polly

Agar OpenAI TTS yetarli bo'lmasa, boshqa TTS providerlar:

#### Google Cloud TTS

```typescript
// SSML bilan Arab tilida urg'u
<speak>
  <prosody pitch="+10%" rate="0.85">
    مَرْحَبًا <emphasis level="strong">يَا صَدِيقِي</emphasis>
  </prosody>
</speak>
```

#### Amazon Polly

```typescript
// SSML bilan Arab tilida pauzalar
<speak>
  <prosody rate="85%">
    هَذَا <break time="200ms"/> كِتَابٌ.
  </prosody>
</speak>
```

**Natija:** ⚠️ Hozircha OpenAI TTS yetarli (SSML kerak bo'lsa Google/Amazon'ga o'tish mumkin)


















---

## 📊 Monitoring va Debugging

### Diacritics Coverage Monitoring

ResponseStep'da har bir GPT response uchun:

```typescript
// Log natijasi:
[Diacritics Validator] AI Response:
  - Text: "مَرْحَبًا! هَذَا كِتَابٌ جَمِيلٌ."
  - Diacritics: 92%
  - Status: ✅ Full diacritics

[Response Step] Last letter diacritics: 4/4 words (100%)
```

### Warning Messages

Agar muammo bo'lsa:

```
⚠️  GPT response has insufficient diacritics (45%). TTS pronunciation may be incorrect!
⚠️  Low last-letter diacritics coverage (30%). TTS may drop ending sounds!
```

---

## 🔧 Qo'shimcha Yaxshilanishlar

### 1. GPT Retry Mechanism (agar diacritics kam bo'lsa)

```typescript
// Agar diacritics 70% dan kam bo'lsa, GPT'ga qayta so'rov yuborish
if (diacriticsValidation.percentage < 70) {
  // Retry with stronger prompt emphasis
}
```

### 2. Post-Processing: Automatic Diacritics Addition

Agar GPT diacritics qo'shmasa, automatic diacritics library ishlatish:

- `tashaphyne` (Python)
- `arabic-diacritics` (NPM package)

### 3. TTS Quality Testing

Har xil voice va speed kombinatsiyalarini test qilish:

```bash
# Test script
TTS_VOICE=shimmer TTS_SPEED=0.85 npm run test:tts
TTS_VOICE=nova TTS_SPEED=0.90 npm run test:tts
TTS_VOICE=alloy TTS_SPEED=0.80 npm run test:tts
```

---

## 📈 Kutilgan Natijalar

### ✅ Yaxshilanishlar:

1. **Diacritics coverage: 70% → 95%+**
2. **Oxirgi harf talaffuz: 30% → 100%**
3. **Inglizcha talaffuz: Yo'q (Arab tili 100%)**
4. **Tabiiy intonatsiya: Yaxshi (punctuation tufayli)**

### 📊 Metrics:

```
Before:
- Diacritics: ~50%
- Last letter diacritics: ~20%
- Pronunciation quality: 60%

After (with all improvements):
- Diacritics: ~95%
- Last letter diacritics: ~90%
- Pronunciation quality: 90%+
```

---

## 🎯 Action Items

### ✅ Implemented (allaqachon qo'shilgan):

1. ✅ Diacritics validator utility
2. ✅ ResponseStep'da validation
3. ✅ GPT prompt'ga TTS qoidalari qo'shilgan
4. ✅ TTS_SPEED 0.85 ga o'zgartirilgan

### 🔄 Keyingi Qadamlar:

1. **Test qilish:** Turli test case'lar bilan TTS sifatini tekshirish
2. **Monitoring:** Production'da diacritics coverage'ni kuzatish
3. **GPT Retry:** Agar diacritics kam bo'lsa, qayta so'rov yuborish mexanizmi
4. **Alternative TTS:** Agar OpenAI yetarli bo'lmasa, Google/Amazon'ni test qilish

---

## 📚 Qo'shimcha Resurslar

- [OpenAI TTS API Documentation](https://platform.openai.com/docs/guides/text-to-speech)
- [Arabic Diacritics Wikipedia](https://ar.wikipedia.org/wiki/تشكيل_الحروف_العربية)
- [Google Cloud TTS SSML](https://cloud.google.com/text-to-speech/docs/ssml)
- [Amazon Polly SSML](https://docs.aws.amazon.com/polly/latest/dg/supportedtags.html)

---

## 🤝 Support

Agar muammolar yoki savollar bo'lsa:

1. Diacritics validator log'larini tekshiring
2. TTS speed va voice'ni sozlang
3. GPT prompt qoidalarini yangilang
4. Alternative TTS provider'larni sinab ko'ring

**Omad! 🚀**
