# Laporan Tugas: Kontak API

**Mata Kuliah:** Pemrograman Internet — Pertemuan 5
**Judul Aplikasi:** Kontak — *Your people, at hand*
**Deskripsi Singkat:** Aplikasi manajemen kontak berbasis REST API, dibangun dengan Laravel 11 + Laravel Sanctum di sisi backend, dan antarmuka web (SPA sederhana) berbasis HTML/CSS/JavaScript murni di sisi frontend.

---

## 1. Ringkasan Arsitektur

Aplikasi ini terdiri dari dua lapisan yang terpisah secara jelas, saling berkomunikasi lewat REST API berformat JSON:

```
┌─────────────────────────┐        HTTP/JSON         ┌──────────────────────────┐
│   FRONTEND (Browser)    │  ─────────────────────►  │    BACKEND (Laravel)     │
│                          │  ◄─────────────────────  │                          │
│  index.html + style.css │      Bearer Token         │  routes/api.php          │
│  + app.js (vanilla JS)  │                            │  → Middleware auth:sanctum│
│                          │                            │  → Controllers           │
│  Disajikan statis dari  │                            │  → Eloquent Models        │
│  folder public/app/     │                            │  → SQLite Database        │
└─────────────────────────┘                            └──────────────────────────┘
```

**Kenapa dipisah seperti ini?**
Backend hanya bertugas sebagai penyedia data (API) — tidak tahu-menahu soal tampilan. Frontend hanya bertugas menampilkan data dan mengirim permintaan — tidak menyimpan data apa pun secara permanen sendiri. Pemisahan ini membuat backend bisa diuji sendiri (lewat Postman/`api-tester.html`) terlepas dari ada-tidaknya frontend, dan sebaliknya frontend bisa diganti total (misalnya nanti dibuat versi mobile) tanpa mengubah satu baris pun kode backend.

### 1.1 Lapisan Backend

| Komponen | Peran |
|---|---|
| `routes/api.php` | Pintu masuk semua request, memetakan URL + method HTTP ke Controller yang sesuai |
| Middleware `auth:sanctum` | Penjaga gerbang — memvalidasi Bearer Token sebelum request diteruskan ke Controller |
| `AuthController` | Menangani registrasi, login (menerbitkan token), dan logout (mencabut token) |
| `ContactController` | Menangani CRUD (Create, Read, Update, Delete) data kontak |
| `Contact` & `ContactPhone` (Model) | Representasi tabel `kontak` dan `kontak_phones`, mendefinisikan relasi satu-ke-banyak (`hasMany` / `belongsTo`) |
| SQLite (`db_kontak.sqlite`) | Penyimpanan data permanen |

### 1.2 Lapisan Frontend

| File | Peran |
|---|---|
| `index.html` | Struktur/markup semua tampilan (auth, list, form) dalam satu halaman — tidak reload saat berpindah tampilan |
| `style.css` | Sistem desain: warna, tipografi, spacing, komponen (tombol pil, kartu, badge), dan breakpoint responsif |
| `app.js` | Seluruh logika: menyimpan status login, memanggil API, merender data ke DOM, menangani interaksi pengguna |

Frontend sengaja dibuat **tanpa framework dan tanpa build step** (bukan React/Vue) — cukup dibuka lewat server Laravel di `public/app/index.html`, langsung jalan. Ini memenuhi kebutuhan agar tidak menambah beban/dependency baru dan tidak mengubah struktur backend yang sudah ada.

---

## 2. Alur Data (Data Flow)

Aplikasi ini adalah **Single Page Application (SPA) sederhana** — hanya ada satu file HTML, dan JavaScript yang mengatur bagian mana yang terlihat (`auth-view`, `list-view`, `form-view`) dengan atribut `hidden`, tanpa pernah reload halaman.

### 2.1 Alur Autentikasi

```
[Buka index.html]
        │
        ▼
  Ada token di localStorage?
    │             │
   Ya            Tidak
    │             │
    ▼             ▼
enterApp()   Tampilkan auth-view
    │        (form Login/Register)
    │             │
    │             ▼
    │        User isi form → submit
    │             │
    │             ▼
    │        POST /api/login  atau  POST /api/register
    │             │
    │             ▼
    │        Backend validasi → kembalikan { token, user }
    │             │
    │             ▼
    │        Token & user disimpan ke localStorage
    │             │
    └─────────────┘
        ▼
  showView('list') + loadContacts()
```

**Detail teknis:** setiap kali `app.js` memanggil endpoint (fungsi `request()`), ia otomatis menyisipkan header `Authorization: Bearer <token>` jika token tersedia di `localStorage`. Jika server membalas status `401 Unauthorized` (misalnya token kedaluwarsa), frontend otomatis menghapus token dan mengembalikan pengguna ke tampilan login — tanpa perlu logika tambahan di setiap fungsi.

### 2.2 Alur Menampilkan Daftar Kontak

```
enterApp()
   │
   ▼
GET /api/kontak   (header: Authorization: Bearer <token>)
   │
   ▼
Middleware auth:sanctum memvalidasi token
   │
   ▼
ContactController@index → Contact::with('phones')->get()
   │
   ▼
Backend balas JSON: array kontak, masing-masing membawa array "phones" (relasi 1:N)
   │
   ▼
app.js menyimpan hasil ke state.contacts
   │
   ▼
renderContacts() → generate <article class="contact-card"> untuk tiap kontak,
                    filter berdasarkan teks pencarian (jika ada)
```

### 2.3 Alur Tambah Kontak

```
Klik "Add kontak" → openContactForm() → tampilkan form-view (kosong)
   │
   ▼
User isi nama, alamat, tanggal lahir + nomor telepon (bisa lebih dari satu)
   │
   ▼
Submit → handleContactSave()
   │
   ▼
POST /api/kontak
Body: { nama, alamat, tanggal_lahir, phones: [{ jenis, nomor_telepon }, ...] }
   │
   ▼
ContactController@store:
  1. Validasi input
  2. Contact::create(...)               → simpan ke tabel kontak
  3. $contact->phones()->createMany(...) → simpan ke tabel kontak_phones
     dengan kontak_id otomatis terisi lewat relasi
   │
   ▼
Backend balas JSON kontak baru (lengkap dengan phones)
   │
   ▼
app.js menambahkan ke state.contacts, kembali ke list-view, tampilkan toast sukses
```

### 2.4 Alur Edit & Hapus Kontak

- **Edit:** klik ikon pensil pada kartu kontak → form terisi otomatis dari data yang sudah ada di `state.contacts` (tidak perlu fetch ulang) → submit mengirim `PUT /api/kontak/{id}` dengan field yang berubah → `ContactController@update` memakai validasi `sometimes` sehingga field yang tidak diubah tidak wajib dikirim ulang.
- **Hapus:** klik ikon silang → dialog konfirmasi browser → `DELETE /api/kontak/{id}` → berkat `onDelete('cascade')` di migration, seluruh nomor telepon milik kontak tersebut otomatis ikut terhapus di database tanpa perlu request terpisah.

---

## 3. Struktur Halaman & Komponen (Frontend)

`index.html` dibagi menjadi tiga `<section class="view">` yang saling eksklusif:

1. **`auth-view`** — Split dua kolom: copywriting di kiri, kartu form Login/Create account di kanan. Tab "Log in" dan "Create account" mengubah `state.authMode` dan menampilkan/menyembunyikan field nama.
2. **`list-view`** — Header halaman + kotak pencarian real-time (`input` event langsung memfilter tanpa perlu tombol submit) + grid kartu kontak (3 kolom di desktop, menyusut ke 1 kolom di mobile lewat CSS `@media`).
3. **`form-view`** — Dipakai bersama untuk Tambah **dan** Edit kontak (judul & tombol berubah otomatis via `openContactForm()`). Bagian nomor telepon bersifat dinamis — tombol "Add number" menambah baris baru ke `state.phoneRows`, yang dirender ulang setiap kali berubah.

### 3.1 Sistem Desain

| Token | Nilai | Kegunaan |
|---|---|---|
| `--cream` | `#F7F3EA` | Warna latar utama halaman |
| `--ink` | `#1A1A1A` | Warna teks utama & tombol primer |
| `--orange` | `#E8734A` | Warna aksen (judul kecil, tab aktif, ikon pencarian) |
| `--tan` | `#EAE2CE` | Warna latar avatar & tombol tersier |
| Radius tombol/input | `999px` (pil) | Konsisten di semua elemen interaktif |
| Radius kartu | `18px` | Kartu kontak, kartu form, kartu auth |
| Font judul | Georgia (serif) | Kesan hangat/personal pada judul besar |
| Font isi | System UI (sans-serif) | Keterbacaan tinggi untuk label & teks form |

Layout sepenuhnya responsif memakai CSS Grid/Flexbox dengan dua breakpoint utama (`820px` dan `560px`) yang menyesuaikan jumlah kolom grid kontak dan mengubah susunan form menjadi satu kolom di layar kecil.

---

## 4. Cara Menjalankan Aplikasi

```bash
# 1. Install dependency & setup awal
composer install
cp .env.example .env
php artisan key:generate

# 2. Setup database SQLite
touch database/db_kontak.sqlite
# pastikan di .env: DB_CONNECTION=sqlite, DB_DATABASE=database/db_kontak.sqlite

# 3. Setup Sanctum & migration
php artisan install:api
php artisan migrate

# 4. Jalankan server
php artisan serve
```

Akses aplikasi di **`http://localhost:8000/app/index.html`**.
Debug endpoint mentah tersedia terpisah di **`http://localhost:8000/api-tester.html`**.

---

## 5. Ringkasan Endpoint API yang Dikonsumsi Frontend

| Method | Endpoint | Dipanggil saat |
|---|---|---|
| POST | `/api/register` | Submit form "Create account" |
| POST | `/api/login` | Submit form "Log in" |
| POST | `/api/logout` | Klik tombol "Log out" |
| GET | `/api/kontak` | Halaman list dimuat, atau setelah login berhasil |
| POST | `/api/kontak` | Submit form Tambah kontak |
| PUT | `/api/kontak/{id}` | Submit form Edit kontak |
| DELETE | `/api/kontak/{id}` | Klik ikon hapus + konfirmasi |

---

## 6. Lampiran Tangkapan Layar

*(Sisipkan screenshot berikut di laporan PDF final, sesuai urutan alur di atas)*

1. Tampilan Login/Create account
2. Tampilan daftar kontak (list-view) berisi data
3. Tampilan form Tambah kontak
4. Tampilan form Edit kontak dengan data terisi

---

## 7. Kesimpulan

Aplikasi ini menunjukkan penerapan arsitektur **client-server** dengan pemisahan tegas antara backend (REST API stateless, terautentikasi via token) dan frontend (SPA ringan tanpa dependency berat). Relasi data satu-ke-banyak antara kontak dan nomor telepon ditangani sepenuhnya di sisi backend melalui Eloquent ORM, sementara frontend berfokus pada pengalaman pengguna yang responsif dan real-time tanpa reload halaman.
