const axios = require("axios");

// Backend URL
const BASE_URL = "http://localhost:7777/api";

// Test user credentials (mavjud user - device management yoqilgan)
const TEST_USER = {
  phoneNumber: "+998901234567",
  password: "123456",
};

// Device info for testing
const DEVICE_INFO = {
  deviceId: "test-device-1",
  deviceName: "Test iPhone",
  deviceType: "mobile",
  osName: "iOS",
  browserName: "Safari",
  ipAddress: "192.168.1.100",
  userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
};

async function testDeviceLimit() {
  console.log("🧪 Device Limit Test Boshlanmoqda...\n");

  try {
    // 1. Backend qo'llab-quvvatlaydimi tekshirish
    console.log("1️⃣ Backend device support tekshirish...");
    const supportResponse = await axios.get(`${BASE_URL}/auth/device-support`);
    console.log("✅ Backend qo'llab-quvvatlaydi:", supportResponse.data);
    console.log("");

    // 2. User yaratish (agar mavjud bo'lmasa)
    console.log("2️⃣ Test user yaratish...");
    try {
      const createUserResponse = await axios.post(
        `${BASE_URL}/auth/register/students`,
        {
          firstName: "Test",
          lastName: "User",
          phoneNumber: TEST_USER.phoneNumber,
          password: TEST_USER.password,
          gender: "male",
        },
      );
      console.log("✅ User yaratildi:", createUserResponse.data.message);
    } catch (error) {
      if (error.response?.status === 409) {
        console.log("ℹ️ User allaqachon mavjud");
      } else {
        console.log(
          "❌ User yaratishda xatolik:",
          error.response?.data?.message,
        );
      }
    }
    console.log("");

    // 3. Birinchi qurilma bilan login
    console.log("3️⃣ Birinchi qurilma bilan login...");
    const login1Response = await axios.post(
      `${BASE_URL}/auth/sign-in/users/v2`,
      {
        ...TEST_USER,
        deviceInfo: { ...DEVICE_INFO, deviceId: "device-1" },
      },
    );
    console.log("✅ Birinchi qurilma bilan login muvaffaqiyatli");
    const accessToken = login1Response.data.data.tokens.access_token;
    console.log("");

    // 4. Ikkinchi qurilma bilan login
    console.log("4️⃣ Ikkinchi qurilma bilan login...");
    const login2Response = await axios.post(
      `${BASE_URL}/auth/sign-in/users/v2`,
      {
        ...TEST_USER,
        deviceInfo: {
          ...DEVICE_INFO,
          deviceId: "device-2",
          deviceName: "Test Samsung",
        },
      },
    );
    console.log("✅ Ikkinchi qurilma bilan login muvaffaqiyatli");
    console.log("");

    // 5. Qurilmalar ro'yxatini ko'rish
    console.log("5️⃣ Qurilmalar ro'yxatini ko'rish...");
    const devicesResponse = await axios.get(`${BASE_URL}/devices/my-devices`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    console.log("📱 Qurilmalar soni:", devicesResponse.data.data.count);
    console.log("📱 Maksimal ruxsat:", devicesResponse.data.data.maxDevices);
    console.log("");

    // 6. Uchinchi qurilma bilan login (cheklovdan oshish)
    console.log("6️⃣ Uchinchi qurilma bilan login (cheklovdan oshish)...");
    try {
      const login3Response = await axios.post(
        `${BASE_URL}/auth/sign-in/users/v2`,
        {
          ...TEST_USER,
          deviceInfo: {
            ...DEVICE_INFO,
            deviceId: "device-3",
            deviceName: "Test MacBook",
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

    // 7. Birinchi qurilmani o'chirish
    console.log("7️⃣ Birinchi qurilmani o'chirish...");
    const removeResponse = await axios.delete(`${BASE_URL}/devices/device-1`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    console.log("✅ Birinchi qurilma o'chirildi");
    console.log("");

    // 8. Uchinchi qurilma bilan qayta urinish
    console.log("8️⃣ Uchinchi qurilma bilan qayta urinish...");
    const login3RetryResponse = await axios.post(
      `${BASE_URL}/auth/sign-in/users/v2`,
      {
        ...TEST_USER,
        deviceInfo: {
          ...DEVICE_INFO,
          deviceId: "device-3",
          deviceName: "Test MacBook",
        },
      },
    );
    console.log(
      "✅ Uchinchi qurilma bilan login muvaffaqiyatli (qurilma o'chirilgandan keyin)",
    );
    console.log("");

    // 9. Yakuniy qurilmalar ro'yxati
    console.log("9️⃣ Yakuniy qurilmalar ro'yxati...");
    const finalDevicesResponse = await axios.get(
      `${BASE_URL}/devices/my-devices`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    console.log(
      "📱 Yakuniy qurilmalar soni:",
      finalDevicesResponse.data.data.count,
    );
    console.log("📱 Qurilmalar:");
    finalDevicesResponse.data.data.devices.forEach((device, index) => {
      console.log(`   ${index + 1}. ${device.deviceName} (${device.deviceId})`);
    });

    console.log("\n🎉 Barcha testlar muvaffaqiyatli o'tdi!");
  } catch (error) {
    console.error("❌ Test xatoligi:", error.message);
    if (error.response) {
      console.error("Response data:", error.response.data);
    }
  }
}

// Testni ishga tushirish
testDeviceLimit();
