# AI Module - Error Handling Guide

## 📁 Structure

```
src/modules/ai/
├── constants/
│   ├── error-codes.enum.ts           # Error code definitions
│   └── error-messages.constant.ts     # User-friendly messages
├── exceptions/
│   ├── ai-exception.base.ts           # Base exception class
│   ├── limit-exceeded.exception.ts
│   ├── payment-required.exception.ts
│   ├── subscription-expired.exception.ts
│   ├── invalid-session.exception.ts
│   ├── invalid-audio.exception.ts
│   ├── ai-service-unavailable.exception.ts
│   ├── rate-limit.exception.ts
│   ├── audio-not-recognized.exception.ts
│   └── index.ts                       # Barrel export
├── filters/
│   └── ai-exception.filter.ts         # Global exception filter
└── dto/
    └── error-response.dto.ts          # Response structure
```

---

## 🚀 Usage Examples

### 1. Throwing Exceptions in Services

```typescript
import {
  LimitExceededException,
  PaymentRequiredException,
  InvalidAudioException,
  AIServiceUnavailableException,
  RateLimitException,
  AudioNotRecognizedException,
} from "../exceptions";

// Example 1: Limit exceeded
throw new LimitExceededException({
  currentCost: 2.5,
  limit: 2.0,
  remaining: -0.5,
  courseId: 1,
  month: "2025-01",
});

// Example 2: Payment required
throw new PaymentRequiredException({
  courseId: 1,
  userId: 123,
});

// Example 3: Invalid audio
throw new InvalidAudioException({
  mimetype: "video/mp4",
  size: 30000000,
  maxSize: 25000000,
  reason: "too_large",
});

// Example 4: AI service unavailable (OpenAI down)
throw new AIServiceUnavailableException({
  service: "whisper",
  originalError: "Connection timeout",
  statusCode: 503,
});

// Example 5: Rate limit exceeded
throw new RateLimitException({
  service: "openai",
  retryAfter: 60, // seconds
});

// Example 6: Audio not recognized
throw new AudioNotRecognizedException({
  transcription: "",
  duration: 2.5,
  audioSize: 1024000,
});
```

---

### 2. Catching and Handling in Controllers

```typescript
@Post('voice')
async sendVoice(...) {
  try {
    const result = await this.aiService.processVoice(...);
    return { message: 'ok', data: result };
  } catch (error) {
    // AIExceptionFilter automatically handles all errors
    // No need to manually catch - just let it bubble up
    throw error;
  }
}
```

**Note:** With `AIExceptionFilter`, you don't need to manually catch exceptions in controllers. The filter will automatically:

- Transform exceptions to standardized error responses
- Log errors with context
- Return appropriate HTTP status codes

---

### 3. Error Response Format

All errors return the following structure:

```typescript
{
  "message": "error",
  "errorCode": "LIMIT_EXCEEDED",
  "data": {
    "message": "Oylik limitingiz tugagan ($2). Yangi oyni kuting yoki qayta to'lov qiling.",
    "retryable": false,
    "action": "wait_or_pay"
  }
}
```

---

## 📊 Error Codes Reference

| Error Code             | HTTP Status | Retryable | Action               | Description                    |
| ---------------------- | ----------- | --------- | -------------------- | ------------------------------ |
| `LIMIT_EXCEEDED`       | 402         | ❌ No     | `wait_or_pay`        | Monthly limit exceeded         |
| `PAYMENT_REQUIRED`     | 402         | ❌ No     | `purchase_course`    | Course not purchased           |
| `SUBSCRIPTION_EXPIRED` | 402         | ❌ No     | `renew_subscription` | Subscription expired           |
| `INVALID_SESSION`      | 400         | ❌ No     | `create_new_session` | Session not found or forbidden |
| `INVALID_AUDIO`        | 400         | ❌ No     | `upload_valid_audio` | Invalid audio file             |
| `AI_SERVICE_ERROR`     | 503         | ✅ Yes    | `retry_later`        | AI service unavailable         |
| `RATE_LIMIT_EXCEEDED`  | 429         | ✅ Yes    | `wait_retry`         | Too many requests              |
| `AUDIO_NOT_RECOGNIZED` | 400         | ✅ Yes    | `retry_audio`        | Audio not transcribed          |
| `NETWORK_ERROR`        | 503         | ✅ Yes    | `check_connection`   | Network connection failed      |
| `SERVER_ERROR`         | 500         | ✅ Yes    | `retry`              | Internal server error          |

---

## 🔧 Implementation Details

### AIExceptionFilter

The filter automatically:

1. Catches all exceptions (AI and non-AI)
2. Transforms to standardized error response
3. Logs with context (userId, path, timestamp)
4. Maps unknown errors to appropriate error codes

### Exception Hierarchy

```
Error (native)
└── HttpException (NestJS)
    └── AIException (base)
        ├── LimitExceededException
        ├── PaymentRequiredException
        ├── SubscriptionExpiredException
        ├── InvalidSessionException
        ├── InvalidAudioException
        ├── AIServiceUnavailableException
        ├── RateLimitException
        └── AudioNotRecognizedException
```

---

## 📱 Mobile App Integration

### Handling Errors in Flutter

```dart
try {
  final response = await api.sendVoice(...);
  // Success
} catch (e) {
  if (e is ApiException) {
    final errorCode = e.errorCode;
    final message = e.data.message;
    final retryable = e.data.retryable;
    final action = e.data.action;

    // Handle based on error code
    switch (errorCode) {
      case 'LIMIT_EXCEEDED':
        showDialog('Limit tugagan', message);
        break;
      case 'PAYMENT_REQUIRED':
        navigateTo(PurchasePage());
        break;
      case 'SUBSCRIPTION_EXPIRED':
        navigateTo(RenewSubscriptionPage());
        break;
      // ... other cases
      default:
        if (retryable) {
          showRetryButton();
        } else {
          showErrorMessage(message);
        }
    }
  }
}
```

### Error Response Type

```dart
class AIErrorResponse {
  final String message; // 'error'
  final String errorCode;
  final ErrorData data;
}

class ErrorData {
  final String message;
  final bool retryable;
  final String action;
}
```

---

## ✅ Best Practices

1. **Always throw domain exceptions in services**

   - Use specific exception classes (not generic `BadRequestException`)
   - Include relevant details in exception constructor

2. **Let exceptions bubble up**

   - Don't catch exceptions in controllers
   - Let `AIExceptionFilter` handle them

3. **Include context in exceptions**

   - Pass relevant IDs (userId, courseId, sessionId)
   - Include technical details for debugging

4. **Log appropriately**

   - Domain exceptions → WARN level (expected errors)
   - Unknown errors → ERROR level (needs investigation)

5. **Test error scenarios**
   - Write tests for each exception type
   - Verify error response structure

---

## 🧪 Testing

### Unit Test Example

```typescript
describe("AIExceptionFilter", () => {
  it("should transform LimitExceededException to error response", () => {
    const exception = new LimitExceededException({
      currentCost: 2.5,
      limit: 2.0,
      remaining: -0.5,
    });

    const response = filter.catch(exception, mockHost);

    expect(response.status).toBe(402);
    expect(response.body.errorCode).toBe("LIMIT_EXCEEDED");
    expect(response.body.data.retryable).toBe(false);
  });
});
```

---

## 📝 Migration Guide

### Replacing Old Exceptions

**Before:**

```typescript
throw new BadRequestException("Session not found");
```

**After:**

```typescript
throw new InvalidSessionException({
  sessionId: 123,
  userId: 456,
  reason: "not_found",
});
```

### Deprecated Exceptions

- ❌ `SessionForbiddenException` → ✅ `InvalidSessionException`
- ❌ Generic `BadRequestException` → ✅ Specific domain exceptions

---

## 🔗 Related Files

- `/src/modules/ai/constants/error-codes.enum.ts` - Error code definitions
- `/src/modules/ai/constants/error-messages.constant.ts` - User-friendly messages
- `/src/modules/ai/exceptions/` - Exception classes
- `/src/modules/ai/filters/ai-exception.filter.ts` - Global exception filter
- `/src/modules/ai/dto/error-response.dto.ts` - Swagger documentation

---

## ❓ FAQ

**Q: Do I need to catch exceptions in controllers?**
A: No, `AIExceptionFilter` handles all exceptions automatically.

**Q: How do I add a new error type?**
A:

1. Add error code to `error-codes.enum.ts`
2. Add message config to `error-messages.constant.ts`
3. Create exception class extending `AIException`
4. Export from `exceptions/index.ts`

**Q: Can I customize error messages?**
A: Yes, edit `error-messages.constant.ts` or pass dynamic details in exception constructor.

**Q: How do I test error handling?**
A: Use Postman/cURL to trigger errors, or write unit/e2e tests.

---

**Last Updated:** 2025-11-06  
**Version:** 1.0.0


