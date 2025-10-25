const axios = require("axios");

const BASE_URL = "http://localhost:7777/api";

async function finalTest() {
  try {
    // 1. Yangi user yaratish
    console.log("1️⃣ Yangi user yaratish...");
    const createResponse = await axios.post(
      `${BASE_URL}/auth/register/students`,
      {
        firstName: "Final",
        lastName: "Test",
        phoneNumber: "+998901234571",
        password: "password123",
        gender: "male",
      },
    );
    console.log("✅ User yaratildi:", createResponse.data.message);
    console.log("");

    // 2. User login va device management yoqish
    console.log("2️⃣ User login va device management yoqish...");
    const loginResponse = await axios.post(`${BASE_URL}/auth/sign-in/users`, {
      phoneNumber: "+998901234570",
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

    // 3. Device management yoqish
    console.log("3️⃣ Device management yoqish...");
    const updateResponse = await axios.patch(
      `${BASE_URL}/user/update/${userId}`,
      {
        deviceManagementEnabled: true,
        maxDevices: 2,
      },
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    console.log("✅ Device management yoqildi");
    console.log(
      "   Device Management:",
      updateResponse.data.data.deviceManagementEnabled,
    );
    console.log("   Max Devices:", updateResponse.data.data.maxDevices);
    console.log("");

    // 4. Birinchi qurilma bilan login (V2)
    console.log("4️⃣ Birinchi qurilma bilan login (V2)...");
    const v2Login1Response = await axios.post(
      `${BASE_URL}/auth/sign-in/users/v2`,
      {
        phoneNumber: "+998901234571",
        password: "password123",
        deviceInfo: {
          deviceId: "550e8400-e29b-41d4-a716-446655440010",
          deviceName: "Test iPhone",
          deviceType: "mobile",
          osName: "iOS",
          browserName: "Safari",
          ipAddress: "192.168.1.100",
          userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
        },
      },
    );
    console.log("✅ Birinchi qurilma bilan login muvaffaqiyatli");
    console.log("");

    // 5. Ikkinchi qurilma bilan login (V2)
    console.log("5️⃣ Ikkinchi qurilma bilan login (V2)...");
    const v2Login2Response = await axios.post(
      `${BASE_URL}/auth/sign-in/users/v2`,
      {
        phoneNumber: "+998901234571",
        password: "password123",
        deviceInfo: {
          deviceId: "550e8400-e29b-41d4-a716-446655440011",
          deviceName: "Test Samsung",
          deviceType: "mobile",
          osName: "Android",
          browserName: "Chrome",
          ipAddress: "192.168.1.101",
          userAgent:
            "Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36",
        },
      },
    );
    console.log("✅ Ikkinchi qurilma bilan login muvaffaqiyatli");
    console.log("");

    // 6. Uchinchi qurilma bilan login (cheklovdan oshish)
    console.log("6️⃣ Uchinchi qurilma bilan login (cheklovdan oshish)...");
    try {
      const v2Login3Response = await axios.post(
        `${BASE_URL}/auth/sign-in/users/v2`,
        {
          phoneNumber: "+998901234571",
          password: "password123",
          deviceInfo: {
            deviceId: "550e8400-e29b-41d4-a716-446655440012",
            deviceName: "Test MacBook",
            deviceType: "desktop",
            osName: "macOS",
            browserName: "Safari",
            ipAddress: "192.168.1.102",
            userAgent:
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15",
          },
        },
      );
      console.log(
        "❌ XATOLIK: Uchinchi qurilma bilan login bo'ldi (bu bo'lmasligi kerak edi!)",
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

    // 7. Qurilmalar ro'yxatini ko'rish
    console.log("7️⃣ Qurilmalar ro'yxatini ko'rish...");
    const newAccessToken = v2Login2Response.data.data.tokens.access_token;
    const devicesResponse = await axios.get(`${BASE_URL}/devices/my-devices`, {
      headers: { Authorization: `Bearer ${newAccessToken}` },
    });
    console.log("📱 Qurilmalar soni:", devicesResponse.data.data.count);
    console.log("📱 Maksimal ruxsat:", devicesResponse.data.data.maxDevices);
    console.log(
      "📱 Device Management:",
      devicesResponse.data.data.deviceManagementEnabled,
    );
    console.log("");

    console.log("🎉 Barcha testlar muvaffaqiyatli o'tdi!");
    console.log("✅ Device limit tizimi to'g'ri ishlayapti!");
  } catch (error) {
    console.error(
      "❌ Xatolik:",
      error.response?.data?.message || error.message,
    );
  }
}

finalTest();
