# TTS Environment Variables

## Google Cloud TTS (Tavsiya)

```bash
# ======================================
# TTS CONFIGURATION (Google Cloud)
# ======================================

# TTS Provider (google yoki openai)
TTS_PROVIDER=google

# Google Cloud TTS Settings
GOOGLE_TTS_API_KEY=your_google_cloud_api_key_here
GOOGLE_TTS_VOICE=ar-XA-Wavenet-A
GOOGLE_TTS_LANGUAGE=ar-XA
GOOGLE_TTS_SPEED=0.9

# OpenAI TTS (fallback)
OPENAI_API_KEY=your_openai_api_key_here
TTS_MODEL=tts-1-hd
TTS_VOICE=shimmer
TTS_SPEED=0.85
```

---

## OpenAI TTS (Default/Fallback)

```bash
# ======================================
# TTS CONFIGURATION (OpenAI)
# ======================================

# TTS Provider (google yoki openai)
TTS_PROVIDER=openai

# OpenAI TTS Settings
OPENAI_API_KEY=your_openai_api_key_here
TTS_MODEL=tts-1-hd
TTS_VOICE=shimmer
TTS_SPEED=0.85
```

---

## Voice Options

### Google Cloud TTS Voices

```bash
# Female voices (Standard)
GOOGLE_TTS_VOICE=ar-XA-Standard-A
GOOGLE_TTS_VOICE=ar-XA-Standard-D

# Male voices (Standard)
GOOGLE_TTS_VOICE=ar-XA-Standard-B
GOOGLE_TTS_VOICE=ar-XA-Standard-C

# Female voice (High quality - Tavsiya)
GOOGLE_TTS_VOICE=ar-XA-Wavenet-A  # ⭐ BEST

# Male voices (High quality)
GOOGLE_TTS_VOICE=ar-XA-Wavenet-B
GOOGLE_TTS_VOICE=ar-XA-Wavenet-C
```

### OpenAI TTS Voices

```bash
TTS_VOICE=alloy    # Neytr
TTS_VOICE=echo     # Erkak
TTS_VOICE=fable    # Ayol
TTS_VOICE=onyx     # Erkak, chuqur
TTS_VOICE=nova     # Ayol, aniq
TTS_VOICE=shimmer  # Ayol, yumshoq (default)
```

---

## Speed Settings

```bash
# Google TTS Speed (0.25 - 4.0)
GOOGLE_TTS_SPEED=0.9   # Tavsiya (arab tili uchun)
GOOGLE_TTS_SPEED=1.0   # Normal
GOOGLE_TTS_SPEED=0.8   # Sekinroq

# OpenAI TTS Speed (0.25 - 4.0)
TTS_SPEED=0.85   # Tavsiya (arab tili uchun)
TTS_SPEED=1.0    # Normal
TTS_SPEED=0.75   # Sekinroq
```

---

## Complete Example (.env)

```bash
# ======================================
# TTS CONFIGURATION
# ======================================

# Provider (google tavsiya)
TTS_PROVIDER=google

# Google Cloud TTS (arab tilida native voice)
GOOGLE_TTS_API_KEY=AIzaSyABC123xyz...
GOOGLE_TTS_VOICE=ar-XA-Wavenet-A
GOOGLE_TTS_LANGUAGE=ar-XA
GOOGLE_TTS_SPEED=0.9

# OpenAI TTS (fallback)
OPENAI_API_KEY=sk-proj-abc123...
TTS_MODEL=tts-1-hd
TTS_VOICE=shimmer
TTS_SPEED=0.85
```

---

## Setup Steps

1. **Google Cloud API Key olish:**
   - https://console.cloud.google.com/
   - Project yarating
   - Cloud Text-to-Speech API enable qiling
   - API Key yarating
   - Copy qiling

2. **`.env` faylga qo'shing:**
   ```bash
   TTS_PROVIDER=google
   GOOGLE_TTS_API_KEY=your_key_here
   GOOGLE_TTS_VOICE=ar-XA-Wavenet-A
   ```

3. **Restart:**
   ```bash
   npm run start:dev
   ```

4. **Test:**
   - Biror voice response oling
   - Audio arab ohangida eshitilishi kerak ✅

---

## Notes

- Google TTS **native arab voice'lari** bor → to'g'ri talaffuz
- OpenAI TTS **ingliz ohangida** o'qiydi → noto'g'ri talaffuz
- Agar Google TTS ishlamasa, avtomatik OpenAI ga fallback bo'ladi
- Google TTS **arzonroq** ($16/1M chars vs $30/1M chars)

