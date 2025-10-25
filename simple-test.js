const axios = require("axios");

const BASE_URL = "http://localhost:7777/api";

async function simpleTest() {
  try {
    // 1. Device support tekshirish
    console.log("1️⃣ Device support tekshirish...");
    const supportResponse = await axios.get(`${BASE_URL}/auth/device-support`);
    console.log("✅ Support:", supportResponse.data.supported);
    console.log("");

    // 2. V1 login (eski usul)
    console.log("2️⃣ V1 login (eski usul)...");
    try {
      const v1LoginResponse = await axios.post(
        `${BASE_URL}/auth/sign-in/users`,
        {
          phoneNumber: "+998901234567",
          password: "123456",
        },
      );
      console.log("✅ V1 login muvaffaqiyatli");
      console.log("   User ID:", v1LoginResponse.data.data.data.id);
      console.log(
        "   Device Management:",
        v1LoginResponse.data.data.data.deviceManagementEnabled,
      );
    } catch (error) {
      console.log("❌ V1 login xatoligi:", error.response?.data?.message);
    }
    console.log("");

    // 3. V2 login (yangi usul - device info bilan)
    console.log("3️⃣ V2 login (yangi usul)...");
    try {
      const v2LoginResponse = await axios.post(
        `${BASE_URL}/auth/sign-in/users/v2`,
        {
          phoneNumber: "+998901234567",
          password: "123456",
          deviceInfo: {
            deviceId: "test-device-1",
            deviceName: "Test iPhone",
            deviceType: "mobile",
            osName: "iOS",
            browserName: "Safari",
            ipAddress: "192.168.1.100",
            userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
          },
        },
      );
      console.log("✅ V2 login muvaffaqiyatli");
      console.log("   User ID:", v2LoginResponse.data.data.data.id);
      console.log(
        "   Device Management:",
        v2LoginResponse.data.data.data.deviceManagementEnabled,
      );
    } catch (error) {
      console.log("❌ V2 login xatoligi:", error.response?.data?.message);
    }
  } catch (error) {
    console.error("❌ Umumiy xatolik:", error.message);
  }
}

simpleTest();
