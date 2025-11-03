# Firebase Integratsiyasi - Keyingi Qadamlar

## ✅ Qilindi
- [x] Firebase Admin SDK o'rnatildi
- [x] Config sozlandi
- [x] Environment variables qo'shildi
- [x] Firebase initialization test qilindi va muvaffaqiyatli!

## 📋 Keyingi Qadamlar

### 1. Server ni ishga tushirish

```bash
# Development mode
npm run start:dev

# Yoki production mode
npm run start:prod
```

Server ishga tushgandan keyin logda quyidagi xabarni ko'rasiz:
```
[FirebaseService] Firebase Admin SDK initialized successfully
```

### 2. API Endpoints Test Qilish

#### a) Firebase config olish (authentication kerak emas)
```bash
GET http://localhost:3000/notifications/firebase-config
```

**Response:**
```json
{
  "projectId": "tomu-b61c0",
  "appIds": {
    "web": "1:1062737653345:web:2945672ae4f851a8f60420",
    "android": "1:1062737653345:android:f8dc6c570f85d476f60420",
    "ios": "1:1062737653345:ios:3abcf8fb98147f10f60420",
    ...
  }
}
```

#### b) FCM token ro'yxatdan o'tkazish
```bash
POST http://localhost:3000/notifications/register-token
Authorization: Bearer {user-token}
Content-Type: application/json

{
  "fcmToken": "user-device-fcm-token",
  "deviceId": "optional-device-id"
}
```

#### c) Notification yuborish (Admin/Director uchun)
```bash
POST http://localhost:3000/notifications/send
Authorization: Bearer {admin-token}
Content-Type: application/json

{
  "title": "Test Notification",
  "body": "Bu test xabari",
  "userId": 1,
  "data": {
    "type": "test",
    "lessonId": 1
  }
}
```

### 3. Flutter App Integratsiyasi

#### a) FCM Token olish (Flutter da)

```dart
import 'package:firebase_messaging/firebase_messaging.dart';

// FCM token olish
Future<String?> getFCMToken() async {
  FirebaseMessaging messaging = FirebaseMessaging.instance;
  String? token = await messaging.getToken();
  return token;
}
```

#### b) Token ni backend ga yuborish

```dart
// Login yoki app start paytida
Future<void> registerFCMToken(String token) async {
  final response = await http.post(
    Uri.parse('$baseUrl/notifications/register-token'),
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer $userToken',
    },
    body: jsonEncode({
      'fcmToken': token,
      // Optional: 'deviceId': deviceId,
    }),
  );
  
  if (response.statusCode == 200) {
    print('FCM token registered successfully');
  }
}
```

#### c) Device registration paytida ham token yuborish

```dart
// Device registration API ga yuborilayotgan DeviceInfoDto ga qo'shing
final deviceInfo = {
  'deviceId': deviceId,
  'deviceName': deviceName,
  'deviceType': 'mobile',
  'osName': 'Android', // yoki 'iOS'
  // ... boshqa maydonlar
  'fcmToken': await getFCMToken(), // FCM token qo'shing
};
```

### 4. Notification Qabul Qilish (Flutter)

```dart
// Background message handler
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  print('Background message: ${message.messageId}');
  print('Title: ${message.notification?.title}');
  print('Body: ${message.notification?.body}');
  print('Data: ${message.data}');
}

// App da setup
void setupFirebaseMessaging() {
  FirebaseMessaging messaging = FirebaseMessaging.instance;
  
  // Background handler
  FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);
  
  // Foreground handler
  FirebaseMessaging.onMessage.listen((RemoteMessage message) {
    print('Foreground message: ${message.notification?.title}');
    // Notification UI ko'rsatish
  });
  
  // App background da bo'lsa
  FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
    print('Notification opened: ${message.data}');
    // Navigate qilish
  });
}
```

### 5. Database Migration

TypeORM `synchronize: true` bo'lsa, avtomatik yangilanadi. 
Aks holda migration yaratish kerak:

```sql
ALTER TABLE user_devices 
ADD COLUMN fcm_token VARCHAR(500) NULL;
```

## 🧪 Test Senaryolari

### Senaryo 1: FCM Token ro'yxatdan o'tkazish
1. User login qiladi
2. Flutter app FCM token olishi
3. `/notifications/register-token` ga token yuborish
4. Token `user_devices` jadvalida saqlanishi

### Senaryo 2: Notification yuborish
1. Admin/Director `/notifications/send` endpoint ga so'rov yuboradi
2. Backend user ning barcha active device lari topiladi
3. Har bir device ga notification yuboriladi
4. Flutter app notification ni qabul qiladi va ko'rsatadi

### Senaryo 3: Device registration bilan token
1. User yangi device ga login qiladi
2. Device registration `/devices/register` ga so'rov yuboradi
3. So'rovda `fcmToken` ham yuboriladi
4. Device va FCM token bir vaqtda saqlanadi

## 📚 Qo'shimcha Ma'lumotlar

- **API Documentation**: Swagger UI da `/api-docs` endpoint
- **Firebase Console**: https://console.firebase.google.com/project/tomu-b61c0
- **FCM Documentation**: https://firebase.google.com/docs/cloud-messaging

## ⚠️ Xavfsizlik

1. `.env` fayl git ga commit qilinmasligi kerak
2. Production da environment variables to'g'ri sozlanganligini tekshiring
3. FCM token larni xavfsiz saqlang
4. Admin/Director huquqlarini tekshiring

## 🐛 Xatoliklar

Agar notification ishlamasa:

1. **Firebase initialization xatosi:**
   - `.env` faylda ma'lumotlar to'g'ri ekanligini tekshiring
   - `node test-firebase.js` ni qayta ishga tushiring

2. **Notification yuborilmaydi:**
   - FCM token ro'yxatdan o'tganligini tekshiring
   - User ning active device lari borligini tekshiring
   - Firebase Console da FCM service yoqilganligini tekshiring

3. **Flutter app notification qabul qilmaydi:**
   - `firebase_messaging` package o'rnatilganligini tekshiring
   - Android: `google-services.json` fayl to'g'ri sozlanganligini tekshiring
   - iOS: APNs sertifikat to'g'ri sozlanganligini tekshiring

