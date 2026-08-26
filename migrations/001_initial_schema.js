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
CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(150) NOT NULL,
  username VARCHAR(80) NOT NULL,
  email VARCHAR(150) NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'guru', 'siswa') NOT NULL,
  title VARCHAR(120) NULL,
  department VARCHAR(120) NULL,
  avatar_initial VARCHAR(8) NULL,
  avatar_color VARCHAR(80) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY users_username_unique (username),
  UNIQUE KEY users_email_unique (email),
  KEY users_role_index (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS classes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(40) NOT NULL,
  level ENUM('X', 'XI', 'XII') NOT NULL,
  major VARCHAR(40) NOT NULL,
  homeroom_teacher VARCHAR(150) NOT NULL,
  student_count INT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY classes_name_unique (name),
  KEY classes_level_index (level),
  KEY classes_major_index (major)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS questions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  subject VARCHAR(100) NOT NULL,
  class_name VARCHAR(40) NOT NULL,
  status ENUM('published', 'draft') NOT NULL DEFAULT 'draft',
  question_type ENUM('multiple_choice', 'essay') NOT NULL,
  prompt TEXT NOT NULL,
  author_id BIGINT UNSIGNED NOT NULL,
  author_name VARCHAR(150) NOT NULL,
  color VARCHAR(80) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY questions_subject_index (subject),
  KEY questions_class_name_index (class_name),
  KEY questions_status_index (status),
  KEY questions_author_id_index (author_id),
  CONSTRAINT questions_author_id_fk
    FOREIGN KEY (author_id) REFERENCES users (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO users (
  id,
  name,
  username,
  email,
  password_hash,
  role,
  title,
  avatar_initial,
  avatar_color
) VALUES
  (
    1,
    'Admin',
    'admin',
    'admin@smkjp1.sch.id',
    '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9',
    'admin',
    'Administrator Sistem',
    'A',
    'from-blue-600 to-indigo-500'
  ),
  (
    2,
    'Bpk. Budi Santoso',
    'guru',
    'guru@smkjp1.sch.id',
    'ae81343369944399b70de862dbe75536faa8e44c50ad0a312e380303173f4756',
    'guru',
    'Guru Mapel RPL',
    'B',
    'from-emerald-600 to-teal-500'
  ),
  (
    3,
    'Ahmad Fauzi',
    'siswa',
    'siswa@smkjp1.sch.id',
    'ca82d8a67832679fdc39c9156f087e31236b833ee7371eb3d6e081aeb90016c9',
    'siswa',
    'X RPL 1',
    'A',
    'from-violet-600 to-purple-500'
  )
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  email = VALUES(email),
  password_hash = VALUES(password_hash),
  role = VALUES(role),
  title = VALUES(title),
  avatar_initial = VALUES(avatar_initial),
  avatar_color = VALUES(avatar_color);
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
    console.log("Migration 001_initial_schema selesai.");
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
