# Blueprint Sistem Web Katalog Pakaian

Dokumen ini merupakan rangkuman hasil diskusi mengenai rancangan sistem web katalog yang difokuskan pada manajemen stok pakaian.

## 1. Tujuan Utama
Membuat sistem manajemen katalog produk pakaian untuk mempermudah visibilitas produk: mengetahui produk apa saja yang ada, masih tersedia (ready stock), dan kosong (out of stock) secara *real-time* dengan membedakan varian ukuran/warna.

## 2. Tech Stack (Teknologi yang Digunakan)

*   **Frontend (Tampilan Web):** Next.js (React.js) + Tailwind CSS.
    *   *Alasan:* Super cepat, *mobile-first*, dan memberikan pengalaman *Single Page Application* (SPA) di mana klik ukuran langsung mengubah status tanpa *refresh* layar.
*   **Backend (Logika & API):** Python (Django) + Django REST Framework.
    *   *Alasan:* Sangat stabil dan memiliki **Admin Panel Bawaan** yang menghemat waktu pembuatan dashboard pengelola. Django ORM menangani semua urusan SQL secara otomatis.
*   **Database:** PostgreSQL.
    *   *Alasan:* Tangguh untuk menangani data berelasi seperti (Baju -> Varian -> Stok).
*   **Infrastruktur:** Docker & Docker Compose.
    *   *Alasan:* Isolasi sistem yang rapi. Menjalankan database, backend, dan frontend secara bersamaan hanya dengan satu perintah tanpa instalasi manual di OS.

## 3. Fitur Utama

### A. Untuk Admin (Pengelola Stok)
*   **Manajemen Varian Pakaian:** Mampu memasukkan satu model baju dan mendata stoknya berdasarkan ukuran (S, M, L, XL) dan warna.
*   **Tabel Stok Cepat:** Antarmuka layaknya *spreadsheet* untuk mengubah angka stok secara instan tanpa perlu masuk ke mode edit produk satu per satu.
*   **Filter Cepat:** Fitur satu klik untuk menyaring "Hanya tampilkan stok kosong" atau "Stok menipis" untuk keperluan re-stock.

### B. Untuk Customer (Pengunjung)
*   **Visibilitas Transparan:** Label "Tersedia", "Sisa Sedikit", atau "Habis" langsung menempel pada foto produk di halaman depan.
*   **Pilih Ukuran Pintar:** Di halaman detail, tombol ukuran (S, M, L, XL) yang stoknya kosong akan otomatis berwarna pudar/dicoret dan tidak bisa diklik.
*   **Filter Relevan:** Pengunjung bisa mencari pakaian dengan filter khusus, misal: "Tampilkan semua kemeja yang ukuran L-nya masih ada".

## 4. Panduan UX / UI
*   **Mobile-First:** Navigasi bawah, galeri foto yang bisa digeser (*swipe*), dan tombol sentuh (ukuran) yang besar.
*   **Performa Ekstra (Tanpa Lemot):** 
    *   *Lazy Loading* (Gambar hanya dimuat saat di-scroll).
    *   *Skeleton Loading* (Animasi kotak abu-abu saat mengambil data, menggantikan layar putih kosong).
*   **Filter "Menempel":** Bar filter tetap berada di atas layar saat di-scroll untuk memudahkan modifikasi pencarian.

## 5. Alur Kerja Docker & Database
*   Pengembang (Developer) tidak perlu menulis kode SQL (`CREATE TABLE`, dll) di dalam wadah PostgreSQL. 
*   Docker menyiapkan wadah PostgreSQL yang kosong.
*   Django terhubung ke wadah tersebut dan menjalankan fitur *Migrations* (`python manage.py migrate`), yang akan otomatis membangun seluruh tabel dan relasi berdasarkan struktur Python.
