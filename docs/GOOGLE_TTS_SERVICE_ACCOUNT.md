# 🔐 Google Cloud TTS Service Account JSON Setup

## ❌ Muammo

Google Cloud TTS REST API **API key'ni qo'llab-quvvatlamaydi**. Error:
```
401: API keys are not supported by this API. Expected OAuth2 access token
```

**Yechim:** Service Account JSON file ishlatish kerak.

---

## ✅ Yechim: Service Account JSON

### Qadam 1: Service Account Yaratish

1. **Google Cloud Console** → https://console.cloud.google.com/
2. **IAM & Admin** → **Service Accounts**
3. **Create Service Account**
   - Name: `tomu-tts-service`
   - Description: `Text-to-Speech service account`
   - **Create and Continue**

4. **Grant access:**
   - Role: **Cloud Text-to-Speech API User**
   - **Continue** → **Done**

### Qadam 2: Service Account Key Yaratish

1. **Service Accounts** ro'yxatida yangi account'ga bosing
2. **Keys** tab → **Add Key** → **Create new key**
3. **JSON** formatni tanlang
4. **Create** - JSON file yuklab olinadi

### Qadam 3: JSON File'ni Joylashtirish

```bash
# Project root'da secrets papkasini yarating
mkdir -p secrets

# JSON file'ni ko'chiring (yuklab olingan file nomi: project-id-xxxxx.json)
mv ~/Downloads/your-project-xxxxx.json secrets/google-tts-service-account.json

# File permissions'ni xavfsiz qiling
chmod 600 secrets/google-tts-service-account.json
```

### Qadam 4: .env Faylga Qo'shish

```bash
# .env faylga qo'shing:
GOOGLE_TTS_SERVICE_ACCOUNT_PATH=./secrets/google-tts-service-account.json

# Yoki absolute path:
GOOGLE_TTS_SERVICE_ACCOUNT_PATH=/home/abd/tomu-backend/secrets/google-tts-service-account.json
```

### Qadam 5: .gitignore'ga Qo'shish

```bash
# .gitignore faylga qo'shing:
secrets/
*.json
!package.json
!package-lock.json
```

---

## 🔄 Fallback

Agar Google TTS ishlamasa, **avtomatik OpenAI'ga o'tadi**:

```
❌ Google TTS failed, falling back to OpenAI: [error message]
✅ OpenAI TTS ishlatilmoqda...
```

---

## 📝 To'liq .env Misol

```bash
# TTS Provider
TTS_PROVIDER=google

# Google Cloud TTS (Service Account JSON - tavsiya)
GOOGLE_TTS_SERVICE_ACCOUNT_PATH=./secrets/google-tts-service-account.json
GOOGLE_TTS_VOICE=ar-XA-Wavenet-A
GOOGLE_TTS_LANGUAGE=ar-XA
GOOGLE_TTS_SPEED=0.9

# OpenAI TTS (fallback)
OPENAI_API_KEY=sk-proj-...
TTS_MODEL=tts-1-hd
TTS_VOICE=shimmer
TTS_SPEED=0.85
```

---

## ✅ Tekshirish

Server restart qiling:

```bash
npm run start:dev
```

Console'da ko'rasiz:

```
🔊 [TTS] Initializing TTS provider (configured: google)...
✅ [TTS] Provider: Google Cloud TTS
   Voice: ar-XA-Wavenet-A
   Language: ar-XA
   Speed: 0.9
```

Agar error bo'lsa, fallback ishlaydi:

```
❌ Google TTS failed, falling back to OpenAI: Failed to get access token
✅ OpenAI TTS ishlatilmoqda...
```

---

## ⚠️ Xavfsizlik

1. **Service Account JSON file'ni git'ga commit qilmang!**
2. `.gitignore` ga qo'shing: `secrets/`
3. Production'da environment variable orqali path berish yaxshiroq
4. File permissions: `chmod 600 secrets/*.json`

---

## 🐛 Muammolar

### Error: "Failed to get access token"
- Service Account JSON file path to'g'rimi?
- File mavjudmi va o'qish mumkinmi?
- Service Account'da Text-to-Speech API role bormi?

### Error: "403 Forbidden"
- Service Account'da **Cloud Text-to-Speech API User** role bormi?
- Billing enabled qilinganmi?

### Error: "File not found"
- `GOOGLE_TTS_SERVICE_ACCOUNT_PATH` to'g'rimi?
- Absolute path ishlatish yaxshiroq: `/home/abd/tomu-backend/secrets/...`

---

## 📚 Qo'shimcha

- [Google Cloud Service Accounts](https://cloud.google.com/iam/docs/service-accounts)
- [Text-to-Speech API Authentication](https://cloud.google.com/text-to-speech/docs/authentication)

