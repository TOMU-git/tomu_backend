# Firebase Setup Guide

## 1. Service Account Key ma'lumotlarini .env fayliga qo'shish

Flutter dasturchidan olingan Service Account JSON faylidan **faqat 3 ta maydon** kerak. Qolgan maydonlar Firebase Admin SDK tomonidan avtomatik ishlatiladi.

`.env` fayliga quyidagilarni qo'shing:

```env
# Firebase Service Account Configuration (FAOLAT)
FIREBASE_PROJECT_ID=tomu-b61c0
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@tomu-b61c0.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
```

### 📋 Qaysi maydonlar kerak va qaysi biri kerak emas:

✅ **KERAKLI (Majburiy):**

- `project_id` → `FIREBASE_PROJECT_ID`
- `client_email` → `FIREBASE_CLIENT_EMAIL`
- `private_key` → `FIREBASE_PRIVATE_KEY`

❌ **KERAK EMAS (Avtomatik):**

- `client_id` - Firebase Admin SDK tomonidan avtomatik olinadi
- `auth_uri` - Default: `https://accounts.google.com/o/oauth2/auth`
- `token_uri` - Default: `https://oauth2.googleapis.com/token`
- `auth_provider_x509_cert_url` - Avtomatik
- `client_x509_cert_url` - Avtomatik
- `universe_domain` - Default: `googleapis.com`

**Nima uchun?** Firebase Admin SDK bu ma'lumotlarni o'zi yuklaydi va default qiymatlarni ishlatadi. Biz faqat authentication uchun kerakli 3 ta maydonni beramiz.

### Qanday to'ldirish:

1. **FIREBASE_PROJECT_ID**:

   - Service Account JSON faylidagi `project_id` qiymati
   - Misol: `tomu-b61c0`

2. **FIREBASE_CLIENT_EMAIL**:

   - Service Account JSON faylidagi `client_email` qiymati
   - Format: `firebase-adminsdk-xxxxx@tomu-b61c0.iam.gserviceaccount.com`

3. **FIREBASE_PRIVATE_KEY**:
   - Service Account JSON faylidagi `private_key` qiymati
   - **MUHIM**: To'liq key ni qo'shish kerak, shu jumladan `-----BEGIN PRIVATE KEY-----` va `-----END PRIVATE KEY-----`
   - Har bir yangi qatorni `\n` bilan almashtirish kerak
   - Misol:
   ```env
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
   ```

### To'liq .env misoli:

```env
# Database Configuration
DATABASE=your_database
DATABASE_USER=your_user
DATABASE_PASSWORD=your_password
DATABASE_HOST=localhost
DATABASE_PORT=5432

# JWT Configuration
JWT_SECRET_KEY=your_jwt_secret
JWT_EXPIRED_IN=24h
JWT_REFRESH_SECRET_KEY=your_refresh_secret
JWT_REFRESH_EXPIRATION=7d

# Firebase Configuration (Service Account)
FIREBASE_PROJECT_ID=tomu-b61c0
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@tomu-b61c0.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n(butun key bu yerda)\n-----END PRIVATE KEY-----\n"

# Firebase App IDs (Optional - default values already set, Flutter uchun)
# FIREBASE_WEB_APP_ID=1:1062737653345:web:2945672ae4f851a8f60420
# FIREBASE_ANDROID_APP_ID=1:1062737653345:android:f8dc6c570f85d476f60420
# FIREBASE_IOS_APP_ID=1:1062737653345:ios:3abcf8fb98147f10f60420
```

### ⚠️ MUHIM: private_key formatini to'g'ri qo'yish

Service Account JSON faylidagi `private_key` ni to'g'ri formatda qo'yish juda muhim:

**❌ NOTO'G'RI (ishlamaydi):**

```env
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...
-----END PRIVATE KEY-----"
```

**✅ TO'G'RI (ishlaydi):**

```env
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
```

**Nima farqi?**

- Har bir yangi qatorni `\n` (backslash + n) bilan almashtirish kerak
- Bitta qator bo'lishi kerak (multiline emas)
- Qo'shtirnoqlar ichida bo'lishi kerak

## 2. Service Account JSON faylidan ma'lumotlarni olish

Agar to'liq JSON fayl bo'lsa, quyidagi maydonlarni toping:

```json
{
  "type": "service_account",
  "project_id": "tomu-b61c0",
  "private_key_id": "9f2e5832ded532f76aefc0348e6b3eb827ebb514",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@tomu-b61c0.iam.gserviceaccount.com",
  ...
}
```

1. `project_id` → `FIREBASE_PROJECT_ID`
2. `client_email` → `FIREBASE_CLIENT_EMAIL`
3. `private_key` → `FIREBASE_PRIVATE_KEY` (to'liq key, shu jumladan BEGIN/END qatorlari)

## 3. Tekshirish

Server ishga tushgandan keyin quyidagi endpoint dan status tekshiring:

```bash
GET /notifications/status
Authorization: Bearer {admin-token}
```

Yoki loglarda quyidagi xabarni ko'rasiz:

```
[FirebaseService] Firebase Admin SDK initialized successfully
```

## 4. Xatoliklarni tuzatish

Agar Firebase initializatsiya qilinmasa:

1. `.env` faylda private_key to'g'ri formatda ekanligini tekshiring
2. `\n` belgilari qatorlar o'rnida ishlatilganligini tekshiring
3. Bosh qatorlar va ortiqcha bo'shliqlarni olib tashlang
4. Qo'shtirnoqlar ichida ekanligini tekshiring

## 5. Xavfsizlik

⚠️ **MUHIM**: `.env` faylini git ga commit qilmang!

- `.env` fayl `.gitignore` da bo'lishi kerak
- Production da environment variables ni to'g'ri sozlang
