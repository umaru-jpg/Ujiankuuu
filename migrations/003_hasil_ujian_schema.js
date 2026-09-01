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
CREATE TABLE IF NOT EXISTS exam_results (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  exam_schedule_id BIGINT UNSIGNED NOT NULL,
  student_id BIGINT UNSIGNED NOT NULL,
  score INT UNSIGNED NOT NULL DEFAULT 0,
  correct_answers INT UNSIGNED NOT NULL DEFAULT 0,
  wrong_answers INT UNSIGNED NOT NULL DEFAULT 0,
  duration_seconds INT UNSIGNED NOT NULL DEFAULT 0,
  topic_performance TEXT NULL COMMENT 'JSON array of {label, pct} for per-topic breakdown',
  answers TEXT NULL COMMENT 'JSON array of student answers',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY exam_results_unique_per_student (exam_schedule_id, student_id),
  KEY exam_results_student_id_index (student_id),
  KEY exam_results_score_index (score),
  CONSTRAINT exam_results_exam_schedule_id_fk
    FOREIGN KEY (exam_schedule_id) REFERENCES exam_schedules (id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT exam_results_student_id_fk
    FOREIGN KEY (student_id) REFERENCES users (id)
    ON UPDATE CASCADE
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

const seedData = `
-- Seed: create demo student users (referenced by exam_results)
INSERT INTO users (id, name, username, email, password_hash, role, title, avatar_initial, avatar_color) VALUES
  (4, 'Bunga Lestari', '2026002', 'bunga@smkjp1.sch.id', 'ca82d8a67832679fdc39c9156f087e31236b833ee7371eb3d6e081aeb90016c9', 'siswa', 'X-A', 'B', 'from-violet-600 to-purple-500'),
  (5, 'Citra Dewi', '2026003', 'citra@smkjp1.sch.id', 'ca82d8a67832679fdc39c9156f087e31236b833ee7371eb3d6e081aeb90016c9', 'siswa', 'X-A', 'C', 'from-violet-600 to-purple-500'),
  (6, 'Dimas Prasetyo', '2026004', 'dimas@smkjp1.sch.id', 'ca82d8a67832679fdc39c9156f087e31236b833ee7371eb3d6e081aeb90016c9', 'siswa', 'X-A', 'D', 'from-violet-600 to-purple-500'),
  (7, 'Eka Saputri', '2026005', 'eka@smkjp1.sch.id', 'ca82d8a67832679fdc39c9156f087e31236b833ee7371eb3d6e081aeb90016c9', 'siswa', 'X-A', 'E', 'from-violet-600 to-purple-500'),
  (8, 'Fajar Ramadhan', '2026006', 'fajar@smkjp1.sch.id', 'ca82d8a67832679fdc39c9156f087e31236b833ee7371eb3d6e081aeb90016c9', 'siswa', 'X-A', 'F', 'from-violet-600 to-purple-500'),
  (9, 'Gita Permatasari', '2026007', 'gita@smkjp1.sch.id', 'ca82d8a67832679fdc39c9156f087e31236b833ee7371eb3d6e081aeb90016c9', 'siswa', 'X-A', 'G', 'from-violet-600 to-purple-500'),
  (10, 'Hendra Wijaya', '2026008', 'hendra@smkjp1.sch.id', 'ca82d8a67832679fdc39c9156f087e31236b833ee7371eb3d6e081aeb90016c9', 'siswa', 'X-A', 'H', 'from-violet-600 to-purple-500'),
  (11, 'Intan Ayu', '2026009', 'intan@smkjp1.sch.id', 'ca82d8a67832679fdc39c9156f087e31236b833ee7371eb3d6e081aeb90016c9', 'siswa', 'X-A', 'I', 'from-violet-600 to-purple-500'),
  (12, 'Joko Susilo', '2026010', 'joko@smkjp1.sch.id', 'ca82d8a67832679fdc39c9156f087e31236b833ee7371eb3d6e081aeb90016c9', 'siswa', 'X-A', 'J', 'from-violet-600 to-purple-500'),
  (13, 'Kevin Hartono', '2024001', 'kevin@smkjp1.sch.id', 'ca82d8a67832679fdc39c9156f087e31236b833ee7371eb3d6e081aeb90016c9', 'siswa', 'XI-B', 'K', 'from-violet-600 to-purple-500'),
  (14, 'Laras Melati', '2024002', 'laras@smkjp1.sch.id', 'ca82d8a67832679fdc39c9156f087e31236b833ee7371eb3d6e081aeb90016c9', 'siswa', 'XI-B', 'L', 'from-violet-600 to-purple-500'),
  (15, 'Maya Anggraini', '2024003', 'maya@smkjp1.sch.id', 'ca82d8a67832679fdc39c9156f087e31236b833ee7371eb3d6e081aeb90016c9', 'siswa', 'XI-B', 'M', 'from-violet-600 to-purple-500'),
  (16, 'Naufal Hakim', '2024004', 'naufal@smkjp1.sch.id', 'ca82d8a67832679fdc39c9156f087e31236b833ee7371eb3d6e081aeb90016c9', 'siswa', 'XI-B', 'N', 'from-violet-600 to-purple-500'),
  (17, 'Olivia Chandra', '2024005', 'olivia@smkjp1.sch.id', 'ca82d8a67832679fdc39c9156f087e31236b833ee7371eb3d6e081aeb90016c9', 'siswa', 'XI-B', 'O', 'from-violet-600 to-purple-500'),
  (18, 'Putra Wijaya', '2024006', 'putra@smkjp1.sch.id', 'ca82d8a67832679fdc39c9156f087e31236b833ee7371eb3d6e081aeb90016c9', 'siswa', 'XI-B', 'P', 'from-violet-600 to-purple-500'),
  (19, 'Ratna Sari', '2024007', 'ratna@smkjp1.sch.id', 'ca82d8a67832679fdc39c9156f087e31236b833ee7371eb3d6e081aeb90016c9', 'siswa', 'XI-B', 'R', 'from-violet-600 to-purple-500'),
  (20, 'Surya Pratama', '2024008', 'surya@smkjp1.sch.id', 'ca82d8a67832679fdc39c9156f087e31236b833ee7371eb3d6e081aeb90016c9', 'siswa', 'XI-B', 'S', 'from-violet-600 to-purple-500')
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  title = VALUES(title);

-- Seed: create exam_schedules first (referenced by exam_results)
INSERT INTO exam_schedules (id, title, subject, exam_type, exam_date, start_time, end_time, room, class_names, supervisors, status, notes, created_by)
VALUES
  (1, 'UTS Matematika Dasar', 'Matematika', 'UTS', '2026-10-15', '08:00:00', '10:00:00', 'Ruang 1', '["X-A"]', '["Bpk. Budi Santoso"]', 'completed', NULL, 2),
  (2, 'UAS Fisika Terapan', 'Fisika', 'UAS', '2026-10-16', '08:00:00', '10:00:00', 'Ruang 2', '["XI-B"]', '["Bpk. Budi Santoso"]', 'completed', NULL, 2)
ON DUPLICATE KEY UPDATE
  title = VALUES(title),
  subject = VALUES(subject),
  status = VALUES(status);

-- Seed: exam results for Matematika - X-A (exam_schedule_id = 1)
INSERT INTO exam_results (exam_schedule_id, student_id, score, correct_answers, wrong_answers, duration_seconds, topic_performance)
VALUES
  (1, 3, 92, 46, 4, 2430, '[{"label":"Aljabar","pct":95},{"label":"Geometri","pct":90},{"label":"Logika","pct":100},{"label":"Statistik","pct":80}]'),
  (1, 4, 88, 44, 6, 2580, '[{"label":"Aljabar","pct":90},{"label":"Geometri","pct":85},{"label":"Logika","pct":95},{"label":"Statistik","pct":80}]'),
  (1, 5, 76, 38, 12, 2940, '[{"label":"Aljabar","pct":80},{"label":"Geometri","pct":70},{"label":"Logika","pct":85},{"label":"Statistik","pct":60}]'),
  (1, 6, 95, 47, 3, 2280, '[{"label":"Aljabar","pct":100},{"label":"Geometri","pct":95},{"label":"Logika","pct":95},{"label":"Statistik","pct":85}]'),
  (1, 7, 61, 30, 20, 3300, '[{"label":"Aljabar","pct":65},{"label":"Geometri","pct":55},{"label":"Logika","pct":70},{"label":"Statistik","pct":50}]'),
  (1, 8, 80, 40, 10, 2700, '[{"label":"Aljabar","pct":85},{"label":"Geometri","pct":75},{"label":"Logika","pct":85},{"label":"Statistik","pct":70}]'),
  (1, 9, 72, 36, 14, 3060, '[{"label":"Aljabar","pct":75},{"label":"Geometri","pct":65},{"label":"Logika","pct":80},{"label":"Statistik","pct":60}]'),
  (1, 10, 54, 27, 23, 3420, '[{"label":"Aljabar","pct":55},{"label":"Geometri","pct":50},{"label":"Logika","pct":65},{"label":"Statistik","pct":45}]'),
  (1, 11, 89, 44, 6, 2520, '[{"label":"Aljabar","pct":90},{"label":"Geometri","pct":85},{"label":"Logika","pct":95},{"label":"Statistik","pct":85}]'),
  (1, 12, 66, 33, 17, 3180, '[{"label":"Aljabar","pct":70},{"label":"Geometri","pct":60},{"label":"Logika","pct":75},{"label":"Statistik","pct":55}]')
ON DUPLICATE KEY UPDATE
  score = VALUES(score),
  correct_answers = VALUES(correct_answers);

-- Seed: exam results for Fisika - XI-B (exam_schedule_id = 2)
INSERT INTO exam_results (exam_schedule_id, student_id, score, correct_answers, wrong_answers, duration_seconds, topic_performance)
VALUES
  (2, 13, 84, 42, 8, 2640, '[{"label":"Mekanika","pct":85},{"label":"Termodinamika","pct":80},{"label":"Listrik","pct":90},{"label":"Gelombang","pct":80}]'),
  (2, 14, 91, 45, 5, 2400, '[{"label":"Mekanika","pct":95},{"label":"Termodinamika","pct":85},{"label":"Listrik","pct":95},{"label":"Gelombang","pct":90}]'),
  (2, 15, 58, 29, 21, 3480, '[{"label":"Mekanika","pct":60},{"label":"Termodinamika","pct":50},{"label":"Listrik","pct":65},{"label":"Gelombang","pct":55}]'),
  (2, 16, 77, 38, 12, 2880, '[{"label":"Mekanika","pct":80},{"label":"Termodinamika","pct":70},{"label":"Listrik","pct":85},{"label":"Gelombang","pct":70}]'),
  (2, 17, 95, 47, 3, 2220, '[{"label":"Mekanika","pct":100},{"label":"Termodinamika","pct":90},{"label":"Listrik","pct":100},{"label":"Gelombang","pct":90}]'),
  (2, 18, 69, 34, 16, 3120, '[{"label":"Mekanika","pct":70},{"label":"Termodinamika","pct":65},{"label":"Listrik","pct":75},{"label":"Gelombang","pct":65}]'),
  (2, 19, 82, 41, 9, 2700, '[{"label":"Mekanika","pct":85},{"label":"Termodinamika","pct":75},{"label":"Listrik","pct":90},{"label":"Gelombang","pct":80}]'),
  (2, 20, 47, 23, 27, 3600, '[{"label":"Mekanika","pct":50},{"label":"Termodinamika","pct":40},{"label":"Listrik","pct":55},{"label":"Gelombang","pct":40}]')
ON DUPLICATE KEY UPDATE
  score = VALUES(score),
  correct_answers = VALUES(correct_answers);
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

    // Try seeding (ignore errors if IDs already exist)
    try {
      await connection.query(seedData);
      console.log("Seed data 003_hasil_ujian inserted.");
    } catch (e) {
      if (e.code === "ER_DUP_ENTRY") {
        console.log("Seed data 003_hasil_ujian already exists, skipping.");
      } else {
        console.warn("Seed data warning:", e.message);
      }
    }

    console.log("Migration 003_hasil_ujian_schema selesai.");
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
