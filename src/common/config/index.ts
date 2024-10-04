import { IConfig } from '../interfaces/interface';
import * as dotenv from 'dotenv';
dotenv.config();

export const config: IConfig = {
  port: Number(process.env.PORT) || 3000,
  database: process.env.DATABASE,
  database_user: process.env.DATABASE_USER,
  database_password: process.env.DATABASE_PASSWORD,
  database_host: process.env.DATABASE_HOST,
  database_port: Number(process.env.DATABASE_PORT) || 5432,
  jwtSecretKey: process.env.JWT_SECRET_KEY,
  jwtExpiredIn: process.env.JWT_EXPIRED_IN,
  databaseUrl: process.env.DB_URL,
};
