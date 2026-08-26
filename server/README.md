# Server

Folder ini untuk logic backend/server-side Node.js.

Struktur awal:

```txt
server/
  config/        konfigurasi server dan environment
  db/            koneksi database MySQL
  repositories/ query database per modul
  services/      business logic
  types/         type bersama untuk backend
```

Di Next.js, endpoint HTTP tetap dibuat di `app/api/.../route.ts`.
Route handler tersebut sebaiknya memanggil logic dari folder `server/`, bukan menaruh semua query langsung di file route.
