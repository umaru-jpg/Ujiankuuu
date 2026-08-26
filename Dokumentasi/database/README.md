# Database

Project ini disiapkan untuk MySQL. Migration awal ada di:

```txt
migrations/001_initial_schema.js
```

Contoh setup lokal:

```sql
CREATE DATABASE ujiankuuu
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

Jalankan migration:

```bash
node migrations/001_initial_schema.js
```

Atau lewat npm script:

```bash
npm run db:migrate
```

Script migration membaca koneksi dari `DATABASE_URL` di `.env.local` atau `.env`.

Pembagian folder backend:

```txt
app/api/       endpoint API Next.js
server/        logic backend, koneksi DB, repository, service
migrations/    script migration yang dijalankan dengan Node.js
Dokumentasi/   dokumentasi project
```

Struktur database saat ini masih migration awal. Tabel yang sudah ada:

```txt
users
classes
questions
```

Auth login sudah memakai tabel `users` melalui endpoint:

```txt
POST /api/auth/login
```

Akun awal yang dibuat migration:

```txt
admin / admin123
guru / guru123
siswa / siswa123
```

Tabel yang kemungkinan masih perlu dibuat pada tahap berikutnya:

```txt
subjects
exams
exam_schedules
question_options
exam_attempts
student_answers
exam_results
class_students
```
