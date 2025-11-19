# 🚀 Google Cloud TTS'ga O'tish (Qadam-baqadam)

## 📋 Qadam 1: Google Cloud API Key Olish (5 daqiqa)

### 1.1. Google Cloud Console'ga kiring
- https://console.cloud.google.com/
- Google account bilan login qiling

### 1.2. Project yarating yoki tanlang
- Yuqorida **"Select a project"** → **"New Project"**
- Project nomi: `tomu-tts` (yoki istalgan)
- **"Create"** bosing

### 1.3. Text-to-Speech API'ni enable qiling
- **"APIs & Services"** → **"Library"**
- Qidiruv: `Text-to-Speech API`
- **"Enable"** bosing

### 1.4. API Key yarating
- **"APIs & Services"** → **"Credentials"**
- **"Create Credentials"** → **"API Key"**
- API key yaratiladi va ko'rsatiladi
- **Copy qiling** (keyinchalik ko'rinmaydi!)

### 1.5. (Ixtiyoriy) API Key'ni cheklash
- API key'ga bosing
- **"API restrictions"** → **"Restrict key"**
- **"Text-to-Speech API"** ni tanlang
- **"Save"** bosing

---

## 📝 Qadam 2: .env Faylga Qo'shish

### 2.1. .env faylni oching
```bash
cd /home/abd/tomu-backend
nano .env
```

### 2.2. Quyidagi qatorlarni qo'shing yoki yangilang:

```bash
# ======================================
# TTS CONFIGURATION - Google Cloud
# ======================================

# Provider'ni google qilish
TTS_PROVIDER=google

# Google Cloud TTS Settings
GOOGLE_TTS_API_KEY=AIzaSyABC123xyz...  # ← Bu yerga olingan API key'ni qo'ying
GOOGLE_TTS_VOICE=ar-XA-Wavenet-A       # Tavsiya: ar-XA-Wavenet-A (yuqori sifat)
GOOGLE_TTS_LANGUAGE=ar-XA
GOOGLE_TTS_SPEED=0.9

# OpenAI TTS (fallback - agar Google ishlamasa)
OPENAI_API_KEY=sk-proj-...  # ← OpenAI key'ingiz (fallback uchun)
TTS_MODEL=tts-1-hd
TTS_VOICE=shimmer
TTS_SPEED=0.85
```

### 2.3. Faylni saqlang
- `Ctrl + O` (save)
- `Enter` (confirm)
- `Ctrl + X` (exit)

---

## 🔄 Qadam 3: Server'ni Restart Qilish

```bash
# Agar server ishlayotgan bo'lsa, to'xtating (Ctrl+C)
# Keyin qayta ishga tushiring:

npm run start:dev
```

---

## ✅ Qadam 4: Tekshirish

### 4.1. Console log'larni ko'ring

Server start bo'lganda quyidagi log'lar chiqishi kerak:

```
🔊 [TTS] Initializing TTS provider (configured: google)...
✅ [TTS] Provider: Google Cloud TTS
   Voice: ar-XA-Wavenet-A
   Language: ar-XA
   Speed: 0.9
```

### 4.2. Test qiling

Biror voice response oling va audio **arab ohangida** eshitilishi kerak!

---

## 🎯 Voice Tanlov

### Tavsiya: `ar-XA-Wavenet-A` ⭐
- Ayol ovoz
- Yuqori sifat (Wavenet)
- Native arab talaffuz

### Boshqa variantlar:

**Standard (arzonroq - $4/1M chars):**
```bash
GOOGLE_TTS_VOICE=ar-XA-Standard-A  # Ayol
GOOGLE_TTS_VOICE=ar-XA-Standard-B  # Erkak
```

**Wavenet (yuqori sifat - $16/1M chars):**
```bash
GOOGLE_TTS_VOICE=ar-XA-Wavenet-A   # Ayol ⭐
GOOGLE_TTS_VOICE=ar-XA-Wavenet-B   # Erkak
GOOGLE_TTS_VOICE=ar-XA-Wavenet-C   # Erkak
```

---

## ⚠️ Muammolar va Yechimlar

### Muammo 1: "Google TTS not available"
**Sabab:** API key noto'g'ri yoki API enable qilinmagan

**Yechim:**
1. API key to'g'rimi? (`.env` faylda)
2. Text-to-Speech API enable qilganmisiz?
3. API key'da restriction bormi?

### Muammo 2: "403 Forbidden"
**Sabab:** API key'da billing yo'q

**Yechim:**
1. Google Cloud Console → **Billing**
2. Billing account ulang (free trial ham bo'ladi)
3. Text-to-Speech API'da billing enabled bo'lishi kerak

### Muammo 3: Log'da "falling back to OpenAI"
**Sabab:** Google TTS ishlamayapti

**Yechim:**
- Console'dagi error xabarni ko'ring
- API key va billing'ni tekshiring
- Fallback sifatida OpenAI ishlaydi

---

## 🔙 OpenAI'ga Qaytish

Agar Google TTS ishlamasa yoki OpenAI'ga qaytmoqchi bo'lsangiz:

```bash
# .env faylda:
TTS_PROVIDER=openai
```

Keyin restart qiling.

---

## 💰 Narx

**Google Cloud TTS:**
- Standard: $4.00 / 1M chars
- Wavenet: $16.00 / 1M chars

**OpenAI TTS:**
- tts-1-hd: $30.00 / 1M chars

**Natija:** Google Wavenet **arzonroq** va **sifatli**! ✅

---

## 📞 Yordam

Agar muammo bo'lsa:
1. Console log'larni ko'ring
2. `.env` faylda `TTS_PROVIDER=google` ekanligini tekshiring
3. API key to'g'ri ekanligini tekshiring
4. Google Cloud Console'da billing enabled ekanligini tekshiring

