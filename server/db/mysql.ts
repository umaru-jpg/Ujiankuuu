import mysql from "mysql2/promise";
import { getRequiredEnv } from "@/server/config/env";

declare global {
  // eslint-disable-next-line no-var
  var mysqlPool: mysql.Pool | undefined;
}

export function getMysqlPool() {
  if (!global.mysqlPool) {
    global.mysqlPool = mysql.createPool(getRequiredEnv("DATABASE_URL"));
  }

  return global.mysqlPool;
}
