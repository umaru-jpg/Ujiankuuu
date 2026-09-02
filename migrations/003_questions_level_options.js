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
      .replace(/^["]|["]$/g, "");

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

// ── Schema Changes ─────────────────────────────────────────────────────
// 1. Add `level` ENUM column to `questions` table
// 2. Backfill `level` from existing `class_name` values
// 3. Create `question_options` table for multiple choice answers

const schema = `
-- Add level column to questions table
ALTER TABLE questions
  ADD COLUMN level ENUM('X', 'XI', 'XII') NULL AFTER class_name;

-- Backfill level from existing class_name values
-- Maps: "Kelas 10" -> X, "Kelas 11" -> XI, "Kelas 12" -> XII
UPDATE questions SET level = 'X'   WHERE class_name = 'Kelas 10';
UPDATE questions SET level = 'XI'  WHERE class_name = 'Kelas 11';
UPDATE questions SET level = 'XII' WHERE class_name = 'Kelas 12';

-- Make level NOT NULL with a default
ALTER TABLE questions
  MODIFY COLUMN level ENUM('X', 'XI', 'XII') NOT NULL DEFAULT 'X';

-- Add index for level filtering
ALTER TABLE questions
  ADD KEY questions_level_index (level);

-- Create question_options table for multiple choice answers
CREATE TABLE IF NOT EXISTS question_options (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  question_id BIGINT UNSIGNED NOT NULL,
  option_text TEXT NOT NULL,
  is_correct TINYINT(1) NOT NULL DEFAULT 0,
  sort_order TINYINT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY question_options_question_id_index (question_id),
  KEY question_options_is_correct_index (is_correct),
  CONSTRAINT question_options_question_id_fk
    FOREIGN KEY (question_id) REFERENCES questions (id)
    ON UPDATE CASCADE
    ON DELETE CASCADE
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
    await connection.query(`USE ${escapeIdentifier(database)}`);
    await connection.query(schema);
    console.log("Migration 003_questions_level_options selesai.");
  } finally {
    await connection.end();
  }
}

migrate().catch((error) => {
  console.error("Migration gagal:");
  console.error(error.message || error);

  if (error.code === "ER_DUP_FIELDNAME") {
    console.error("Kolom 'level' sudah ada di tabel questions. Migration sudah dijalankan sebelumnya.");
  }

  if (error.code === "ER_ACCESS_DENIED_ERROR") {
    console.error("Cek DB_USER dan DB_PASSWORD di .env.local.");
  }

  if (error.code === "ECONNREFUSED") {
    console.error("MySQL belum berjalan atau DB_PORT/DB_HOST salah.");
  }

  process.exit(1);
});
