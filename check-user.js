const axios = require("axios");

const BASE_URL = "http://localhost:7777/api";

async function checkUser() {
  try {
    // Test user login
    console.log("🔐 Test user login...");
    const userLoginResponse = await axios.post(
      `${BASE_URL}/auth/sign-in/users`,
      {
        phoneNumber: "+998901234568",
        password: "password123",
      },
    );

    console.log("✅ Test user login muvaffaqiyatli");
    console.log("👤 User ma'lumotlari:");
    console.log("   ID:", userLoginResponse.data.data.data.id);
    console.log("   Phone:", userLoginResponse.data.data.data.phoneNumber);
    console.log(
      "   Device Management:",
      userLoginResponse.data.data.data.deviceManagementEnabled,
    );
    console.log("   Max Devices:", userLoginResponse.data.data.data.maxDevices);
  } catch (error) {
    console.error(
      "❌ Xatolik:",
      error.response?.data?.message || error.message,
    );
  }
}

checkUser();
