# Flutter Firebase Notification Integration

## Flutter dasturchi uchun API endpoints va qo'llanma

### 📡 API Endpoints

#### 1. FCM Token ro'yxatdan o'tkazish

**Endpoint:** `POST /api/notifications/register-token`

**Headers:**

```
Authorization: Bearer {user_token}
Content-Type: application/json
```

**Request Body:**

```json
{
  "fcmToken": "device-fcm-token-bu-yerda",
  "deviceId": "optional-device-id" // ixtiyoriy
}
```

**Response:**

```json
{
  "message": "FCM token registered successfully"
}
```

#### 2. Device registration bilan birga FCM token yuborish

**Endpoint:** `POST /api/devices/register`

**Headers:**

```
Authorization: Bearer {user_token}
Content-Type: application/json
```

**Request Body:**

```json
{
  "deviceId": "device-uuid",
  "deviceName": "iPhone 15 Pro",
  "deviceType": "mobile",
  "osName": "iOS",
  "osVersion": "17.2",
  "ipAddress": "192.168.1.1",
  "userAgent": "Mozilla/5.0...",
  "fcmToken": "device-fcm-token-bu-yerda" // ⭐ QO'SHING!
}
```

**Response:**

```json
{
  "message": "Device registered successfully",
  "data": {
    "deviceId": "...",
    "fcmToken": "..."
  }
}
```

#### 3. Firebase konfiguratsiyasini olish

**Endpoint:** `GET /api/notifications/firebase-config`

**Headers:** Kerak emas (public endpoint)

**Response:**

```json
{
  "projectId": "tomu-b61c0",
  "appIds": {
    "web": "1:1062737653345:web:2945672ae4f851a8f60420",
    "android": "1:1062737653345:android:f8dc6c570f85d476f60420",
    "ios": "1:1062737653345:ios:3abcf8fb98147f10f60420",
    "macos": "1:1062737653345:ios:3abcf8fb98147f10f60420",
    "windows": "1:1062737653345:web:53e4274667dbf524f60420"
  }
}
```

---

## 🔧 Flutter da qanday integratsiya qilish

### 1. FCM token olish va backend ga yuborish

```dart
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

class NotificationService {
  final FirebaseMessaging _firebaseMessaging = FirebaseMessaging.instance;
  final String baseUrl = 'https://your-api-url.com'; // Backend API manzili
  final String? userToken; // User JWT token

  // FCM token olish va ro'yxatdan o'tkazish
  Future<void> registerFCMToken() async {
    try {
      // FCM token olish
      final token = await _firebaseMessaging.getToken();

      if (token == null) return;

      print('FCM Token: $token');

      // Backend ga yuborish
      final response = await http.post(
        Uri.parse('$baseUrl/api/notifications/register-token'),
        headers: {
          'Authorization': 'Bearer $userToken',
          'Content-Type': 'application/json',
        },
        body: jsonEncode({
          'fcmToken': token,
        }),
      );

      if (response.statusCode == 200) {
        print('FCM token muvaffaqiyatli ro\'yxatdan o\'tdi');
      } else {
        print('Xatolik: ${response.statusCode}');
      }
    } catch (e) {
      print('FCM token ro\'yxatdan o\'tishda xatolik: $e');
    }
  }

  // Device registration bilan birga FCM token yuborish
  Future<void> registerDeviceWithFCMToken({
    required String deviceId,
    required String deviceName,
    required String deviceType,
    required String osName,
    required String osVersion,
    required String ipAddress,
    required String userAgent,
  }) async {
    try {
      // FCM token olish
      final fcmToken = await _firebaseMessaging.getToken();

      final response = await http.post(
        Uri.parse('$baseUrl/api/devices/register'),
        headers: {
          'Authorization': 'Bearer $userToken',
          'Content-Type': 'application/json',
        },
        body: jsonEncode({
          'deviceId': deviceId,
          'deviceName': deviceName,
          'deviceType': deviceType,
          'osName': osName,
          'osVersion': osVersion,
          'ipAddress': ipAddress,
          'userAgent': userAgent,
          'fcmToken': fcmToken, // ⭐ FCM token qo'shish
        }),
      );

      if (response.statusCode == 201) {
        print('Device va FCM token muvaffaqiyatli ro\'yxatdan o\'tdi');
      }
    } catch (e) {
      print('Xatolik: $e');
    }
  }

  // Token yangilanishini kuzatish
  void listenTokenRefresh() {
    _firebaseMessaging.onTokenRefresh.listen((newToken) {
      print('FCM token yangilandi: $newToken');
      // Yangi token ni backend ga yuborish
      registerFCMToken();
    });
  }

  // Push notification ni qabul qilish
  void setupForegroundNotification() {
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      print('Yangi bildirishnoma: ${message.notification?.title}');
      // UI da ko'rsatish
    });
  }

  // Background notification
  static Future<void> backgroundMessageHandler(RemoteMessage message) async {
    print('Background notification: ${message.notification?.title}');
  }
}

// main.dart da
void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();

  // Background message handler
  FirebaseMessaging.onBackgroundMessage(
    NotificationService.backgroundMessageHandler
  );

  runApp(MyApp());
}
```

### 2. Foydalanish

```dart
class LoginScreen extends StatefulWidget {
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final NotificationService _notificationService = NotificationService();

  Future<void> login() async {
    // Login qilish...

    // FCM token ni ro'yxatdan o'tkazish
    await _notificationService.registerFCMToken();

    // Token yangilanishini kuzatish
    _notificationService.listenTokenRefresh();

    // Notification qabul qilishni sozlash
    _notificationService.setupForegroundNotification();
  }
}
```

---

## 📋 Qisqa qo'llanma

### Flutter dasturchi qilishi kerak:

1. ✅ **FCM token olish** - `FirebaseMessaging.instance.getToken()`
2. ✅ **Token ni backend ga yuborish** - `POST /api/notifications/register-token`
3. ✅ **Device registration** da `fcmToken` maydonini qo'shish
4. ✅ **Token yangilanishini kuzatish** - `onTokenRefresh`
5. ✅ **Notification qabul qilish** - `onMessage` va `onBackgroundMessage`

---

## 🔗 Backend API manzili

**Base URL:** `https://your-api-url.com/api` (yoki `http://localhost:3000/api` development uchun)

**Endpoints:**

- `POST /api/notifications/register-token` - FCM token saqlash
- `POST /api/devices/register` - Device + FCM token bilan ro'yxatdan o'tish
- `GET /api/notifications/firebase-config` - Firebase konfiguratsiyasi

---

## ⚠️ Muhim eslatmalar

1. FCM token o'zgarishi mumkin - `onTokenRefresh` da yangilanishni yuborish kerak
2. Login qilganda FCM token ni yuborish kerak
3. App yangilansa yoki reinstall qilinsa, token yangilanadi
4. Background notification uchun `onBackgroundMessage` sozlash kerak



