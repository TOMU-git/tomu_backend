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
  token: string;
  smsApiUrl: string;
}

export interface CustomAxiosResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: any;
  config: any;
  request?: any; // Optional property if needed
}
