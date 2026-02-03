# Frontend Integration Guide

## Device Management Integration

This guide explains how to integrate device management into your frontend application.

## 1. Feature Detection

Before implementing device management, check if the backend supports it:

```typescript
const checkDeviceSupport = async (): Promise<boolean> => {
  try {
    const response = await fetch("/api/auth/device-support");
    const data = await response.json();
    return data.supported === true;
  } catch (error) {
    console.warn("Device management not supported:", error);
    return false;
  }
};
```

## 2. Device Information Collection

Collect device information for registration:

```typescript
interface DeviceInfo {
  deviceId: string;
  deviceName: string;
  deviceType: "mobile" | "tablet" | "desktop" | "web";
  osName: string;
  osVersion?: string;
  browserName?: string;
  browserVersion?: string;
  ipAddress: string;
  userAgent: string;
  location?: string;
  metadata?: Record<string, any>;
}

const collectDeviceInfo = (): DeviceInfo => {
  const userAgent = navigator.userAgent;
  const deviceId = generateDeviceId(); // Generate UUID
  const deviceName = getDeviceName(userAgent);
  const deviceType = getDeviceType(userAgent);
  const osName = getOSName(userAgent);
  const osVersion = getOSVersion(userAgent);
  const browserName = getBrowserName(userAgent);
  const browserVersion = getBrowserVersion(userAgent);

  return {
    deviceId,
    deviceName,
    deviceType,
    osName,
    osVersion,
    browserName,
    browserVersion,
    ipAddress: "", // Will be filled by backend
    userAgent,
    location: "", // Optional, can be filled by geolocation
    metadata: {
      screenResolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
      colorDepth: screen.colorDepth,
      platform: navigator.platform,
    },
  };
};

// Helper functions
const generateDeviceId = (): string => {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c == "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const getDeviceName = (userAgent: string): string => {
  // Extract device name from user agent
  if (userAgent.includes("iPhone")) return "iPhone";
  if (userAgent.includes("iPad")) return "iPad";
  if (userAgent.includes("Android")) return "Android Device";
  if (userAgent.includes("Windows")) return "Windows PC";
  if (userAgent.includes("Mac")) return "Mac";
  return "Unknown Device";
};

const getDeviceType = (
  userAgent: string,
): "mobile" | "tablet" | "desktop" | "web" => {
  if (userAgent.includes("Mobile")) return "mobile";
  if (userAgent.includes("iPad") || userAgent.includes("Tablet"))
    return "tablet";
  if (userAgent.includes("Windows") || userAgent.includes("Mac"))
    return "desktop";
  return "web";
};

const getOSName = (userAgent: string): string => {
  if (userAgent.includes("Windows")) return "Windows";
  if (userAgent.includes("Mac")) return "macOS";
  if (userAgent.includes("iPhone") || userAgent.includes("iPad")) return "iOS";
  if (userAgent.includes("Android")) return "Android";
  if (userAgent.includes("Linux")) return "Linux";
  return "Unknown";
};

const getOSVersion = (userAgent: string): string | undefined => {
  // Extract OS version from user agent
  const match = userAgent.match(
    /(?:Windows|Mac|iPhone|iPad|Android).*?(\d+\.?\d*)/,
  );
  return match ? match[1] : undefined;
};

const getBrowserName = (userAgent: string): string | undefined => {
  if (userAgent.includes("Chrome")) return "Chrome";
  if (userAgent.includes("Firefox")) return "Firefox";
  if (userAgent.includes("Safari")) return "Safari";
  if (userAgent.includes("Edge")) return "Edge";
  return undefined;
};

const getBrowserVersion = (userAgent: string): string | undefined => {
  const match = userAgent.match(/(?:Chrome|Firefox|Safari|Edge)\/(\d+\.?\d*)/);
  return match ? match[1] : undefined;
};
```

## 3. Enhanced Login Flow

Update your login function to support device management:

```typescript
const login = async (credentials: LoginCredentials): Promise<LoginResponse> => {
  const deviceSupport = await checkDeviceSupport();

  if (deviceSupport) {
    // Use V2 API with device information
    const deviceInfo = collectDeviceInfo();
    const response = await fetch("/api/auth/sign-in/users/v2", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...credentials,
        deviceInfo,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Login failed");
    }

    return await response.json();
  } else {
    // Fallback to V1 API (backward compatibility)
    const response = await fetch("/api/auth/sign-in/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Login failed");
    }

    return await response.json();
  }
};
```

## 4. Device Management API

Create API functions for device management:

```typescript
class DeviceAPI {
  private baseUrl = "/api/devices";

  async getMyDevices(includeInactive = false): Promise<Device[]> {
    const response = await fetch(
      `${this.baseUrl}/my-devices?includeInactive=${includeInactive}`,
      {
        headers: {
          Authorization: `Bearer ${this.getToken()}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error("Failed to fetch devices");
    }

    const data = await response.json();
    return data.data;
  }

  async removeDevice(deviceId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${deviceId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${this.getToken()}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to remove device");
    }
  }

  async logoutAllDevices(): Promise<{ removedCount: number }> {
    const response = await fetch(`${this.baseUrl}/logout-all`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${this.getToken()}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to logout all devices");
    }

    const data = await response.json();
    return data.data;
  }

  async getDeviceLimit(): Promise<{
    current: number;
    max: number;
    canAdd: boolean;
  }> {
    const response = await fetch(`${this.baseUrl}/limit`, {
      headers: {
        Authorization: `Bearer ${this.getToken()}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch device limit");
    }

    const data = await response.json();
    return data.data;
  }

  async getDeviceStatistics(): Promise<DeviceStatistics> {
    const response = await fetch(`${this.baseUrl}/statistics`, {
      headers: {
        Authorization: `Bearer ${this.getToken()}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch device statistics");
    }

    const data = await response.json();
    return data.data;
  }

  async enableDeviceManagement(): Promise<void> {
    const response = await fetch(`${this.baseUrl}/enable-management`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.getToken()}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to enable device management");
    }
  }

  async disableDeviceManagement(): Promise<void> {
    const response = await fetch(`${this.baseUrl}/disable-management`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.getToken()}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to disable device management");
    }
  }

  private getToken(): string {
    // Get JWT token from storage
    return localStorage.getItem("access_token") || "";
  }
}

const deviceAPI = new DeviceAPI();
```

## 5. Device Management UI Components

### Device List Component

```typescript
interface Device {
  id: number;
  deviceId: string;
  deviceName: string;
  deviceType: string;
  osName: string;
  osVersion?: string;
  browserName?: string;
  browserVersion?: string;
  ipAddress: string;
  location?: string;
  isActive: boolean;
  lastLoginAt: string;
  expiresAt?: string;
  securityLevel: string;
  createdAt: string;
  updatedAt: string;
}

const DeviceList = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    try {
      setLoading(true);
      const deviceList = await deviceAPI.getMyDevices();
      setDevices(deviceList);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveDevice = async (deviceId: string) => {
    if (window.confirm('Are you sure you want to remove this device?')) {
      try {
        await deviceAPI.removeDevice(deviceId);
        await loadDevices(); // Refresh list
      } catch (err) {
        setError(err.message);
      }
    }
  };

  const handleLogoutAll = async () => {
    if (window.confirm('Are you sure you want to logout from all devices?')) {
      try {
        await deviceAPI.logoutAllDevices();
        // Redirect to login page
        window.location.href = '/login';
      } catch (err) {
        setError(err.message);
      }
    }
  };

  if (loading) return <div>Loading devices...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="device-list">
      <h2>My Devices</h2>
      <button onClick={handleLogoutAll} className="logout-all-btn">
        Logout All Devices
      </button>

      {devices.map(device => (
        <div key={device.id} className={`device-item ${device.isActive ? 'active' : 'inactive'}`}>
          <div className="device-info">
            <h3>{device.deviceName}</h3>
            <p>{device.osName} {device.osVersion}</p>
            <p>{device.browserName} {device.browserVersion}</p>
            <p>Last login: {new Date(device.lastLoginAt).toLocaleString()}</p>
            <p>IP: {device.ipAddress}</p>
            {device.location && <p>Location: {device.location}</p>}
          </div>

          <div className="device-actions">
            <span className={`status ${device.isActive ? 'active' : 'inactive'}`}>
              {device.isActive ? 'Active' : 'Inactive'}
            </span>
            <button
              onClick={() => handleRemoveDevice(device.deviceId)}
              className="remove-btn"
            >
              Remove
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
```

## 6. Progressive Enhancement Strategy

1. **Phase 1**: Implement feature detection
2. **Phase 2**: Add device info collection (optional)
3. **Phase 3**: Use V2 login API when available
4. **Phase 4**: Add device management UI
5. **Phase 5**: Enable device limits and validation

## 7. Error Handling

```typescript
const handleDeviceError = (error: any) => {
  if (error.message.includes("Device limit exceeded")) {
    // Show device limit exceeded message
    showNotification(
      "Device limit exceeded. Please remove an existing device.",
      "warning",
    );
  } else if (error.message.includes("Invalid device")) {
    // Show invalid device message
    showNotification("Invalid device. Please log in again.", "error");
  } else {
    // Show generic error
    showNotification("An error occurred. Please try again.", "error");
  }
};
```

## 8. Testing

Test your implementation:

1. **Feature Detection**: Verify device support detection works
2. **Device Collection**: Test device info collection on different devices
3. **Login Flow**: Test both V1 and V2 login APIs
4. **Device Management**: Test device list, removal, and logout all
5. **Error Handling**: Test error scenarios and edge cases

## 9. Migration Strategy

1. **Gradual Rollout**: Enable device management for specific users first
2. **A/B Testing**: Test device management with a subset of users
3. **Feature Flags**: Use feature flags to control device management
4. **Monitoring**: Monitor device management usage and errors
5. **Feedback**: Collect user feedback and iterate

This integration guide provides a complete solution for adding device management to your frontend application while maintaining backward compatibility.
