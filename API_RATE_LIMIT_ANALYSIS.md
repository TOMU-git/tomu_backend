# API Rate Limiting Tahlili

## 📊 Umumiy ko'rinish

Bu hujjatda barcha API endpointlari tahlil qilingan va qaysi endpointlarga rate limiting kerak bo'lishi aniqlangan.

---

## 🔴 MUHIM - Rate Limiting ZARUR

### 1. Authentication Endpoints (`/api/auth/*`)

#### ✅ **Qo'shilgan:**

- `POST /api/auth/send-sms` - **5 req/min per phone** ✅ (Allaqachon qo'shilgan)

#### ⚠️ **Qo'shish kerak:**

**1.1. Login Endpoints**

- `POST /api/auth/sign-in/users`

  - **Limit:** 5 so'rov/15 daqiqa per IP yoki phone number
  - **Sabab:** Brute force hujumlariga qarshi himoya
  - **Prioritet:** 🔴 YUQORI

- `POST /api/auth/sign-in/users/v2`
  - **Limit:** 5 so'rov/15 daqiqa per IP yoki phone number
  - **Sabab:** Brute force hujumlariga qarshi himoya
  - **Prioritet:** 🔴 YUQORI

**1.2. Registration Endpoints**

- `POST /api/auth/register/students`
  - **Limit:** 3 so'rov/soat per IP
  - **Sabab:** Spam registratsiyaga qarshi himoya
  - **Prioritet:** 🟡 O'RTA

**1.3. Password Reset**

- `POST /api/auth/forgot-password`
  - **Limit:** 3 so'rov/soat per phone number
  - **Sabab:** SMS spam va bruteforce hujumlariga qarshi
  - **Prioritet:** 🔴 YUQORI

**1.4. Verification Code**

- `POST /api/auth/verify-code`
  - **Limit:** 10 so'rov/15 daqiqa per phone number
  - **Sabab:** Brute force hujumlariga qarshi (kod topishga urinishlar)
  - **Prioritet:** 🟡 O'RTA

**1.5. Token Refresh**

- `GET /api/auth/refresh`
  - **Limit:** 20 so'rov/daqiqa per token
  - **Sabab:** Token refresh spam hujumlariga qarshi
  - **Prioritet:** 🟢 PAST

---

### 2. AI Chat Endpoints (`/api/ai/chat/*`)

#### ⚠️ **Qo'shish kerak:**

**2.1. Voice Chat**

- `POST /api/ai/chat/voice`
  - **Limit:** 30 so'rov/daqiqa per user
  - **Sabab:**
    - AI processing resurslari qimmat
    - Audio processing CPU-intensive
    - Har bir so'rov AI API'ga murojaat qiladi (qimmat)
  - **Prioritet:** 🔴 YUQORI
  - **Eslatma:** PaymentGuard allaqachon bor, lekin rate limiting ham kerak

**2.2. Session Creation**

- `POST /api/ai/chat/sessions`
  - **Limit:** 10 so'rov/daqiqa per user
  - **Sabab:** Session spam yaratishga qarshi
  - **Prioritet:** 🟡 O'RTA

**2.3. Get Messages**

- `GET /api/ai/chat/sessions/:id/messages`
  - **Limit:** 60 so'rov/daqiqa per user
  - **Sabab:** Database yukini kamaytirish
  - **Prioritet:** 🟢 PAST

---

### 3. File Upload Endpoints (`/api/file/*`)

#### ⚠️ **Qo'shish kerak:**

**3.1. File Upload**

- `POST /api/file/upload`
  - **Limit:** 10 so'rov/daqiqa per user
  - **Sabab:**
    - Disk space himoyasi
    - DoS hujumlariga qarshi (katta fayllar)
    - Bandwidth himoyasi
  - **Prioritet:** 🔴 YUQORI

---

### 4. Payment/Transaction Endpoints (`/api/transactions/*`)

#### ⚠️ **Qo'shish kerak:**

**4.1. Payme Webhook**

- `POST /api/transactions/payme`
  - **Limit:** 100 so'rov/daqiqa per IP (Payme server IP'lariga)
  - **Sabab:**
    - Moliyaviy operatsiyalar
    - Webhook spam hujumlariga qarshi
    - IP whitelist bilan birga ishlatish tavsiya etiladi
  - **Prioritet:** 🔴 YUQORI
  - **Eslatma:** IP-based rate limiting kerak (Payme IP'lariga alohida limit)

---

### 5. Orders Endpoints (`/api/orders/*`)

#### ⚠️ **Qo'shish kerak:**

**5.1. Create Order**

- `POST /api/orders/create`
  - **Limit:** 5 so'rov/daqiqa per user
  - **Sabab:**
    - Moliyaviy operatsiyalar
    - Spam buyurtmalarga qarshi
  - **Prioritet:** 🟡 O'RTA

---

### 6. Device Management Endpoints (`/api/devices/*`)

#### ⚠️ **Qo'shish kerak:**

**6.1. Register Device**

- `POST /api/devices/register`
  - **Limit:** 5 so'rov/soat per user
  - **Sabab:** Device spam registratsiyaga qarshi
  - **Prioritet:** 🟡 O'RTA

**6.2. Remove Device**

- `DELETE /api/devices/:deviceId`
  - **Limit:** 10 so'rov/daqiqa per user
  - **Sabab:** Device o'chirish spam hujumlariga qarshi
  - **Prioritet:** 🟢 PAST

**6.3. Logout All Devices**

- `DELETE /api/devices/logout-all`
  - **Limit:** 3 so'rov/soat per user
  - **Sabab:** Foydalanuvchilarni tizimdan chiqarish hujumlariga qarshi
  - **Prioritet:** 🟡 O'RTA

---

### 7. Feedback Endpoints (`/api/feedback/*`)

#### ⚠️ **Qo'shish kerak:**

**7.1. Create Feedback**

- `POST /api/feedback`
  - **Limit:** 5 so'rov/soat per user
  - **Sabab:** Spam feedback yuborishga qarshi
  - **Prioritet:** 🟡 O'RTA

---

### 8. Notification Endpoints (`/api/notifications/*`)

#### ⚠️ **Qo'shish kerak:**

**8.1. Register FCM Token**

- `POST /api/notifications/register-token`
  - **Limit:** 10 so'rov/daqiqa per user
  - **Sabab:** Token spam registratsiyaga qarshi
  - **Prioritet:** 🟢 PAST

**8.2. Send Notification (Admin)**

- `POST /api/notifications/send`
- `POST /api/notifications/send-to-user`
- `POST /api/notifications/send-to-all`
  - **Limit:** 20 so'rov/daqiqa per admin user
  - **Sabab:** Notification spam yuborishga qarshi
  - **Prioritet:** 🟡 O'RTA

---

## 🟡 O'RTA Prioritet - Rate Limiting Tavsiya Etiladi

### 9. User Endpoints (`/api/user/*`)

**9.1. Search Users**

- `GET /api/user?search=...`
  - **Limit:** 30 so'rov/daqiqa per user
  - **Sabab:** Database yukini kamaytirish
  - **Prioritet:** 🟡 O'RTA

**9.2. Update User**

- `PATCH /api/user/update/:id`
  - **Limit:** 10 so'rov/daqiqa per user
  - **Sabab:** Ma'lumotlar o'zgartirish spam hujumlariga qarshi
  - **Prioritet:** 🟢 PAST

---

### 10. Course/Lesson Endpoints

**10.1. Get Course Progress**

- `GET /api/lesson-progress/*`
  - **Limit:** 60 so'rov/daqiqa per user
  - **Sabab:** Database yukini kamaytirish
  - **Prioritet:** 🟢 PAST

---

## 🟢 PAST Prioritet - Rate Limiting Majburiy Emas

Quyidagi endpointlar odatda rate limiting talab qilmaydi, chunki:

- Faqat ma'lumot o'qish (GET)
- Admin tomonidan boshqariladi
- Yoki allaqachon boshqa himoya mexanizmlari mavjud

- `GET /api/course/*` - Faqat o'qish
- `GET /api/lesson/*` - Faqat o'qish
- `GET /api/grammar/*` - Faqat o'qish
- `GET /api/home-page/*` - Faqat o'qish
- `GET /api/tariff/*` - Faqat o'qish
- `GET /api/analytics/*` - Admin endpointlari

---

## 📋 Prioritetlar bo'yicha Xulosa

### 🔴 YUQORI Prioritet (Darhol qo'shish kerak):

1. ✅ `POST /api/auth/send-sms` - **Qo'shilgan**
2. `POST /api/auth/sign-in/users` - Login brute force
3. `POST /api/auth/sign-in/users/v2` - Login brute force
4. `POST /api/auth/forgot-password` - Password reset spam
5. `POST /api/ai/chat/voice` - AI resurslari himoyasi
6. `POST /api/file/upload` - File upload DoS himoyasi
7. `POST /api/transactions/payme` - Moliyaviy xavfsizlik

### 🟡 O'RTA Prioritet (Qisqa muddatda qo'shish):

1. `POST /api/auth/register/students` - Spam registratsiya
2. `POST /api/auth/verify-code` - Code brute force
3. `POST /api/ai/chat/sessions` - Session spam
4. `POST /api/orders/create` - Buyurtma spam
5. `POST /api/devices/register` - Device spam
6. `DELETE /api/devices/logout-all` - Logout hujumlari
7. `POST /api/feedback` - Feedback spam
8. `POST /api/notifications/send*` - Notification spam

### 🟢 PAST Prioritet (Ixtiyoriy):

1. `GET /api/auth/refresh` - Token refresh
2. `GET /api/ai/chat/sessions/:id/messages` - Message olish
3. `GET /api/user?search=...` - User qidirish
4. Boshqa GET endpointlari

---

## 🛠️ Amaliyot Tavsiyalari

### 1. Rate Limiting Strategiyalari:

**Per User Rate Limiting:**

- User ID asosida (authenticated users)
- Cache key: `rate_limit:user:{userId}:{endpoint}``

**Per Phone Number Rate Limiting:**

- Telefon raqami asosida (SMS, verification)
- Cache key: `rate_limit:phone:{phoneNumber}:{endpoint}`

**Per IP Rate Limiting:**

- IP manzili asosida (login, registration)
- Cache key: `rate_limit:ip:{ipAddress}:{endpoint}`

**Per Token Rate Limiting:**

- Token asosida (refresh token)
- Cache key: `rate_limit:token:{tokenHash}:{endpoint}`

### 2. Limit Qiymatlari:

**Qattiq Limitlar (Security):**

- Login: 5/15min
- SMS: 5/min (✅ qo'shilgan)
- Password Reset: 3/hour
- Verification: 10/15min

**O'rtacha Limitlar (Resource Protection):**

- AI Voice: 30/min
- File Upload: 10/min
- Session Create: 10/min

**Yumshoq Limitlar (Performance):**

- Get Messages: 60/min
- Search: 30/min
- Refresh Token: 20/min

### 3. Implementation Pattern:

```typescript
// Har bir endpoint uchun guard yaratish
@UseGuards(RateLimitGuard)
@Post('endpoint')
async handler() { ... }

// Yoki custom decorator
@RateLimit({ max: 5, window: 60000 }) // 5 per minute
@Post('endpoint')
async handler() { ... }
```

### 4. Monitoring va Logging:

- Rate limit oshib ketgan holatlarni log qilish
- Hujumlar statistikasini yig'ish
- Alert tizimi qurish (anormal faollik uchun)

---

## 📊 Statistikalar

- **Jami Endpointlar:** ~150+
- **Rate Limiting Kerak:** ~25 endpoint
- **YUQORI Prioritet:** 7 endpoint
- **O'RTA Prioritet:** 8 endpoint
- **PAST Prioritet:** 10+ endpoint

---

## ✅ Keyingi Qadamlar

1. ✅ SMS rate limiting qo'shildi
2. ⏳ Login endpointlariga rate limiting qo'shish
3. ⏳ Password reset endpointiga rate limiting qo'shish
4. ⏳ AI voice endpointiga rate limiting qo'shish
5. ⏳ File upload endpointiga rate limiting qo'shish
6. ⏳ Transaction endpointiga rate limiting qo'shish
7. ⏳ Qolgan O'RTA va PAST prioritetli endpointlarga qo'shish

---

**Yaratilgan:** 2024
**Oxirgi yangilanish:** 2024
