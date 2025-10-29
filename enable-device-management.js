const axios = require("axios");

const BASE_URL = "http://localhost:7777/api";

async function enableDeviceManagement() {
  try {
    // 1. Test user login
    console.log("🔐 Test user login...");
    const userLoginResponse = await axios.post(
      `${BASE_URL}/auth/sign-in/users`,
      {
        phoneNumber: "+998901234568",
        password: "password123",
      },
    );

    const userToken = userLoginResponse.data.data.tokens.access_token;
    console.log("✅ Test user login muvaffaqiyatli");

    // 2. Device management yoqish
    console.log("🔧 Device management yoqish...");
    const updateResponse = await axios.put(
      `${BASE_URL}/users/enable-device-management`,
      {
        deviceManagementEnabled: true,
        maxDevices: 2,
      },
      {
        headers: { Authorization: `Bearer ${userToken}` },
      },
    );

    console.log("✅ Device management yoqildi:", updateResponse.data.message);
  } catch (error) {
    console.error(
      "❌ Xatolik:",
      error.response?.data?.message || error.message,
    );
  }
}

enableDeviceManagement();
