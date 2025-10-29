const axios = require("axios");

const BASE_URL = "http://localhost:7777/api";

async function testDeviceRegistration() {
  try {
    // 1. User login
    console.log("1️⃣ User login...");
    const loginResponse = await axios.post(`${BASE_URL}/auth/sign-in/users`, {
      phoneNumber: "+998901234569",
      password: "password123",
    });

    const accessToken = loginResponse.data.data.tokens.access_token;
    const userId = loginResponse.data.data.data.id;
    console.log("✅ Login muvaffaqiyatli");
    console.log("   User ID:", userId);
    console.log(
      "   Device Management:",
      loginResponse.data.data.data.deviceManagementEnabled,
    );
    console.log("");

    // 2. To'g'ridan-to'g'ri device registration
    console.log("2️⃣ To'g'ridan-to'g'ri device registration...");
    try {
      const deviceResponse = await axios.post(
        `${BASE_URL}/devices/register`,
        {
          deviceId: "550e8400-e29b-41d4-a716-446655440000",
          deviceName: "Test iPhone",
          deviceType: "mobile",
          osName: "iOS",
          browserName: "Safari",
          ipAddress: "192.168.1.100",
          userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
        },
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );
      console.log("✅ Device registration muvaffaqiyatli");
      console.log("   Device ID:", deviceResponse.data.data.deviceId);
    } catch (error) {
      console.log(
        "❌ Device registration xatoligi:",
        error.response?.data?.message,
      );
    }
    console.log("");

    // 3. Ikkinchi device registration
    console.log("3️⃣ Ikkinchi device registration...");
    try {
      const device2Response = await axios.post(
        `${BASE_URL}/devices/register`,
        {
          deviceId: "550e8400-e29b-41d4-a716-446655440001",
          deviceName: "Test Samsung",
          deviceType: "mobile",
          osName: "Android",
          browserName: "Chrome",
          ipAddress: "192.168.1.101",
          userAgent:
            "Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36",
        },
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );
      console.log("✅ Ikkinchi device registration muvaffaqiyatli");
      console.log("   Device ID:", device2Response.data.data.deviceId);
    } catch (error) {
      console.log(
        "❌ Ikkinchi device registration xatoligi:",
        error.response?.data?.message,
      );
    }
    console.log("");

    // 4. Uchinchi device registration (cheklovdan oshish)
    console.log("4️⃣ Uchinchi device registration (cheklovdan oshish)...");
    try {
      const device3Response = await axios.post(
        `${BASE_URL}/devices/register`,
        {
          deviceId: "550e8400-e29b-41d4-a716-446655440002",
          deviceName: "Test MacBook",
          deviceType: "desktop",
          osName: "macOS",
          browserName: "Safari",
          ipAddress: "192.168.1.102",
          userAgent:
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15",
        },
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );
      console.log(
        "❌ XATOLIK: Uchinchi device registration bo'ldi (bu bo'lmasligi kerak edi!)",
      );
    } catch (error) {
      if (error.response?.status === 403) {
        console.log(
          "✅ TO'G'RI: Cheklovdan oshish xatoligi:",
          error.response.data.message,
        );
      } else {
        console.log("❌ Kutilmagan xatolik:", error.response?.data?.message);
      }
    }
    console.log("");

    // 5. Qurilmalar ro'yxatini ko'rish
    console.log("5️⃣ Qurilmalar ro'yxatini ko'rish...");
    const devicesResponse = await axios.get(`${BASE_URL}/devices/my-devices`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    console.log("📱 Qurilmalar soni:", devicesResponse.data.data.count);
    console.log("📱 Maksimal ruxsat:", devicesResponse.data.data.maxDevices);
    console.log(
      "📱 Device Management:",
      devicesResponse.data.data.deviceManagementEnabled,
    );
  } catch (error) {
    console.error(
      "❌ Xatolik:",
      error.response?.data?.message || error.message,
    );
  }
}

testDeviceRegistration();
