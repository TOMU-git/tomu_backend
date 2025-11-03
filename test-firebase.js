/**
 * Firebase initialization test script
 * Run: node test-firebase.js
 */

require("dotenv").config();
const admin = require("firebase-admin");

async function testFirebase() {
  try {
    console.log("🔍 Testing Firebase configuration...\n");

    // Check environment variables
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (!projectId) {
      throw new Error("❌ FIREBASE_PROJECT_ID not found in .env");
    }
    if (!clientEmail) {
      throw new Error("❌ FIREBASE_CLIENT_EMAIL not found in .env");
    }
    if (!privateKey) {
      throw new Error("❌ FIREBASE_PRIVATE_KEY not found in .env");
    }

    console.log("✅ Environment variables found:");
    console.log(`   Project ID: ${projectId}`);
    console.log(`   Client Email: ${clientEmail}`);
    console.log(`   Private Key: ${privateKey.substring(0, 30)}...\n`);

    // Initialize Firebase
    console.log("🔧 Initializing Firebase Admin SDK...");
    const serviceAccount = {
      projectId: projectId,
      privateKey: privateKey.replace(/\\n/g, "\n"),
      clientEmail: clientEmail,
    };

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: projectId,
    });

    console.log("✅ Firebase Admin SDK initialized successfully!\n");

    // Test FCM service
    console.log("🧪 Testing FCM service...");
    const messaging = admin.messaging();
    console.log("✅ FCM messaging service is available!\n");

    console.log("🎉 All tests passed! Firebase is ready to use.");

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    console.error("\n📋 Troubleshooting:");
    console.error(
      "1. Check .env file has FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY",
    );
    console.error(
      "2. Check FIREBASE_PRIVATE_KEY format (should have \\n for newlines)",
    );
    console.error(
      "3. Check private key is complete (including BEGIN/END lines)",
    );
    process.exit(1);
  }
}

testFirebase();
