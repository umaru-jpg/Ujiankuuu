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

const schema = `
CREATE TABLE IF NOT EXISTS exam_schedule_questions (
  exam_schedule_id BIGINT UNSIGNED NOT NULL,
  question_id BIGINT UNSIGNED NOT NULL,
  sort_order INT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (exam_schedule_id, question_id),
  KEY exam_schedule_questions_question_id_index (question_id),
  CONSTRAINT exam_schedule_questions_schedule_id_fk
    FOREIGN KEY (exam_schedule_id) REFERENCES exam_schedules (id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT exam_schedule_questions_question_id_fk
    FOREIGN KEY (question_id) REFERENCES questions (id)
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
    await connection.query(`USE ${escapeIdentifier(database)}`);
    await connection.query(schema);
    console.log("Migration 005_jadwal_questions_schema selesai.");
  } finally {
    await connection.end();
  }
}

migrate().catch((error) => {
  console.error("Migration gagal:");
  console.error(error.message || error);
  process.exit(1);
});
