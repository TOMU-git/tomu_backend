# AI API - Flutter Developer Guide

## Umumiy Ma'lumot

AI moduli ovozli suhbat funksiyasini taqdim etadi. Flutter ilovangizda foydalanuvchi ovoz yuboradi, AI esa matn va ovozli javob qaytaradi.

**Base URL**: `https://your-domain.com/ai/chat`
**Authentication**: Barcha API'larda JWT token kerak

---

## 1. Sessiya Yaratish

### API: `POST /ai/chat/sessions`

**Maqsad**: Yangi AI suhbat sessiyasini yaratadi

**Headers**:

```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body**:

```json
{
  "courseId": 1, // Ixtiyoriy - kurs ID (number)
  "sessionLanguage": "ar", // Ixtiyoriy - sessiya tili (string)
  "sessionTitle": "Yangi suhbat" // Ixtiyoriy - sessiya nomi (string)
}
```

**Response Success (200)**:

```json
{
  "message": "ok",
  "data": {
    "id": 123, // Sessiya ID - keyingi API'larda ishlatiladi
    "userId": 456, // Foydalanuvchi ID
    "courseId": 1, // Kurs ID
    "sessionLanguage": "ar", // Sessiya tili
    "sessionTitle": "Yangi suhbat", // Sessiya nomi
    "createdAt": "2024-01-01T12:00:00Z",
    "updatedAt": "2024-01-01T12:00:00Z"
  }
}
```

**Response Errors**:

- `401 Unauthorized` - Token noto'g'ri yoki yo'q
- `400 Bad Request` - Request body noto'g'ri

---

## 2. Ovozli Xabar Yuborish

### API: `POST /ai/chat/voice`

**Maqsad**: Foydalanuvchi ovozini yuboradi va AI'dan javob oladi

**Headers**:

```
Authorization: Bearer <jwt_token>
Content-Type: multipart/form-data
```

**Request Body (Form Data)**:

```
file: <audio_file>        // Majburiy - audio fayl (File)
sessionId: 123            // Majburiy - sessiya ID (number)
courseId: 1               // Ixtiyoriy - kurs ID (number)
language: "ar"            // Ixtiyoriy - STT tili (string)
```

**Qo'llab-quvvatlanadigan Audio Formatlar**:

- MP3 (`audio/mpeg`, `audio/mp3`)
- WAV (`audio/wav`, `audio/x-wav`)
- WebM (`audio/webm`)
- OGG (`audio/ogg`)

**Audio Cheklovlar**:

- Maksimal hajm: 15MB
- Maksimal davomiylik: 25 daqiqa

**Response Success (200)**:

```json
{
  "message": "ok",
  "data": {
    "messageId": 789, // Xabar ID
    "sessionId": 123, // Sessiya ID
    "text": "AI javob matni arab tilida", // AI javob matni
    "textUz": "", // O'zbekcha tarjima (hozircha bo'sh)
    "audioUrl": "/upload/audio/tts_1761595335910.mp3", // AI ovozli javob URL
    "isWithinLimit": true, // Limit ichidami (boolean)
    "createdAt": "2024-01-01T12:05:00Z" // Yaratilgan vaqt
  }
}
```

**Response Errors**:

- `401 Unauthorized` - Token noto'g'ri
- `400 Bad Request` - Audio fayl noto'g'ri yoki sessionId yo'q
- `403 Forbidden` - Sessiya sizga tegishli emas
- `413 Payload Too Large` - Audio fayl juda katta

---

## 3. Sessiya Xabarlarini Olish

### API: `GET /ai/chat/sessions/:id/messages`

**Maqsad**: Sessiyadagi barcha xabarlarni oladi

**Headers**:

```
Authorization: Bearer <jwt_token>
```

**URL Parameters**:

- `id` - Sessiya ID (number) - URL'da beriladi

**Response Success (200)**:

```json
{
  "message": "ok",
  "data": [
    {
      "id": 789, // Xabar ID
      "sessionId": 123, // Sessiya ID
      "userMessage": "Foydalanuvchi xabari", // Foydalanuvchi xabari
      "aiResponseText": "AI javob matni", // AI javob matni
      "audioUrl": "/upload/audio/tts_1761595335910.mp3", // AI ovozli javob URL
      "isWithinLimit": true, // Limit ichidami
      "createdAt": "2024-01-01T12:05:00Z" // Yaratilgan vaqt
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

**Response Errors**:

- `401 Unauthorized` - Token noto'g'ri
- `403 Forbidden` - Sessiya sizga tegishli emas
- `404 Not Found` - Sessiya topilmadi

---

## 4. Tizim Holati

### API: `GET /ai/admin/health`

**Maqsad**: AI tizimining holatini tekshiradi

**Response Success (200)**:

```json
{
  "message": "ok"
}
```

---

## Flutter Implementation

### pubspec.yaml dependencies

```yaml
dependencies:
  http: ^1.1.0
  path_provider: ^2.1.1
  permission_handler: ^11.0.1
  record: ^5.0.4
  audioplayers: ^5.2.1
```

### 1. Sessiya Yaratish

```dart
import 'dart:convert';
import 'package:http/http.dart' as http;

class AIService {
  static const String baseUrl = 'https://your-domain.com/ai/chat';

  // Sessiya yaratish
  static Future<Map<String, dynamic>> createSession({
    required String token,
    int? courseId,
    String sessionLanguage = 'ar',
    String? sessionTitle,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/sessions'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
        body: jsonEncode({
          if (courseId != null) 'courseId': courseId,
          'sessionLanguage': sessionLanguage,
          if (sessionTitle != null) 'sessionTitle': sessionTitle,
        }),
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        throw Exception('Sessiya yaratishda xato: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Sessiya yaratishda xato: $e');
    }
  }
}
```

### 2. Ovoz Yuborish

```dart
import 'dart:io';
import 'package:http/http.dart' as http;

class AIService {
  // Ovoz yuborish
  static Future<Map<String, dynamic>> sendVoice({
    required String token,
    required int sessionId,
    required File audioFile,
    int? courseId,
    String language = 'ar',
  }) async {
    try {
      var request = http.MultipartRequest(
        'POST',
        Uri.parse('$baseUrl/voice'),
      );

      // Headers
      request.headers['Authorization'] = 'Bearer $token';

      // Audio fayl
      request.files.add(await http.MultipartFile.fromPath(
        'file',
        audioFile.path,
        filename: audioFile.path.split('/').last,
      ));

      // Form data
      request.fields['sessionId'] = sessionId.toString();
      if (courseId != null) {
        request.fields['courseId'] = courseId.toString();
      }
      request.fields['language'] = language;

      var response = await request.send();
      var responseBody = await response.stream.bytesToString();

      if (response.statusCode == 200) {
        return jsonDecode(responseBody);
      } else {
        throw Exception('Ovoz yuborishda xato: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Ovoz yuborishda xato: $e');
    }
  }
}
```

### 3. Xabarlar Tarixini Olish

```dart
class AIService {
  // Xabarlar tarixini olish
  static Future<Map<String, dynamic>> getMessages({
    required String token,
    required int sessionId,
  }) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/sessions/$sessionId/messages'),
        headers: {
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        throw Exception('Xabarlar olishda xato: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Xabarlar olishda xato: $e');
    }
  }
}
```

### 4. To'liq Flutter Widget Misoli

```dart
import 'package:flutter/material.dart';
import 'package:record/record.dart';
import 'package:audioplayers/audioplayers.dart';
import 'package:permission_handler/permission_handler.dart';

class AIChatScreen extends StatefulWidget {
  final String token;
  final int? courseId;

  const AIChatScreen({
    Key? key,
    required this.token,
    this.courseId,
  }) : super(key: key);

  @override
  State<AIChatScreen> createState() => _AIChatScreenState();
}

class _AIChatScreenState extends State<AIChatScreen> {
  final Record _record = Record();
  final AudioPlayer _audioPlayer = AudioPlayer();

  int? _sessionId;
  List<Map<String, dynamic>> _messages = [];
  bool _isRecording = false;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _createSession();
  }

  // Sessiya yaratish
  Future<void> _createSession() async {
    try {
      final response = await AIService.createSession(
        token: widget.token,
        courseId: widget.courseId,
        sessionTitle: 'Yangi suhbat',
      );

      if (response['message'] == 'ok') {
        setState(() {
          _sessionId = response['data']['id'];
        });
        _loadMessages();
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Sessiya yaratishda xato: $e')),
      );
    }
  }

  // Ovoz yozishni boshlash
  Future<void> _startRecording() async {
    try {
      if (await _record.hasPermission()) {
        await _record.start();
        setState(() {
          _isRecording = true;
        });
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Mikrofon ruxsati kerak')),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Ovoz yozishda xato: $e')),
      );
    }
  }

  // Ovoz yozishni to'xtatish va yuborish
  Future<void> _stopRecording() async {
    try {
      final path = await _record.stop();
      setState(() {
        _isRecording = false;
        _isLoading = true;
      });

      if (path != null && _sessionId != null) {
        final audioFile = File(path);

        final response = await AIService.sendVoice(
          token: widget.token,
          sessionId: _sessionId!,
          audioFile: audioFile,
          courseId: widget.courseId,
        );

        if (response['message'] == 'ok') {
          final data = response['data'];

          // Yangi xabarni qo'shish
          setState(() {
            _messages.add({
              'id': data['messageId'],
              'userMessage': 'Ovozli xabar',
              'aiResponseText': data['text'],
              'audioUrl': data['audioUrl'],
              'createdAt': data['createdAt'],
            });
          });

          // AI ovozli javobni ijro etish
          if (data['audioUrl'] != null) {
            await _playAudio('https://your-domain.com${data['audioUrl']}');
          }
        }
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Ovoz yuborishda xato: $e')),
      );
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  // Audio ijro etish
  Future<void> _playAudio(String url) async {
    try {
      await _audioPlayer.play(UrlSource(url));
    } catch (e) {
      print('Audio ijro etishda xato: $e');
    }
  }

  // Xabarlar tarixini yuklash
  Future<void> _loadMessages() async {
    if (_sessionId == null) return;

    try {
      final response = await AIService.getMessages(
        token: widget.token,
        sessionId: _sessionId!,
      );

      if (response['message'] == 'ok') {
        setState(() {
          _messages = List<Map<String, dynamic>>.from(response['data']);
        });
      }
    } catch (e) {
      print('Xabarlar yuklashda xato: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('AI Suhbat'),
        backgroundColor: Colors.blue,
      ),
      body: Column(
        children: [
          // Xabarlar ro'yxati
          Expanded(
            child: ListView.builder(
              itemCount: _messages.length,
              itemBuilder: (context, index) {
                final message = _messages[index];
                return Card(
                  margin: const EdgeInsets.all(8.0),
                  child: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Foydalanuvchi: ${message['userMessage']}',
                          style: const TextStyle(fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 8),
                        Text('AI: ${message['aiResponseText']}'),
                        if (message['audioUrl'] != null) ...[
                          const SizedBox(height: 8),
                          ElevatedButton.icon(
                            onPressed: () => _playAudio(
                              'https://your-domain.com${message['audioUrl']}',
                            ),
                            icon: const Icon(Icons.play_arrow),
                            label: const Text('Ovozni tinglash'),
                          ),
                        ],
                      ],
                    ),
                  ),
                );
              },
            ),
          ),

          // Yozish paneli
          Container(
            padding: const EdgeInsets.all(16.0),
            child: Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: _isLoading ? null : (_isRecording ? _stopRecording : _startRecording),
                    icon: Icon(_isRecording ? Icons.stop : Icons.mic),
                    label: Text(_isRecording ? 'To\'xtatish' : 'Ovoz yozish'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: _isRecording ? Colors.red : Colors.blue,
                      foregroundColor: Colors.white,
                    ),
                  ),
                ),
                if (_isLoading)
                  const Padding(
                    padding: EdgeInsets.only(left: 16.0),
                    child: CircularProgressIndicator(),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    _record.dispose();
    _audioPlayer.dispose();
    super.dispose();
  }
}
```

---

## Xatolar va Yechimlar

### Umumiy Xato Kodlari

| Xato Kodi | Xato Nomi         | Sabab                       | Yechim                   |
| --------- | ----------------- | --------------------------- | ------------------------ |
| 401       | Unauthorized      | Token yo'q yoki noto'g'ri   | Token'ni tekshiring      |
| 400       | Bad Request       | Request body noto'g'ri      | Ma'lumotlarni tekshiring |
| 403       | Forbidden         | Sessiya sizga tegishli emas | Sessiya ID'ni tekshiring |
| 413       | Payload Too Large | Audio fayl juda katta       | Fayl hajmini kamaytiring |

### Audio Fayl Validatsiyasi

```dart
bool validateAudioFile(File file) {
  const maxSize = 15 * 1024 * 1024; // 15MB
  const allowedExtensions = ['.mp3', '.wav', '.webm', '.ogg'];

  // Fayl hajmini tekshirish
  if (file.lengthSync() > maxSize) {
    return false;
  }

  // Fayl kengaytmasini tekshirish
  final extension = file.path.toLowerCase().split('.').last;
  if (!allowedExtensions.contains('.$extension')) {
    return false;
  }

  return true;
}
```

### Error Handling

```dart
Future<void> handleApiError(int statusCode, String message) async {
  switch (statusCode) {
    case 401:
      // Token yangilash yoki login qaytarish
      break;
    case 400:
      // Ma'lumotlarni tekshirish
      break;
    case 403:
      // Ruxsat yo'q
      break;
    case 413:
      // Fayl hajmini kamaytirish
      break;
    default:
      // Umumiy xato
      break;
  }
}
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
```

### Audio Fayl Sozlamalari

- **Maksimal hajm**: 15MB
- **Qo'llab-quvvatlanadigan formatlar**: MP3, WAV, WebM, OGG
- **Maksimal davomiylik**: 25 daqiqa
- **Saqlash joyi**: `/upload/audio/` papkasi

### Session Lifecycle

- **Avtomatik yopilish**: 24 soatdan keyin
- **Xabarlar saqlanishi**: Cheksiz
- **Audio fayllar**: Server'da saqlanadi

---

## Qo'shimcha Ma'lumotlar

- **Til qo'llab-quvvatlash**: Asosan Arabic uchun optimizatsiya
- **RAG tizimi**: Dars materiallari asosida javob beradi
- **Real-time**: WebSocket emas, HTTP API
- **Offline**: Audio fayllar cache qilinadi
- **Performance**: Audio compression tavsiya etiladi

