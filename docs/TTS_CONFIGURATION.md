# TTS Configuration Guide

## 🎯 Muammo va Yechim

### Muammo:

OpenAI TTS voice'lari (`shimmer`, `alloy`, `nova`, etc.) **ingliz ohangida** arab tilini o'qiydi. Hatto to'liq diacritics bo'lsa ham, talaffuz noto'g'ri (inglizcha accent).

### Yechim:

**Google Cloud TTS** yoki **Azure TTS** - arab tiliga maxsus **native voice'lar** bilan.

---

## 🔊 Provider Tanlash

### 1️⃣ Google Cloud TTS (Tavsiya)

**Afzalliklari:**

- ✅ Arab tiliga **native voice'lar**
- ✅ Yuqori sifat (Wavenet models)
- ✅ To'g'ri talaffuz
- ✅ Narx: OpenAI bilan deyarli bir xil

**Voice Options:**

| Voice              | Type   | Quality  | Description                 |
| ------------------ | ------ | -------- | --------------------------- |
| `ar-XA-Standard-A` | Female | Standard | Ayol ovoz, standard sifat   |
| `ar-XA-Standard-B` | Male   | Standard | Erkak ovoz, standard sifat  |
| `ar-XA-Standard-C` | Male   | Standard | Erkak ovoz, standard sifat  |
| `ar-XA-Standard-D` | Female | Standard | Ayol ovoz, standard sifat   |
| `ar-XA-Wavenet-A`  | Female | **High** | Ayol ovoz, yuqori sifat ⭐  |
| `ar-XA-Wavenet-B`  | Male   | **High** | Erkak ovoz, yuqori sifat ⭐ |
| `ar-XA-Wavenet-C`  | Male   | **High** | Erkak ovoz, yuqori sifat ⭐ |

**Tavsiya:** `ar-XA-Wavenet-A` (Female, High quality)

---

### 2️⃣ OpenAI TTS (Fallback)

**Afzalliklari:**

- ✅ Tez (no setup)
- ✅ Universal (100+ til)

**Kamchiliklari:**

- ❌ Ingliz ohangida o'qiydi
- ❌ Arab tilida noto'g'ri talaffuz

**Voice Options:**

- `alloy` - Neytr
- `echo` - Erkak
- `fable` - Ayol
- `onyx` - Erkak, chuqur
- `nova` - Ayol, aniq
- `shimmer` - Ayol, yumshoq

---

## ⚙️ Setup

### Option 1: Google Cloud TTS (Tavsiya)

#### 1. Google Cloud API Key olish

1. [Google Cloud Console](https://console.cloud.google.com/) ga kiring
2. Project yarating yoki tanlang
3. **APIs & Services** → **Enable APIs**
4. **Cloud Text-to-Speech API** ni enable qiling
5. **Credentials** → **Create Credentials** → **API Key**
6. API key ni copy qiling

#### 2. Environment Variables

`.env` faylga qo'shing:

```bash
# TTS Provider (google yoki openai)
TTS_PROVIDER=google

# Google Cloud TTS
GOOGLE_TTS_API_KEY=your_google_api_key_here
GOOGLE_TTS_VOICE=ar-XA-Wavenet-A
GOOGLE_TTS_LANGUAGE=ar-XA
GOOGLE_TTS_SPEED=0.9

# OpenAI TTS (fallback, optional)
OPENAI_API_KEY=your_openai_key_here
TTS_MODEL=tts-1-hd
TTS_VOICE=shimmer
TTS_SPEED=0.85
```

#### 3. Test

```bash
npm run start:dev
```

Console'da ko'rishingiz kerak:

```
✅ TTS Provider: Google Cloud TTS
🔊 Google TTS enabled: ar-XA-Wavenet-A (ar-XA)
```

---

### Option 2: OpenAI TTS (Default)

Hozirgi holat - sozlash shart emas.

`.env`:

```bash
TTS_PROVIDER=openai
OPENAI_API_KEY=your_openai_key_here
TTS_MODEL=tts-1-hd
TTS_VOICE=shimmer
TTS_SPEED=0.85
```

---

## 💰 Narx Taqqoslash

### Google Cloud TTS

| Type            | Price             |
| --------------- | ----------------- |
| Standard Voices | $4.00 / 1M chars  |
| WaveNet Voices  | $16.00 / 1M chars |

**Misol:** 100 ta response (har biri 50 char) = 5000 chars = **$0.08** (WaveNet)

### OpenAI TTS

| Model    | Price             |
| -------- | ----------------- |
| tts-1    | $15.00 / 1M chars |
| tts-1-hd | $30.00 / 1M chars |

**Misol:** 100 ta response (har biri 50 char) = 5000 chars = **$0.15** (tts-1-hd)

**🎯 Natija:** Google WaveNet **arzonroq** va **sifatli**.

---

## 🧪 Test Natijasi

### Input Text:

```
وَعَلَيْكُمُ السَّلَامُ.
```

### OpenAI TTS (shimmer):

- ❌ Ingliz ohangida
- ❌ Diacritics noto'g'ri talaffuz
- ❌ "السَّلَامُ" → "as-salaaamu" (inglizcha)

### Google TTS (ar-XA-Wavenet-A):

- ✅ Arab ohangida
- ✅ Diacritics to'g'ri talaffuz
- ✅ "السَّلَامُ" → "as-salaamu" (arabcha)

---

## 🔄 Fallback Strategy

Agar Google TTS ishlamasa (API key yo'q yoki error), tizim avtomatik ravishda **OpenAI TTS** ga o'tadi:

```
⚠️  Google TTS not available, falling back to OpenAI
✅ TTS Provider: OpenAI (voice: shimmer)
```

---

## 📊 Voice Comparison Table

| Provider | Voice            | Quality    | Accent      | Price (1M chars) | Tavsiya       |
| -------- | ---------------- | ---------- | ----------- | ---------------- | ------------- |
| Google   | ar-XA-Wavenet-A  | ⭐⭐⭐⭐⭐ | Native Arab | $16.00           | ✅ **Best**   |
| Google   | ar-XA-Standard-A | ⭐⭐⭐⭐   | Native Arab | $4.00            | ✅ **Budget** |
| OpenAI   | shimmer          | ⭐⭐⭐     | English     | $30.00           | ⚠️ Fallback   |
| OpenAI   | nova             | ⭐⭐⭐     | English     | $30.00           | ⚠️ Fallback   |

---

## 🚀 Migration Steps

### Agar hozir OpenAI ishlatayotgan bo'lsangiz:

1. Google Cloud API key oling (10 daqiqa)
2. `.env` faylga qo'shing:
   ```bash
   TTS_PROVIDER=google
   GOOGLE_TTS_API_KEY=your_key_here
   GOOGLE_TTS_VOICE=ar-XA-Wavenet-A
   ```
3. Restart qiling: `npm run start:dev`
4. Test qiling: Biror audio response oling
5. ✅ Arab ohangida audio eshitilishi kerak!

---

## 🐛 Troubleshooting

### Google TTS ishlamayapti?

**Console log'larni tekshiring:**

```bash
✅ TTS Provider: Google Cloud TTS
🔊 Google TTS enabled: ar-XA-Wavenet-A (ar-XA)
```

**Agar error bo'lsa:**

```bash
❌ Google TTS load error, falling back to OpenAI: [error message]
```

**Tekshirish:**

1. API key to'g'rimi? (`.env` faylda)
2. Cloud Text-to-Speech API enabled qilganmisiz?
3. API key'da restriction bormi? (HTTP referrers, IP, etc.)

### OpenAI fallback ishlamayapti?

**Tekshirish:**

1. `OPENAI_API_KEY` to'g'rimi?
2. OpenAI account'da balance bormi?

---

## 📝 Summary

**Agar arab tilida to'g'ri talaffuz kerak bo'lsa:**

- ✅ Google Cloud TTS (`ar-XA-Wavenet-A`)
- ✅ Setup oson (10 daqiqa)
- ✅ Narx arzonroq
- ✅ Sifat yuqori

**Agar tez test qilish kerak bo'lsa:**

- ⚠️ OpenAI TTS (default)
- ⚠️ Ingliz ohangida
- ⚠️ Talaffuz noto'g'ri

---

## 🎓 Qo'shimcha Ma'lumot

- [Google Cloud TTS Documentation](https://cloud.google.com/text-to-speech/docs)
- [Google Cloud TTS Pricing](https://cloud.google.com/text-to-speech/pricing)
- [OpenAI TTS Documentation](https://platform.openai.com/docs/guides/text-to-speech)
- [OpenAI TTS Pricing](https://openai.com/pricing)
