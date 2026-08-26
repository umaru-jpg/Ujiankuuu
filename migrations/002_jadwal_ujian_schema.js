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
      .replace(/^[\"']|[\"']$/g, "");

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

const schema = `
CREATE TABLE IF NOT EXISTS exam_schedules (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  title VARCHAR(200) NOT NULL,
  subject VARCHAR(100) NOT NULL,
  exam_type ENUM('PTS', 'PAS', 'UH', 'UTS', 'UAS', 'other') NOT NULL DEFAULT 'PTS',
  exam_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  room VARCHAR(100) NOT NULL,
  class_names TEXT NOT NULL COMMENT 'JSON array of class names, e.g. ["XII RPL 1","XII RPL 2"]',
  supervisors TEXT NOT NULL COMMENT 'JSON array of supervisor names, e.g. ["Budi Santoso","Siti Aminah"]',
  status ENUM('scheduled', 'ongoing', 'completed', 'cancelled') NOT NULL DEFAULT 'scheduled',
  notes TEXT NULL,
  created_by BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY exam_schedules_exam_date_index (exam_date),
  KEY exam_schedules_subject_index (subject),
  KEY exam_schedules_status_index (status),
  KEY exam_schedules_created_by_index (created_by),
  CONSTRAINT exam_schedules_created_by_fk
    FOREIGN KEY (created_by) REFERENCES users (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
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
    await connection.query(schema);
    console.log("Migration 002_jadwal_ujian_schema selesai.");
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
