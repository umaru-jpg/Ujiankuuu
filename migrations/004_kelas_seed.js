const fs = require("fs");
const path = require("path");

function loadEnvFile(fileName) {
  const filePath = path.join(process.cwd(), fileName);
  if (!fs.existsSync(filePath)) return;

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    const value = trimmed
      .slice(separator + 1)
      .trim()
      .replace(/^["']|["']$/g, "");

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function getDatabaseConfig() {
  loadEnvFile(".env.local");
  loadEnvFile(".env");

  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl) {
    const url = new URL(databaseUrl);
    return {
      host: url.hostname,
      port: Number(url.port || 3306),
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: url.pathname.replace(/^\//, ""),
      multipleStatements: true,
    };
  }

  return {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "ujiankuuu",
    multipleStatements: true,
  };
}

function escapeIdentifier(identifier) {
  return `\`${identifier.replace(/`/g, "``")}\``;
}

const seedData = `
INSERT INTO classes (name, level, major, homeroom_teacher, student_count) VALUES
  ('X-A',   'X',   'RPL', 'Bpk. Budi Santoso',     32),
  ('X-B',   'X',   'TKJ', 'Ibu Sari Wulandari',    30),
  ('XI-A',  'XI',  'RPL', 'Bpk. Hendra Gunawan',   28),
  ('XI-B',  'XI',  'TKJ', 'Ibu Dewi Lestari',      31),
  ('XII-A', 'XII', 'MM',  'Bpk. Ahmad Subarjo',    29),
  ('XII-B', 'XII', 'AK',  'Ibu Ratna Sari',        27)
ON DUPLICATE KEY UPDATE
  name = VALUES(name);
`;

async function migrate() {
  let mysql;

  try {
    mysql = require("mysql2/promise");
  } catch {
    console.error("Dependency mysql2 belum terinstall. Jalankan: npm install");
    process.exit(1);
  }

  const config = getDatabaseConfig();
  const { database, ...serverConfig } = config;

  if (!database) {
    throw new Error("Nama database belum diatur. Isi DATABASE_URL atau DB_NAME.");
  }

  const connection = await mysql.createConnection(serverConfig);

  try {
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS ${escapeIdentifier(database)}
        CHARACTER SET utf8mb4
        COLLATE utf8mb4_unicode_ci`
    );
    await connection.query(`USE ${escapeIdentifier(database)}`);
    await connection.query(seedData);
    console.log("Migration 004_kelas_seed selesai.");
  } finally {
    await connection.end();
  }
}

migrate().catch((error) => {
  console.error("Migration gagal:");
  console.error(error.message || error);

  if (error.code === "ER_ACCESS_DENIED_ERROR") {
    console.error("Cek DB_USER dan DB_PASSWORD di .env.local.");
  }

  if (error.code === "ECONNREFUSED") {
    console.error("MySQL belum berjalan atau DB_PORT/DB_HOST salah.");
  }

  process.exit(1);
});
