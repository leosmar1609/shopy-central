import mysql from 'mysql2/promise';
import { getEnv } from './env';

export const db = mysql.createPool({
  host: getEnv('DB_HOST', 'localhost') ?? 'localhost',
  user: getEnv('DB_USER', 'root') ?? 'root',
  password: getEnv('DB_PASSWORD', '') ?? '',
  database: getEnv('DB_NAME', '') ?? '',
  port: Number(getEnv('DB_PORT', '3306') ?? 3306),
  waitForConnections: true,
  connectionLimit: 10,
});
