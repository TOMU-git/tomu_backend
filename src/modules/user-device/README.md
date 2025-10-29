# Device Management Module

A comprehensive device management system for user authentication and security.

## 🚀 Features

- **Device Registration**: Register and manage user devices
- **Device Limits**: Enforce device limits based on user roles
- **Security Levels**: Track device security and risk assessment
- **Automatic Cleanup**: Remove expired and inactive devices
- **Analytics**: Device usage statistics and insights
- **Progressive Enhancement**: Backward compatible implementation

## 📋 Requirements

- Node.js 18+
- TypeScript 4.5+
- NestJS 9+
- TypeORM 0.3+
- PostgreSQL 12+

## 🛠️ Installation

The module is already integrated into the main application. No additional installation required.

## ⚙️ Configuration

### Environment Variables

```bash
# Device Management
ENABLE_DEVICE_MANAGEMENT=true
ENABLE_DEVICE_LIMITS=true
ENABLE_DEVICE_CLEANUP=true
ENABLE_DEVICE_ANALYTICS=true
ENABLE_DEVICE_SECURITY=true

# Device Limits (per role)
DEVICE_LIMIT_STUDENT=2
DEVICE_LIMIT_TEACHER=3
DEVICE_LIMIT_ADMIN=5
DEVICE_LIMIT_DIRECTOR=10

# Session Settings
DEVICE_SESSION_EXPIRY_DAYS=30
DEVICE_MAX_EXPIRY_DAYS=90
DEVICE_MIN_EXPIRY_DAYS=1

# Cleanup Settings
DEVICE_INACTIVE_DAYS=60
DEVICE_EXPIRED_DAYS=30
DEVICE_CLEANUP_BATCH_SIZE=100
DEVICE_CLEANUP_INTERVAL_HOURS=24

# Security Settings
DEVICE_ENABLE_FINGERPRINTING=true
DEVICE_ENABLE_LOCATION=false
DEVICE_ENABLE_IP_VALIDATION=true
DEVICE_MAX_FAILED_ATTEMPTS=5
DEVICE_LOCKOUT_DURATION_MINUTES=30

# Rate Limiting
DEVICE_REGISTRATION_RATE_LIMIT=5
DEVICE_REMOVAL_RATE_LIMIT=10
DEVICE_LIST_RATE_LIMIT=30
DEVICE_RATE_LIMIT_WINDOW_MS=900000

# Monitoring
DEVICE_ENABLE_METRICS=true
DEVICE_ENABLE_LOGGING=true
DEVICE_LOG_LEVEL=info
DEVICE_ENABLE_ALERTS=true
```

## 🏗️ Architecture

### Components

- **Entities**: Database models for devices and users
- **Repositories**: Data access layer
- **Services**: Business logic layer
- **Controllers**: API endpoints
- **DTOs**: Data transfer objects
- **Utils**: Utility functions
- **Hooks**: React hooks for frontend integration

### Database Schema

```sql
-- User devices table
CREATE TABLE user_devices (
  id SERIAL PRIMARY KEY,
  device_id VARCHAR(36) NOT NULL,
  device_name VARCHAR(255) NOT NULL,
  device_type VARCHAR(50) NOT NULL,
  os_name VARCHAR(100) NOT NULL,
  os_version VARCHAR(50),
  browser_name VARCHAR(100),
  browser_version VARCHAR(50),
  ip_address VARCHAR(45) NOT NULL,
  user_agent TEXT NOT NULL,
  location VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMP NOT NULL,
  expires_at TIMESTAMP,
  security_level VARCHAR(20) DEFAULT 'normal',
  metadata JSON,
  user_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(device_id, user_id)
);

-- User table updates
ALTER TABLE users ADD COLUMN max_devices INTEGER DEFAULT 2;
ALTER TABLE users ADD COLUMN device_management_enabled BOOLEAN DEFAULT false;
```

## 🔌 API Endpoints

### Authentication

- `POST /api/auth/sign-in/users` - Original login (backward compatible)
- `POST /api/auth/sign-in/users/v2` - Enhanced login with device info
- `GET /api/auth/device-support` - Check device management support

### Device Management

- `POST /api/devices/register` - Register new device
- `GET /api/devices/my-devices` - Get user devices
- `DELETE /api/devices/:deviceId` - Remove specific device
- `DELETE /api/devices/logout-all` - Logout all devices
- `PUT /api/devices/:deviceId` - Update device info
- `POST /api/devices/:deviceId/refresh` - Refresh device session
- `GET /api/devices/limit` - Get device limit info
- `GET /api/devices/statistics` - Get device statistics
- `PUT /api/devices/:deviceId/security-level` - Set security level
- `POST /api/devices/enable-management` - Enable device management
- `POST /api/devices/disable-management` - Disable device management
- `GET /api/devices/management-status` - Check management status

## 🎯 Usage

### Backend Integration

```typescript
import { UserDeviceModule } from "./modules/user-device/user-device.module";

@Module({
  imports: [UserDeviceModule],
})
export class AppModule {}
```

### Frontend Integration

```typescript
import { useDeviceManagement } from "./modules/user-device/hooks/useDeviceManagement";

const MyComponent = () => {
  const {
    devices,
    loading,
    error,
    loadDevices,
    removeDevice,
    loginWithDevice,
  } = useDeviceManagement();

  // Use device management functionality
};
```

### Service Usage

```typescript
import { DeviceService } from "./modules/user-device/services/device.service";

@Injectable()
export class MyService {
  constructor(
    @Inject("IDeviceService")
    private readonly deviceService: DeviceService,
  ) {}

  async registerUserDevice(userId: number, deviceInfo: DeviceInfoDto) {
    return await this.deviceService.registerDevice(userId, deviceInfo);
  }
}
```

## 🔒 Security

### Device Fingerprinting

- Unique device identification using hardware and software characteristics
- IP address validation and tracking
- User agent analysis and validation
- Geolocation tracking (optional)

### Security Levels

- **Low**: Suspicious activity detected
- **Normal**: Standard device behavior
- **High**: Trusted device (e.g., company device)

### Rate Limiting

- Device registration: 5 per 15 minutes
- Device removal: 10 per 15 minutes
- Device list: 30 per 15 minutes

## 📊 Monitoring

### Metrics

- Device registration rates
- Device usage patterns
- Security incidents
- Cleanup statistics

### Logging

- Device registration events
- Security alerts
- Cleanup operations
- Error tracking

### Alerts

- Suspicious device activity
- Device limit exceeded
- Security violations
- System errors

## 🧹 Maintenance

### Automatic Cleanup

- **Expired Devices**: Removed after 30 days of expiry
- **Inactive Devices**: Removed after 60 days of inactivity
- **Cleanup Schedule**: Every hour for expired, every 6 hours for inactive

### Manual Cleanup

```typescript
import { DeviceCleanupService } from "./modules/user-device/services/device-cleanup.service";

// Manual cleanup
const result = await deviceCleanupService.manualCleanup();
console.log(`Cleaned up ${result.total} devices`);
```

## 🧪 Testing

### Unit Tests

```bash
npm run test -- --testPathPattern=device
```

### Integration Tests

```bash
npm run test:e2e -- --testPathPattern=device
```

### Manual Testing

1. Test device registration
2. Test device limits
3. Test device removal
4. Test security levels
5. Test cleanup operations

## 🚀 Deployment

### Production Checklist

- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Rate limiting configured
- [ ] Monitoring enabled
- [ ] Cleanup jobs scheduled
- [ ] Security settings applied
- [ ] Frontend integration tested

### Rollback Plan

1. Disable device management features
2. Revert to V1 login endpoints
3. Remove device-related database constraints
4. Clean up device tables if needed

## 📈 Performance

### Optimization

- Database indexes on frequently queried fields
- Batch processing for cleanup operations
- Caching for device statistics
- Rate limiting to prevent abuse

### Monitoring

- Database query performance
- API response times
- Memory usage
- Cleanup operation efficiency

## 🔧 Troubleshooting

### Common Issues

1. **Device Limit Exceeded**: Check user's max_devices setting
2. **Invalid Device**: Verify device fingerprinting
3. **Cleanup Failures**: Check database permissions
4. **Rate Limit Exceeded**: Wait for rate limit window to reset

### Debug Mode

```bash
DEVICE_LOG_LEVEL=debug npm run start:dev
```

## 📚 Documentation

- [Frontend Integration Guide](./docs/frontend-integration.md)
- [API Documentation](./docs/api.md)
- [Security Guide](./docs/security.md)
- [Deployment Guide](./docs/deployment.md)

## 🤝 Contributing

1. Follow the existing code style
2. Add tests for new features
3. Update documentation
4. Ensure backward compatibility

## 📄 License

This module is part of the main application and follows the same license terms.
