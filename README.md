# 🧥 Katalog Pakaian Premium — Sistem Manajemen Stok & E-Commerce Realtime

Sistem Web Inventaris & Penjualan Pakaian Profesional dengan **arsitektur realtime**, **data tekstil realistis**, serta **otomatisasi inventaris atomik** (pengurangan stok otomatis saat checkout dan pemulihan stok otomatis jika pesanan dibatalkan).

---

## 🏗️ Tech Stack

| Layer | Teknologi | Deskripsi |
|-------|-----------|-----------|
| **Backend** | Python 3.12 + Django 5 + DRF | REST API, Transaksi Atomik (`select_for_update`), Manajemen Stok Otomatis |
| **Frontend** | Next.js 14 (App Router) + TypeScript + Tailwind CSS | SSR/SSG, Realtime Background Sync (15s polling), Cart & Checkout |
| **Database** | PostgreSQL 15 | Relasional berkecepatan tinggi dengan data fashion autentik & tarif pengiriman daerah |
| **Reverse Proxy** | Nginx Alpine | Gateway tunggal port 80 untuk routing traffic frontend, backend API, & static assets |
| **Container** | Docker & Docker Compose | Multi-container terisolasi siap produksi |

---

## 🌟 Fitur Utama & Otomatisasi Sistem

### 1. Etalase Produk Realistis & Autentik
- **12 Produk Fashion Indonesia Asli**: Kemeja Oxford Button-Down, Linen Collarless Shirt, Selvedge Denim Pants, Pima Cotton Tee, Knit Cardigan, Pleated Wrap Skirt, dsb.
- **89 Varian Multi-Dimensi Lengkap**: Informasi metrik pakaian riil: Lingkar Dada (LD), Panjang Baju (PB), Lebar Bahu, Panjang Lengan, dan Lingkar Pinggang (LP) dalam satuan sentimeter (cm).
- **Panduan Ukuran Pintar**: Rekomendasi ukuran otomatis berdasarkan Berat Badan (BB) dan Tinggi Badan (TB).

### 2. Transaksi Realtime & Pengurangan Stok Otomatis
- **Atomic Stock Deduction**: Menggunakan `transaction.atomic()` dengan kunci baris database (`select_for_update`), mencegah *race condition* atau *overselling* saat pesanan masuk secara bersamaan.
- **Kalkulasi Ongkos Kirim Real**: Terintegrasi dengan 22 tarif provinsi di Indonesia (DKI Jakarta, Jawa Barat, Jawa Tengah, Jawa Timur, Bali, Sumatera Utara, dsb.) dengan estimasi waktu sampai riil.

### 3. Pelacakan Pesanan Publik (`/lacak-pesanan`)
- Pembeli dapat melacak status pesanan secara mandiri menggunakan nomor pesanan (`ORD-YYYYMMDD-XXXX`).
- Stepper 4 tahap interaktif: **Dipesan** ➔ **Dikemas** ➔ **Dikirim (dengan Resi Kurir)** ➔ **Selesai**.
- Rincian item pakaian, alamat penerima, kurir ekspedisi, dan tombol salin nomor resi kurir.

### 4. Admin Toko Cepat & Realtime (`/admin-toko`)
- **Auto-Sync 15 Detik**: Dashboard admin memperbarui daftar pesanan dan metrik toko secara background tanpa perlu refresh manual.
- **Pill Indikator Realtime**: Indikator status live berwarna hijau berdenyut dengan tombol sinkronisasi instan.
- **Notifikasi Resi Kurir 1-Klik**: Tombol instan untuk mengirimkan pesan WhatsApp resmi berisi nomor resi kurir dan tautan pelacakan langsung ke pembeli.
- **Restorasi Stok Otomatis**: Jika pesanan dibatalkan (`CANCELLED`), sistem secara otomatis mengembalikan stok ke varian produk terkait.

---

## 🚀 Cara Menjalankan (Docker)

### Prasyarat
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) aktif di perangkat Anda.

### 1. Clone & Masuk ke Direktori
```bash
cd "d:\Web dan Apk\katalog_pakaian"
```

### 2. Jalankan Seluruh Service
```bash
docker compose up -d --build
```

### 3. Sinkronisasi Data Realistis (Clean & Seed)
```bash
docker exec -it katalog_backend python manage.py seed_data --clean
```

### 4. Akses Aplikasi

| Halaman | URL | Keterangan |
|---------|-----|------------|
| 🌐 **Katalog Toko** | `http://localhost:3000` | Etalase pakaian, filter ukuran, detail produk |
| 🛒 **Keranjang & Checkout** | `http://localhost:3000/keranjang` | Checkout otomatis dengan kalkulasi ongkir per daerah |
| 📦 **Pelacakan Pesanan** | `http://localhost:3000/lacak-pesanan` | Cek status pesanan & resi kurir ekspedisi |
| ⚡ **Admin Toko (Realtime)** | `http://localhost:3000/admin-toko` | Dashboard kelola pesanan, update resi & tarif ongkir |
| ⚙️ **Django Admin** | `http://localhost:8000/admin/` | Manajemen master produk & gambar |
| 📡 **REST API Produk** | `http://localhost:8000/api/products/` | Endpoint JSON katalog produk |

---

## 📡 Dokumentasi Endpoint REST API

### 1. Katalog & Stok
- `GET /api/products/` — List produk aktif (support filter kategori, ukuran, pencarian).
- `GET /api/products/<slug>/` — Detail produk lengkap dengan seluruh varian ukuran & warna.
- `GET /api/products/<slug>/stock/` — Cek cepat ketersediaan stok produk.
- `GET /api/categories/` — Daftar kategori produk.

### 2. Ongkos Kirim & Transaksi
- `GET /api/shipping-rates/` — Tarif ongkos kirim provinsi di Indonesia.
- `POST /api/checkout/` — Pembuatan pesanan atomik & pemotongan stok otomatis.
- `GET /api/orders/<tracking_number>/` — Pelacakan status pesanan publik.
- `GET /api/admin/orders/` — Rekap pesanan admin toko (dengan filtering status).
- `PATCH /api/admin/orders/<id>/` — Perbarui status pesanan, kurir, dan nomor resi.

---

## 🛡️ Jaminan Integritas & Keandalan
- **Bebas Data Dummy / Simulasi**: Seluruh entitas tersimpan langsung ke PostgreSQL secara persisten.
- **Non-blocking Polling**: Menggunakan mekanisme sinkronisasi hemat bandwidth yang aman dari kebocoran memori.
- **Strict Error Handling**: Validasi ketat pada nomor telepon pembeli, alamat, ketersediaan stok, dan parameter harga.
