# AI API Documentation

## Umumiy Ma'lumot

AI moduli ovozli suhbat funksiyasini taqdim etadi. Foydalanuvchilar ovoz yuboradi, AI esa matn va ovozli javob qaytaradi.

**Base URL**: `https://your-domain.com/ai/chat`

**Authentication**: Barcha endpoint'lar uchun JWT token kerak (Authorization header)

---

## 1. Sessiya Yaratish

### `POST /ai/chat/sessions`

Yangi AI suhbat sessiyasini yaratadi.

**Headers:**

```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "courseId": 1, // Ixtiyoriy - kurs ID
  "sessionLanguage": "ar", // Ixtiyoriy - sessiya tili (default: "ar")
  "sessionTitle": "Yangi suhbat" // Ixtiyoriy - sessiya nomi
}
```

**Response:**

```json
{
  "message": "ok",
  "data": {
    "id": 123,
    "userId": 456,
    "courseId": 1,
    "sessionLanguage": "ar",
    "sessionTitle": "Yangi suhbat",
    "createdAt": "2024-01-01T12:00:00Z",
    "updatedAt": "2024-01-01T12:00:00Z"
  }
}
```

**Error Responses:**

- `401 Unauthorized` - Token noto'g'ri yoki yo'q
- `400 Bad Request` - Noto'g'ri request body

---

## 2. Ovozli Xabar Yuborish

### `POST /ai/chat/voice`

Foydalanuvchi ovozini yuboradi va AI'dan javob oladi.

**Headers:**

```
Authorization: Bearer <jwt_token>
Content-Type: multipart/form-data
```

**Request Body (Form Data):**

```
file: <audio_file>        // Majburiy - audio fayl
sessionId: 123            // Majburiy - sessiya ID
courseId: 1               // Ixtiyoriy - kurs ID
language: "ar"            // Ixtiyoriy - STT tili (default: "ar")
```

**Qo'llab-quvvatlanadigan Audio Formatlar:**

- MP3 (`audio/mpeg`, `audio/mp3`)
- WAV (`audio/wav`, `audio/x-wav`)
- WebM (`audio/webm`)
- OGG (`audio/ogg`)

**Audio Cheklovlar:**

- Maksimal hajm: 15MB
- Maksimal davomiylik: 25 daqiqa (Whisper limit)

**Response:**

```json
{
  "message": "ok",
  "data": {
    "messageId": 789,
    "sessionId": 123,
    "text": "AI javob matni arab tilida",
    "textUz": "", // O'zbekcha tarjima (hozircha bo'sh)
    "audioUrl": "/upload/audio/tts_1761595335910.mp3",
    "isWithinLimit": true,
    "createdAt": "2024-01-01T12:05:00Z"
  }
}
```

**Error Responses:**

- `401 Unauthorized` - Token noto'g'ri
- `400 Bad Request` - Audio fayl noto'g'ri yoki sessionId yo'q
- `403 Forbidden` - Sessiya sizga tegishli emas
- `413 Payload Too Large` - Audio fayl juda katta

---

## 3. Sessiya Xabarlarini Olish

### `GET /ai/chat/sessions/:id/messages`

Sessiyadagi barcha xabarlarni oladi.

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**URL Parameters:**

- `id` - Sessiya ID (number)

**Response:**

```json
{
  "message": "ok",
  "data": [
    {
      "id": 789,
      "sessionId": 123,
      "userMessage": "Foydalanuvchi xabari",
      "aiResponseText": "AI javob matni",
      "audioUrl": "/upload/audio/tts_1761595335910.mp3",
      "isWithinLimit": true,
      "createdAt": "2024-01-01T12:05:00Z"
    },
    {
      "id": 790,
      "sessionId": 123,
      "userMessage": "Yana bir xabar",
      "aiResponseText": "Yana bir javob",
      "audioUrl": "/upload/audio/tts_1761595335911.mp3",
      "isWithinLimit": true,
      "createdAt": "2024-01-01T12:10:00Z"
    }
  ]
}
```

**Error Responses:**

- `401 Unauthorized` - Token noto'g'ri
- `403 Forbidden` - Sessiya sizga tegishli emas
- `404 Not Found` - Sessiya topilmadi

---

## 4. Tizim Holati

### `GET /ai/admin/health`

AI tizimining holatini tekshiradi.

**Response:**

```json
{
  "message": "ok"
}
```

---

## Mobil Ilova Integratsiya Misollari

### React Native (JavaScript)

```javascript
// 1. Sessiya yaratish
const createSession = async (token) => {
  const response = await fetch("https://your-domain.com/ai/chat/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      courseId: 1,
      sessionLanguage: "ar",
      sessionTitle: "Yangi suhbat",
    }),
  });
  return await response.json();
};

// 2. Ovoz yuborish
const sendVoice = async (token, sessionId, audioFile) => {
  const formData = new FormData();
  formData.append("file", {
    uri: audioFile.uri,
    type: audioFile.type,
    name: audioFile.name,
  });
  formData.append("sessionId", sessionId.toString());
  formData.append("language", "ar");

  const response = await fetch("https://your-domain.com/ai/chat/voice", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "multipart/form-data",
    },
    body: formData,
  });
  return await response.json();
};

// 3. Xabarlar tarixini olish
const getMessages = async (token, sessionId) => {
  const response = await fetch(
    `https://your-domain.com/ai/chat/sessions/${sessionId}/messages`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );
  return await response.json();
};
```

### Flutter (Dart)

```dart
// 1. Sessiya yaratish
Future<Map<String, dynamic>> createSession(String token) async {
  final response = await http.post(
    Uri.parse('https://your-domain.com/ai/chat/sessions'),
    headers: {
      'Authorization': 'Bearer $token',
      'Content-Type': 'application/json',
    },
    body: jsonEncode({
      'courseId': 1,
      'sessionLanguage': 'ar',
      'sessionTitle': 'Yangi suhbat',
    }),
  );
  return jsonDecode(response.body);
}

// 2. Ovoz yuborish
Future<Map<String, dynamic>> sendVoice(String token, int sessionId, File audioFile) async {
  var request = http.MultipartRequest(
    'POST',
    Uri.parse('https://your-domain.com/ai/chat/voice'),
  );

  request.headers['Authorization'] = 'Bearer $token';
  request.files.add(await http.MultipartFile.fromPath('file', audioFile.path));
  request.fields['sessionId'] = sessionId.toString();
  request.fields['language'] = 'ar';

  var response = await request.send();
  var responseBody = await response.stream.bytesToString();
  return jsonDecode(responseBody);
}
```

---

## Xatolar va Yechimlar

### Umumiy Xatolar

| Xato Kodi | Xato Nomi         | Sabab                     | Yechim                                       |
| --------- | ----------------- | ------------------------- | -------------------------------------------- |
| 401       | Unauthorized      | Token yo'q yoki noto'g'ri | Token'ni tekshiring                          |
| 400       | Bad Request       | Noto'g'ri request         | Request body'ni tekshiring                   |
| 403       | Forbidden         | Ruxsat yo'q               | Sessiya sizga tegishli ekanligini tekshiring |
| 413       | Payload Too Large | Audio fayl juda katta     | Fayl hajmini kamaytiring                     |

### Audio Fayl Muammolari

```javascript
// Audio fayl validatsiyasi
const validateAudioFile = (file) => {
  const maxSize = 15 * 1024 * 1024; // 15MB
  const allowedTypes = [
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/webm",
    "audio/ogg",
  ];

  if (file.size > maxSize) {
    throw new Error("Audio fayl juda katta (max: 15MB)");
  }

  if (!allowedTypes.includes(file.type)) {
    throw new Error("Audio format qo'llab-quvvatlanmaydi");
  }
};
```

---

## Production Sozlamalari

### Environment Variables

```bash
# Majburiy
OPENAI_API_KEY=sk-proj-...

# Ixtiyoriy (default qiymatlar)
USE_RAG=1
CHROMA_URL=http://chroma:8000
CHROMA_COLLECTION=lessons
GPT_MODEL=gpt-4o
TTS_MODEL=tts-1-hd
WHISPER_MODEL=whisper-1
TTS_VOICE=shimmer
TTS_SPEED=0.9
MAX_TOKENS=200
TEMPERATURE=0.3
```

### Rate Limiting

Hozircha rate limiting yo'q, lekin production'da qo'shish tavsiya etiladi.

### Monitoring

AI tizimining holatini kuzatish uchun:

```bash
curl https://your-domain.com/ai/admin/health
```

---

## Qo'shimcha Ma'lumotlar

- **Til Qo'llab-quvvatlash**: Asosan Arabic uchun optimizatsiya qilingan
- **RAG Tizimi**: Dars materiallari asosida javob beradi
- **Audio Processing**: OpenAI Whisper (STT) va TTS ishlatiladi
- **Session Lifecycle**: 24 soatdan keyin avtomatik yopiladi
- **File Storage**: Audio fayllar `/upload/audio/` papkasida saqlanadi

