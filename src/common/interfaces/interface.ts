export interface IConfig {
  port: number;
  database: string;
  database_user: string;
  database_password: string;
  database_host: string;
  database_port: number;
  jwtSecretKey: string;
  jwtExpiredIn: string;
  jwtCookieTime: number;
  jwtRefreshKey: string;
  jwtRefreshExpiresIn: string;
  databaseUrl: string;
  paymeMerchantKey: string;
  paymeMerchantId: string;
  paymeTestKey: string;
  token: string;
  smsApiUrl: string;
  openaiApiKey: string;
  whisperModel: string;
  ttsModel: string;
  gptModel: string;
  translateApiKey: string;
  chromaHost: string;
  chromaPort: number;
  chromaUrl: string;
  chromaCollection: string;
  useRag: string;
  useRagStrict: string;
  ragTopK: number;
  embedModel: string;
  strictNoEcho: number;
  detSim: number;
  echoOverlap: number;
  maxTokens: number;
  temperature: number;
  responseClamp: number;
  analyzeUser: number;
  allowedVocabPath: string;
  embedBatch: number;
  debugLog: number;
  retrieveMaxLesson: number;
  // Logger configuration
  logLevel: string;
  isDevelopment: boolean;
  // Firebase configuration
  firebaseProjectId: string;
  firebasePrivateKey: string;
  firebaseClientEmail: string;
  // Firebase App IDs (for frontend)
  firebaseWebAppId?: string;
  firebaseAndroidAppId?: string;
  firebaseIosAppId?: string;
  firebaseMacosAppId?: string;
  firebaseWindowsAppId?: string;
  // Test OTP configuration for app store review
  testPhone?: string;
  testOtp?: string;
}

export interface CustomAxiosResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: any;
  config: any;
  request?: any; // Optional property if needed
}
