# WebSocket Implementation - Vaqt Hisobi

## 📊 Umumiy Vaqt: **3-5 hafta** (1 kishilik ish)

---

## 🔧 Backend Ishlar

### 1. WebSocket Gateway Yaratish

**Vaqt: 2-3 kun**

- WebSocket Gateway class yaratish
- Connection management
- Room/namespace management
- Event handlers (connect, disconnect, error)

```typescript
// ai-chat.gateway.ts
@WebSocketGateway({
  namespace: "/ai/chat",
  cors: { origin: "*" },
})
export class AIChatGateway {
  // Connection management
  // Event handlers
  // Progress events
}
```

**Ishlar:**

- Gateway class yaratish: 4 soat
- Connection management: 6 soat
- Error handling: 4 soat
- Testing: 6 soat

---

### 2. Authentication/Authorization WebSocket uchun

**Vaqt: 1-2 kun**

- JWT token WebSocket connection'da tekshirish
- Guard yaratish WebSocket uchun
- User session management

```typescript
// websocket-auth.guard.ts
@Injectable()
export class WsAuthGuard implements CanActivate {
  // JWT token tekshirish
  // User validation
}
```

**Ishlar:**

- Guard yaratish: 4 soat
- Token validation: 4 soat
- Testing: 4 soat

---

### 3. Pipeline Service O'zgartirish

**Vaqt: 3-4 kun**

- Pipeline'ni WebSocket events yuborish uchun moslashtirish
- Progress events yuborish (STT, GPT, TTS)
- Error events yuborish

```typescript
// voice-processing-pipeline.service.ts
async execute(input: VoiceInput, client: Socket) {
  // STT progress
  client.emit('progress', { stage: 'stt', status: 'processing' });

  // STT completed
  client.emit('progress', { stage: 'stt', status: 'completed', text: '...' });

  // GPT progress
  client.emit('progress', { stage: 'gpt', status: 'processing' });

  // Complete
  client.emit('complete', { messageId, text, audioUrl });
}
```

**Ishlar:**

- Pipeline o'zgartirish: 8 soat
- Progress events: 8 soat
- Error handling: 4 soat
- Testing: 8 soat

---

### 4. Controller O'zgartirish

**Vaqt: 1-2 kun**

- REST endpoint'ni saqlash (backward compatibility)
- WebSocket handler'lar qo'shish
- Audio file handling WebSocket uchun

```typescript
// ai-chat.gateway.ts
@SubscribeMessage('voice')
async handleVoice(
  @ConnectedSocket() client: Socket,
  @MessageBody() data: { audio: Buffer, sessionId: number }
) {
  // Audio processing
  // Progress events
}
```

**Ishlar:**

- WebSocket handlers: 6 soat
- Audio handling: 4 soat
- Testing: 4 soat

---

### 5. Error Handling va Reconnection

**Vaqt: 2-3 kun**

- Connection drop handling
- Reconnection logic
- Error events
- Timeout handling

**Ishlar:**

- Error handling: 8 soat
- Reconnection logic: 8 soat
- Testing: 8 soat

---

### 6. Infrastructure Sozlamalari

**Vaqt: 2-3 kun**

- Load balancer WebSocket qo'llab-quvvatlash
- Nginx WebSocket proxy sozlamalari
- Docker compose o'zgartirishlar
- Environment variables

**Ishlar:**

- Nginx config: 4 soat
- Load balancer: 4 soat
- Docker: 4 soat
- Testing: 8 soat

---

## 📱 Flutter Client Ishlar

### 7. Flutter WebSocket Integration

**Vaqt: 3-4 kun**

- `web_socket_channel` package o'rnatish
- WebSocket connection management
- Event listeners
- Progress UI
- Error handling
- Reconnection logic

```dart
// ai_chat_service.dart
class AIChatService {
  WebSocketChannel? _channel;

  Future<void> connect(String token) async {
    _channel = WebSocketChannel.connect(
      Uri.parse('ws://your-domain.com/ai/chat?token=$token')
    );

    _channel!.stream.listen(
      (message) => _handleMessage(message),
      onError: (error) => _handleError(error),
      onDone: () => _handleDisconnect(),
    );
  }

  void sendVoice(File audioFile, int sessionId) {
    // Audio yuborish
  }
}
```

**Ishlar:**

- WebSocket connection: 8 soat
- Event handling: 8 soat
- Progress UI: 8 soat
- Error handling: 4 soat
- Testing: 8 soat

---

### 8. UI O'zgartirishlar

**Vaqt: 2-3 kun**

- Progress bar qo'shish
- Real-time status ko'rsatish
- Connection status indicator
- Error messages

**Ishlar:**

- Progress UI: 8 soat
- Status indicators: 4 soat
- Error messages: 4 soat
- Testing: 4 soat

---

## 🧪 Testing

### 9. Backend Testing

**Vaqt: 2-3 kun**

- Unit tests
- Integration tests
- WebSocket connection tests
- Error scenario tests

**Ishlar:**

- Unit tests: 8 soat
- Integration tests: 8 soat
- Error tests: 4 soat

---

### 10. Flutter Testing

**Vaqt: 1-2 kun**

- Widget tests
- Integration tests
- Connection tests

**Ishlar:**

- Widget tests: 4 soat
- Integration tests: 4 soat

---

## 📚 Documentation

### 11. Documentation

**Vaqt: 1-2 kun**

- API documentation
- Flutter integration guide
- Deployment guide
- Troubleshooting guide

**Ishlar:**

- API docs: 4 soat
- Integration guide: 4 soat
- Deployment guide: 4 soat

---

## 📊 Vaqt Jadvali

| #        | Ish                     | Vaqt          | Kun           |
| -------- | ----------------------- | ------------- | ------------- |
| 1        | WebSocket Gateway       | 2-3 kun       | 2-3           |
| 2        | Authentication          | 1-2 kun       | 1-2           |
| 3        | Pipeline O'zgartirish   | 3-4 kun       | 3-4           |
| 4        | Controller O'zgartirish | 1-2 kun       | 1-2           |
| 5        | Error Handling          | 2-3 kun       | 2-3           |
| 6        | Infrastructure          | 2-3 kun       | 2-3           |
| 7        | Flutter Integration     | 3-4 kun       | 3-4           |
| 8        | UI O'zgartirishlar      | 2-3 kun       | 2-3           |
| 9        | Backend Testing         | 2-3 kun       | 2-3           |
| 10       | Flutter Testing         | 1-2 kun       | 1-2           |
| 11       | Documentation           | 1-2 kun       | 1-2           |
| **JAMI** |                         | **20-30 kun** | **3-5 hafta** |

---

## ⚠️ Qo'shimcha Xavflar

### 1. Unexpected Issues

**+20-30% vaqt**

- Connection stability muammolari
- Load balancer muammolari
- Audio streaming muammolari
- Browser compatibility muammolari

### 2. Code Review va Fixes

**+10-15% vaqt**

- Code review
- Bug fixes
- Performance optimization

### 3. Production Deployment

**+1 hafta**

- Staging environment testing
- Production deployment
- Monitoring setup
- Rollback plan

---

## 📈 Realistik Vaqt Hisobi

### Optimistik Senaryo

**3 hafta** (1 kishilik, kuniga 8 soat)

### Realistik Senaryo

**4-5 hafta** (1 kishilik, kuniga 8 soat)

### Pessimistik Senaryo

**6-8 hafta** (1 kishilik, kuniga 8 soat, muammolar bilan)

---

## 💰 Xarajatlar

### Developer Vaqti

- **3 hafta**: ~120 soat
- **4-5 hafta**: ~160-200 soat
- **6-8 hafta**: ~240-320 soat

### Infrastructure

- Load balancer sozlamalari
- Monitoring tools
- Additional server resources

---

## ✅ Alternativ: REST API + SSE

### Vaqt: **1-2 hafta** (1 kishilik)

**Ishlar:**

- SSE endpoint yaratish: 2-3 kun
- Progress events: 1-2 kun
- Flutter SSE integration: 2-3 kun
- Testing: 1-2 kun

**Afzalliklari:**

- REST API saqlanadi (backward compatibility)
- Oddiy implementatsiya
- Kamroq vaqt
- Kamroq xavf

---

## 🎯 Xulosa

### WebSocket Implementation

- **Vaqt**: 3-5 hafta (realistik)
- **Murakkablik**: Yuqori
- **Xavf**: Yuqori
- **Afzallik**: Real-time progress

### REST API + SSE

- **Vaqt**: 1-2 hafta
- **Murakkablik**: O'rtacha
- **Xavf**: Past
- **Afzallik**: Progress updates

---

## 💡 Tavsiya

**REST API + SSE** ishlatish tavsiya etiladi:

- 2-3 hafta tezroq
- Kamroq murakkablik
- Kamroq xavf
- Progress updates ham mumkin

**WebSocket** faqat quyidagi holatlarda:

- Real-time bidirectional communication kerak bo'lsa
- Streaming audio kerak bo'lsa
- Multiple rapid requests kerak bo'lsa

---

**Tahlil sanasi**: 2024  
**Status**: ⚠️ WebSocket implementation 3-5 hafta ketadi
