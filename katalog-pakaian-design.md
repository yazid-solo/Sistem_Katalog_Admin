# Design System & UI/UX Guidelines
**Proyek:** Katalog Pakaian Premium  
**Target Audiens:** Kelas Menengah ke Atas (*Middle-to-Upper Class*)  
**Gaya Visual:** *Quiet Luxury*, Minimalis, Elegan, dan Fokus pada Fotografi

---

## 1. Filosofi Desain (The "Anti-AI Slop" Approach)
Desain tidak boleh terlihat seperti *template* e-commerce generik yang penuh warna-warni berteriak ("Diskon 50%!"). Untuk memancarkan kesan premium, kita menerapkan prinsip **"Quiet Luxury"**:
*   **Ruang Kosong (Negative Space):** Biarkan elemen "bernapas". Jangan menumpuk teks dan tombol. Jarak (margin/padding) yang luas mengomunikasikan kemewahan.
*   **Fokus Visual:** Pakaian (fotografi) adalah pahlawan utama. UI (antarmuka) hanyalah bingkai yang tidak boleh mendistraksi mata.
*   **Borders & Shadows yang Halus:** Hindari bayangan (drop-shadow) tebal dan gelap. Gunakan bayangan yang sangat tipis dan menyebar rata (*diffused shadow*), atau hilangkan bayangan sama sekali dan gunakan garis batas (*border*) setebal 1px dengan warna yang sangat pudar.

## 2. Palet Warna (Color Palette)
Warna harus terasa organik, tidak menyilaukan (hindari warna *pure black* `#000000` atau *pure white* `#FFFFFF` yang tajam).

*   **Background Utama (Light):** Off-white atau *Oat* (`#F9F9F9` atau `#F5F5F0`). Memberikan kesan hangat dan *matte* seperti kertas majalah.
*   **Teks Utama (Headings):** Deep Charcoal / Soft Black (`#1C1C1E`). Lebih ramah di mata daripada hitam pekat.
*   **Teks Deskripsi (Body/Muted):** Ash Gray (`#8E8E93`).
*   **Warna Aksen (Tombol & Status):**
    *   *Primary Action:* Hitam pekat pekat (`#0A0A0A`) dengan teks putih untuk tombol utama. Elegan dan klasik.
    *   *Status Tersedia:* Subtle Sage Green (`#4C7A5D`) — hijau redam, bukan hijau neon.
    *   *Status Habis:* Muted Rust/Brick (`#A34343`) atau sekadar abu-abu dicoret untuk kesan netral.

## 3. Tipografi (Typography)
Pemilihan *font* adalah penentu utama apakah web terlihat seperti "template murah" atau "butik kelas atas".
*   **Primary Font (Judul & Navigasi):** *Geometris Sans-Serif* seperti **Inter**, **Plus Jakarta Sans**, atau **SF Pro Display**. 
*   **Secondary Font (Teks Panjang/Opsional):** Serif bergaya editorial (seperti **Playfair Display** atau **Lora**) *hanya* digunakan pada judul kampanye/koleksi tertentu untuk menambah sentuhan elegan.
*   **Hierarki Berat (Weight):** Gunakan kontras ekstrem. Judul menggunakan *Bold* (700) atau *Medium* (500), sedangkan deskripsi menggunakan *Light* (300) atau *Regular* (400). Hindari penggunaan *Semi-Bold* di mana-mana.

## 4. Arsitektur Tata Letak Pelanggan (Customer UI)

### A. Halaman Beranda (Discovery)
*   **Hero Image:** Foto *full-bleed* (memenuhi layar dari ujung ke ujung) dari model atau koleksi terbaru. Tidak ada teks tebal di tengah, cukup teks kecil elegan di sudut bawah dengan satu tombol tipis "Lihat Koleksi".
*   **Grid Produk (Katalog):** Gunakan rasio foto **4:5** (Portrait/Memanjang ke bawah), karena ini proporsi alami tubuh manusia. 
    *   Tidak ada kotak (border) yang mengelilingi foto produk.
    *   Teks nama produk dan harga berada di bawah foto dengan ukuran kecil dan rapi.
    *   *Hover Effect:* Saat foto disentuh (di laptop), foto otomatis berubah menjadi foto kedua (misal: dari foto baju dilipat menjadi foto baju dikenakan model).

### B. Halaman Detail Produk (Product Page)
*   **Galeri Split-Screen (Desktop):** Setengah layar kiri untuk foto (bisa di-scroll ke bawah menampilkan 3-4 foto besar bertumpuk), setengah layar kanan untuk deskripsi dan tombol ukuran (tetap diam/sticky saat foto di-scroll).
*   **Selector Ukuran (S, M, L, XL):** 
    *   Berbentuk kotak persegi minimalis dengan garis tepi 1px. 
    *   Ukuran yang habis (Kosong) tidak disembunyikan, melainkan garis tepinya menjadi titik-titik (dashed), warna teks abu-abu pudar, dan ada garis diagonal (dicoret) di tengahnya.
*   **Sticky Action Bar (Mobile):** Saat digulir di HP, tombol "Tanya via WhatsApp" dan status ketersediaan menempel (sticky) di ujung paling bawah layar agar bisa ditekan kapan saja oleh jempol pengguna.

## 5. Arsitektur Tata Letak Admin (Admin UI)
Dashboard admin tidak harus membosankan. Desainnya mengambil gaya *Bento-Box* (grid yang rapi seperti Apple).
*   **Navigasi Kiri (Sidebar):** Ikon monokrom tipis. Ringkas dan bisa disembunyikan.
*   **Tabel Data (Spreadsheet Feel):**
    *   Tabel tanpa garis vertikal (hanya garis pemisah horizontal tipis).
    *   Warna baris selang-seling (Zebra striping) yang *sangat* samar.
    *   Angka stok bisa langsung diklik dan diubah nilainya (Inline editing).
*   **Fokus Pemindaian Mata (Scannability):** Angka stok kritis/habis diberikan blok warna latar merah sangat muda dengan teks merah tua, agar Admin langsung melihat masalah inventaris tanpa harus mencari-cari.

## 6. Interaksi Mikro (Bespoke Micro-interactions)
Hal kecil yang membuat web terasa mahal:
*   **Transisi Halaman:** Menggunakan efek pudar masuk (*fade-in*) sekitar 0.2 detik. Tidak ada elemen yang melompat tiba-tiba.
*   **Skeleton Loading yang Halus:** Saat mengambil data, kotak *loading* tidak berkedip kasar, melainkan memiliki gelombang gradasi yang bergerak sangat lambat dan redup (*soft pulse*).
*   **Glassmorphism Halus:** Untuk *pop-up*, notifikasi, atau navigasi bawah di HP, gunakan latar belakang sedikit transparan dengan efek *background-blur* (kaca buram) seperti antarmuka iOS. 
*   **Tombol Haptik (Visual):** Saat tombol ukuran ditekan di HP, berikan efek visual mengecil (*scale: 0.98*) selama 0.1 detik untuk memberi umpan balik fisik yang memuaskan.
