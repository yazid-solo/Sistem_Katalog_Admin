# Pedoman Keamanan & Performa Web
**Proyek:** Katalog Pakaian Premium  
**Tech Stack:** Next.js (React), Python (Django), PostgreSQL, Docker  
**Standar:** Profesional / Kelas Enterprise

---

## BAGIAN 1: KEAMANAN (WEB SECURITY)
Fokus keamanan bukan hanya mencegah *hacker*, tetapi juga menjaga data stok tetap akurat dan data pelanggan aman dari kebocoran. Mengacu pada standar **OWASP Top 10**.

### 1.1 Autentikasi & Perlindungan Akses (Identity & Access)
*   **Password Hashing:** Menggunakan standar kriptografi yang lambat namun sangat aman seperti **PBKDF2** (Bawaan Django) atau **Argon2**. Sistem tidak akan pernah menyimpan *password* dalam bentuk teks biasa.
*   **Sesi Aman (Secure Sessions):** Token autentikasi tidak disimpan di *Local Storage* (karena rawan dicuri skrip jahat), melainkan menggunakan **HttpOnly Secure Cookies**. Cookie ini tidak bisa dibaca oleh *hacker* melalui JavaScript.
*   **Role-Based Access Control (RBAC):** Pemisahan ketat. Endpoint API (URL data) untuk mengubah stok (`POST /api/stock`) secara internal mengunci akses sehingga hanya bisa dipanggil jika memiliki token dengan peran `is_admin=True`.

### 1.2 Perlindungan Serangan Siber Umum
*   **Anti SQL-Injection:** Tidak ada kode SQL mentah yang ditulis. Semua interaksi database dilewatkan melalui **Django ORM** yang otomatis membersihkan (sanitize) input dari pengguna sebelum dimasukkan ke database PostgreSQL.
*   **Anti Cross-Site Scripting (XSS):** React/Next.js secara alami melindungi dari serangan XSS dengan melakukan *auto-escaping* pada semua teks input pelanggan sebelum ditampilkan ke layar. Selain itu, **Content Security Policy (CSP)** yang ketat akan diterapkan di server.
*   **Anti Cross-Site Request Forgery (CSRF):** Setiap pengiriman *form* (seperti login atau kirim pesan) wajib menyertakan **CSRF Token** terenkripsi, memastikan formulir dikirim dari web asli, bukan dari web peniru.

### 1.3 Perlindungan API & Infrastruktur
*   **Rate Limiting (Pembatasan Kecepatan):** API akan dilengkapi sistem *throttling*. Jika ada *bot* yang mencoba menebak password admin 10 kali dalam 1 menit, IP tersebut akan otomatis diblokir selama 1 jam.
*   **Isolasi Kontainer (Docker Security):** Database PostgreSQL sama sekali tidak memiliki pintu masuk (Port) yang terbuka ke internet. PostgreSQL hanya bisa diajak "berbicara" oleh kontainer Django melalui jaringan internal (*bridge network*) Docker.
*   **SSL/TLS (HTTPS):** Semua jalur lalu lintas data diwajibkan menggunakan enkripsi SSL tingkat tinggi menggunakan sertifikat (contoh: Let's Encrypt). Komunikasi via HTTP biasa otomatis dipaksa (*redirect*) menjadi HTTPS.

---

## BAGIAN 2: KELANCARAN & PERFORMA (WEB PERFORMANCE)
Katalog pakaian bergantung pada gambar beresolusi tinggi. Jika web memuat lebih dari 3 detik, pelanggan akan menutupnya. Optimalisasi difokuskan pada pengiriman data secepat kilat.

### 2.1 Optimasi Frontend (Kecepatan Antarmuka)
*   **Optimasi Gambar Tingkat Lanjut (Next.js `<Image>`):** Gambar resolusi raksasa (5MB) yang diunggah Admin akan dikonversi secara *real-time* oleh server Next.js menjadi format **WebP** atau **AVIF** (ukurannya menyusut 80% tanpa mengurangi ketajaman). Gambar juga otomatis disesuaikan ukurannya tergantung apakah pelanggan membuka via HP kecil atau Monitor 4K.
*   **Lazy Loading Agresif:** Hanya gambar yang sedang ditatap di layar HP yang di-download. Jika ada 100 baju di katalog, web hanya memuat 6 baju teratas terlebih dahulu.
*   **Static Site Generation (SSG) & Caching:** Halaman katalog dan profil baju akan di-*render* (dipanggang) terlebih dahulu di server. Pelanggan hanya mengunduh file HTML jadi, membuat web terbuka dalam hitungan **milidetik** (nyaris tanpa *loading*).
*   **Code Splitting:** JavaScript web dipecah. Jika pengunjung tidak membuka halaman "Peta Lokasi", kode pemetaan tidak akan didownload, sehingga menghemat kuota pelanggan secara drastis.

### 2.2 Optimasi Backend & Database (Logika Sistem)
*   **Database Indexing (Indeksasi):** Kolom database yang sering dicari seperti `Kategori`, `Warna`, `Ukuran`, dan `SKU` akan dipasang **B-Tree Index**. Ini seperti membuat "Daftar Isi" pada buku tebal; PostgreSQL bisa menemukan data spesifik dari jutaan baris hanya dalam kurang dari 0.01 detik.
*   **Menghindari N+1 Query Problem:** Kesalahan umum *developer* pemula adalah server bertanya ke database sebanyak jumlah varian baju (misal ada 100 baju, server menembak database 100 kali). Kita menggunakan teknik **`select_related`** dan **`prefetch_related`** di Django agar server hanya menembak database 1 atau 2 kali saja untuk menarik ratusan baju sekaligus.
*   **Redis Caching (Opsional tapi Sangat Disarankan):** Untuk data yang jarang berubah (seperti daftar kategori atau pengumuman *banner* atas), data tersebut disimpan di **RAM** server menggunakan Redis (bukan di Hardisk), sehingga pengambilan data 10x lipat lebih cepat.

### 2.3 Infrastruktur Jaringan
*   **Content Delivery Network (CDN):** Menggunakan layanan seperti Cloudflare. File gambar, CSS, dan JavaScript web Anda akan "dicopy" ke ribuan server di seluruh dunia. Jika pelanggan membuka web dari Jakarta, web akan dikirim dari server terdekat di Jakarta (walau server asli Anda ada di Singapura).
*   **Kompresi Gzip/Brotli:** Server (Nginx) akan secara otomatis memampatkan (zip) semua teks (HTML/JS/CSS) sebelum dikirim lewat jaringan internet, dan HP pelanggan otomatis mengekstraknya seketika. Ini menghemat penggunaan data hingga 70%.
