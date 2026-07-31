import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";

/**
 * Connects to the SAME MySQL database the PHP site uses (staging copy
 * during the build, production at cutover). Pool sizing stays modest
 * because the legacy app shares the server.
 */
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  connectionLimit: 10,
  timezone: "-05:00",
  /**
   * A page render must fail fast rather than hang. Without a connect
   * timeout, a database that is unreachable, as it is from inside the
   * Docker build, leaves every query waiting on the operating system's
   * TCP timeout, which is far longer than the 60 seconds a render is
   * given. That is what failed the deploy.
   */
  connectTimeout: 8000,
});

export const db = drizzle(pool, { schema, mode: "default" });
