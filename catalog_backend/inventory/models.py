"""
Core database models for the Clothing Catalog Inventory system.

Model hierarchy:
  Category
    └── Product
          ├── ProductImage  (multiple images per product)
          └── Variant       (size + color + stock_quantity)
"""
from django.db import models
from django.db.models import F
from django.utils.text import slugify


# ─────────────────────────────────────────
# CATEGORY
# ─────────────────────────────────────────
class Category(models.Model):
    """
    Top-level product category (e.g., Daster, Kulot, Setelan, Mukena & Hijab).
    The slug is auto-generated from name and used in URLs.
    """
    name = models.CharField(
        max_length=100,
        unique=True,
        verbose_name="Nama Kategori",
        help_text="Contoh: Daster, Kulot, Celana Pendek & Bogo, Setelan, Mukena & Hijab"
    )
    slug = models.SlugField(
        max_length=100,
        unique=True,
        blank=True,
        verbose_name="Slug URL",
        help_text="Diisi otomatis dari nama kategori"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Kategori"
        verbose_name_plural = "Kategori"
        ordering = ['name']

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


# ─────────────────────────────────────────
# PRODUCT
# ─────────────────────────────────────────
class Product(models.Model):
    """
    A single clothing product (e.g., "Daster Rayon Premium Busui").
    One product can have multiple images and multiple size/color variants.
    """
    title = models.CharField(
        max_length=200,
        verbose_name="Nama Produk",
        help_text="Nama lengkap produk, misal: Daster Rayon Premium Busui / Kulot Crinkle Airflow"
    )
    description = models.TextField(
        blank=True,
        verbose_name="Deskripsi",
        help_text="Deskripsi bahan, detail jahitan, dll."
    )
    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='products',
        verbose_name="Kategori"
    )
    base_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        db_index=True,
        verbose_name="Harga Dasar (Rp)",
        help_text="Harga dalam Rupiah, tanpa titik/koma pemisah ribuan"
    )
    is_active = models.BooleanField(
        default=True,
        db_index=True,
        verbose_name="Aktif / Ditampilkan",
        help_text="Hilangkan centang untuk menyembunyikan produk dari katalog"
    )
    slug = models.SlugField(
        max_length=220,
        unique=True,
        blank=True,
        verbose_name="Slug URL"
    )
    size_guide = models.TextField(
        blank=True,
        verbose_name="Catatan Panduan Ukuran Khusus",
        help_text="Catatan tambahan ukuran baju, misal: 'Tinggi model 168 cm, BB 52 kg, mengenakan size S'"
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True, verbose_name="Dibuat")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Diperbarui")

    class Meta:
        verbose_name = "Produk"
        verbose_name_plural = "Produk"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['is_active', '-created_at']),
        ]

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.title)
            slug = base_slug
            counter = 1
            while Product.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)

    def __str__(self):
        return self.title

    @property
    def primary_image(self):
        """Returns the primary image URL using prefetched cache to avoid N+1 queries."""
        all_imgs = list(self.images.all())
        if not all_imgs:
            return None
        primary = next((img for img in all_imgs if img.is_primary), None)
        if primary:
            return primary.effective_image_url
        return all_imgs[0].effective_image_url

    @property
    def total_stock(self):
        """Sum of all variant stock quantities."""
        return sum(v.stock_quantity for v in self.variants.all())

    @property
    def stock_status(self):
        """Human-readable stock status for the admin."""
        total = self.total_stock
        if total == 0:
            return "Habis"
        elif total <= 5:
            return "Hampir Habis"
        return "Tersedia"


# ─────────────────────────────────────────
# PRODUCT IMAGE
# ─────────────────────────────────────────
class ProductImage(models.Model):
    """
    One or more images per product. Supports both direct file uploads
    from computer/phone and external URLs (CDN, Cloudinary, etc.).
    """
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='images',
        verbose_name="Produk"
    )
    image_file = models.ImageField(
        upload_to='products/%Y/%m/',
        blank=True,
        null=True,
        verbose_name="Upload File Gambar",
        help_text="Pilih file gambar langsung dari komputer/HP (JPG, PNG, WebP)"
    )
    image_url = models.URLField(
        max_length=500,
        blank=True,
        verbose_name="Atau URL Gambar (Opsional)",
        help_text="Paste URL gambar jika menggunakan link online / CDN"
    )
    color = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="Warna Terkait (Opsional)",
        help_text="Kaitkan foto ini ke warna tertentu (misal: Putih, Sage Green). Foto akan otomatis berganti saat warna ini diklik."
    )
    alt_text = models.CharField(
        max_length=200,
        blank=True,
        verbose_name="Teks Alt (SEO)",
        help_text="Deskripsi gambar untuk aksesibilitas dan SEO"
    )
    is_primary = models.BooleanField(
        default=False,
        verbose_name="Gambar Utama",
        help_text="Centang satu gambar sebagai gambar utama produk"
    )
    sort_order = models.PositiveSmallIntegerField(
        default=0,
        verbose_name="Urutan Tampil",
        help_text="Angka kecil = tampil lebih awal"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Gambar Produk"
        verbose_name_plural = "Gambar Produk"
        ordering = ['sort_order', 'created_at']

    def __str__(self):
        status = " [Utama]" if self.is_primary else ""
        return f"{self.product.title} — Gambar {self.sort_order}{status}"

    @property
    def effective_image_url(self):
        """Returns the uploaded file URL if present, otherwise the external URL."""
        if self.image_file:
            return self.image_file.url
        return self.image_url or ''

    def clean(self):
        from django.core.exceptions import ValidationError
        if not self.image_file and not self.image_url:
            raise ValidationError("Harap upload file gambar ATAU masukkan URL gambar.")

    def save(self, *args, **kwargs):
        # Ensure only one primary image per product
        if self.is_primary:
            ProductImage.objects.filter(
                product=self.product, is_primary=True
            ).exclude(pk=self.pk).update(is_primary=False)
        super().save(*args, **kwargs)


# ─────────────────────────────────────────
# VARIANT (SIZE + COLOR + STOCK)
# ─────────────────────────────────────────
class Variant(models.Model):
    """
    A specific purchasable variant of a product (size + color combination).
    This is where stock is tracked.

    Example: "Daster Rayon Premium Busui" → Size: ALL SIZE, Color: Motif Bunga Dusty, Stock: 15
    """
    SIZE_CHOICES = [
        ('ALL SIZE', 'All Size'),
        ('STANDAR', 'Standar'),
        ('JUMBO', 'Jumbo'),
        ('XS', 'XS'),
        ('S', 'S'),
        ('M', 'M'),
        ('L', 'L'),
        ('XL', 'XL'),
        ('XXL', 'XXL'),
        ('XXXL', 'XXXL'),
        ('FREE_SIZE', 'Free Size'),
    ]

    SIZE_SORT_ORDER = {
        'ALL SIZE': 0, 'FREE_SIZE': 1, 'STANDAR': 2, 'JUMBO': 3,
        'XS': 4, 'S': 5, 'M': 6, 'L': 7,
        'XL': 8, 'XXL': 9, 'XXXL': 10
    }

    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='variants',
        verbose_name="Produk"
    )
    size = models.CharField(
        max_length=20,
        choices=SIZE_CHOICES,
        db_index=True,
        verbose_name="Ukuran"
    )
    color = models.CharField(
        max_length=100,
        db_index=True,
        verbose_name="Warna / Motif",
        help_text="Nama warna atau motif, misal: Hitam, Sage Green, Krem Susu, Motif Bunga"
    )
    sku = models.CharField(
        max_length=50,
        blank=True,
        unique=True,
        null=True,
        verbose_name="SKU",
        help_text="Kode unik varian (opsional, diisi otomatis jika kosong)"
    )
    stock_quantity = models.PositiveIntegerField(
        default=0,
        db_index=True,
        verbose_name="Jumlah Stok",
        help_text="0 = Habis, akan ditampilkan sebagai tombol dicoret di frontend"
    )
    chest_width = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name="Lingkar Dada (cm)",
        help_text="Opsional, misal: 96, 100, 106 (LD)"
    )
    body_length = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name="Panjang Baju (cm)",
        help_text="Opsional, misal: 70, 72, 74 (PB)"
    )
    shoulder_width = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name="Lebar Bahu (cm)",
        help_text="Opsional, misal: 42, 44, 46"
    )
    sleeve_length = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name="Panjang Lengan (cm)",
        help_text="Opsional, misal: 56, 58, 60"
    )
    waist_width = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name="Lingkar Pinggang (cm)",
        help_text="Opsional untuk kulot/celana/bogo/mukena, misal: 68, 72, 100"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Varian"
        verbose_name_plural = "Varian"
        # Each product can only have one variant per size+color combo
        unique_together = [['product', 'size', 'color']]
        ordering = ['color', 'size']
        indexes = [
            models.Index(fields=['product', 'stock_quantity']),
        ]

    def save(self, *args, **kwargs):
        # Auto-generate SKU if not provided
        if not self.sku:
            product_code = self.product.slug[:8].upper().replace('-', '')
            color_clean = ''.join(c for c in self.color.upper() if c.isalnum())
            color_code = (color_clean[:3] + color_clean[-2:]) if len(color_clean) > 4 else color_clean[:4]
            size_code = self.size.replace(' ', '')[:4].upper()
            base_sku = f"{product_code}-{size_code}-{color_code}"
            sku = base_sku
            counter = 1
            while Variant.objects.filter(sku=sku).exclude(pk=self.pk).exists():
                sku = f"{base_sku}-{counter}"
                counter += 1
            self.sku = sku
        super().save(*args, **kwargs)

    def __str__(self):
        status = f" (Stok: {self.stock_quantity})"
        return f"{self.product.title} | {self.get_size_display()} | {self.color}{status}"

    @property
    def is_available(self):
        return self.stock_quantity > 0

    @property
    def availability_label(self):
        if self.stock_quantity == 0:
            return "Habis"
        elif self.stock_quantity <= 5:
            return "Sisa Sedikit"
        return "Tersedia"

    @property
    def effective_measurements(self):
        cat_slug = self.product.category.slug.lower() if self.product and self.product.category else ''
        title_lower = self.product.title.lower() if self.product else ''
        size_key = self.size.upper()

        # 1. Setelan Anak (Kids 1-10 Years)
        if 'anak' in cat_slug or 'anak' in title_lower:
            KIDS_STD = {
                'ALL SIZE': {'ld': 72, 'pb': 46, 'bahu': 30, 'lengan': 16, 'lp': 60, 'bb': '12-22 kg (Anak 2-6 Thn)'},
                'FREE_SIZE': {'ld': 72, 'pb': 46, 'bahu': 30, 'lengan': 16, 'lp': 60, 'bb': '12-22 kg (Anak 2-6 Thn)'},
                'STANDAR': {'ld': 70, 'pb': 45, 'bahu': 29, 'lengan': 15, 'lp': 58, 'bb': '12-20 kg (Anak 2-5 Thn)'},
                'JUMBO': {'ld': 84, 'pb': 54, 'bahu': 35, 'lengan': 19, 'lp': 70, 'bb': '22-32 kg (Anak 6-10 Thn)'},
                'XS': {'ld': 60, 'pb': 39, 'bahu': 25, 'lengan': 13, 'lp': 48, 'bb': '8-11 kg (Anak 1 Thn)'},
                'S': {'ld': 64, 'pb': 42, 'bahu': 27, 'lengan': 14, 'lp': 52, 'bb': '10-14 kg (Anak 1-2 Thn)'},
                'M': {'ld': 70, 'pb': 45, 'bahu': 29, 'lengan': 15, 'lp': 56, 'bb': '14-18 kg (Anak 3-4 Thn)'},
                'L': {'ld': 76, 'pb': 48, 'bahu': 31, 'lengan': 16, 'lp': 62, 'bb': '18-22 kg (Anak 5-6 Thn)'},
                'XL': {'ld': 82, 'pb': 52, 'bahu': 33, 'lengan': 18, 'lp': 66, 'bb': '22-27 kg (Anak 7-8 Thn)'},
                'XXL': {'ld': 86, 'pb': 55, 'bahu': 35, 'lengan': 19, 'lp': 72, 'bb': '27-33 kg (Anak 9-10 Thn)'},
                'XXXL': {'ld': 90, 'pb': 58, 'bahu': 37, 'lengan': 20, 'lp': 76, 'bb': '33-38 kg (Anak 10-12 Thn)'},
            }
            std = KIDS_STD.get(size_key, KIDS_STD['ALL SIZE'])
        # 2. Hijab / Kerudung
        elif any(k in title_lower for k in ['hijab', 'kerudung', 'pashmina', 'segi empat']):
            HIJAB_STD = {
                'ALL SIZE': {'ld': 115, 'pb': 115, 'bahu': 0, 'lengan': 0, 'lp': 0, 'bb': 'Ukuran Standar Reguler (115×115 cm)'},
                'FREE_SIZE': {'ld': 115, 'pb': 115, 'bahu': 0, 'lengan': 0, 'lp': 0, 'bb': 'Ukuran Standar Reguler (115×115 cm)'},
                'STANDAR': {'ld': 115, 'pb': 115, 'bahu': 0, 'lengan': 0, 'lp': 0, 'bb': 'Reguler Tegak Dahi (115×115 cm)'},
                'JUMBO': {'ld': 130, 'pb': 130, 'bahu': 0, 'lengan': 0, 'lp': 0, 'bb': 'Syar\'i Menutup Dada (130×130 cm)'},
                'S': {'ld': 110, 'pb': 110, 'bahu': 0, 'lengan': 0, 'lp': 0, 'bb': 'Compact / Remaja (110×110 cm)'},
                'M': {'ld': 115, 'pb': 115, 'bahu': 0, 'lengan': 0, 'lp': 0, 'bb': 'Reguler Harian (115×115 cm)'},
                'L': {'ld': 120, 'pb': 120, 'bahu': 0, 'lengan': 0, 'lp': 0, 'bb': 'Medium Syar\'i (120×120 cm)'},
                'XL': {'ld': 125, 'pb': 125, 'bahu': 0, 'lengan': 0, 'lp': 0, 'bb': 'Lebar Syar\'i (125×125 cm)'},
                'XXL': {'ld': 130, 'pb': 130, 'bahu': 0, 'lengan': 0, 'lp': 0, 'bb': 'Jumbo Syar\'i (130×130 cm)'},
            }
            std = HIJAB_STD.get(size_key, HIJAB_STD['ALL SIZE'])
        # 3. Kain Pantai
        elif 'kain pantai' in title_lower or 'kain-pantai' in cat_slug:
            PANTAI_STD = {
                'ALL SIZE': {'ld': 120, 'pb': 180, 'bahu': 0, 'lengan': 0, 'lp': 0, 'bb': '40-90 kg (Fleksibel / Multifungsi)'},
                'FREE_SIZE': {'ld': 120, 'pb': 180, 'bahu': 0, 'lengan': 0, 'lp': 0, 'bb': '40-90 kg (Fleksibel / Multifungsi)'},
                'STANDAR': {'ld': 115, 'pb': 175, 'bahu': 0, 'lengan': 0, 'lp': 0, 'bb': '40-75 kg (Standar Bali)'},
                'JUMBO': {'ld': 125, 'pb': 190, 'bahu': 0, 'lengan': 0, 'lp': 0, 'bb': '65-100 kg (Lebar Jumbo)'},
                'S': {'ld': 115, 'pb': 165, 'bahu': 0, 'lengan': 0, 'lp': 0, 'bb': '40-55 kg'},
                'M': {'ld': 115, 'pb': 170, 'bahu': 0, 'lengan': 0, 'lp': 0, 'bb': '50-65 kg'},
                'L': {'ld': 120, 'pb': 180, 'bahu': 0, 'lengan': 0, 'lp': 0, 'bb': '60-75 kg'},
                'XL': {'ld': 120, 'pb': 185, 'bahu': 0, 'lengan': 0, 'lp': 0, 'bb': '70-85 kg'},
                'XXL': {'ld': 125, 'pb': 190, 'bahu': 0, 'lengan': 0, 'lp': 0, 'bb': '80-100 kg'},
            }
            std = PANTAI_STD.get(size_key, PANTAI_STD['ALL SIZE'])
        # 4. Mukena
        elif 'mukena' in title_lower or 'mukena' in cat_slug:
            MUKENA_STD = {
                'ALL SIZE': {'ld': 125, 'pb': 118, 'bahu': 0, 'lengan': 0, 'lp': 130, 'bb': '45-80 kg (Tinggi Maks 168 cm)'},
                'FREE_SIZE': {'ld': 125, 'pb': 118, 'bahu': 0, 'lengan': 0, 'lp': 130, 'bb': '45-80 kg (Tinggi Maks 168 cm)'},
                'STANDAR': {'ld': 122, 'pb': 115, 'bahu': 0, 'lengan': 0, 'lp': 125, 'bb': '45-70 kg (Tinggi Maks 165 cm)'},
                'JUMBO': {'ld': 130, 'pb': 122, 'bahu': 0, 'lengan': 0, 'lp': 145, 'bb': '65-95 kg (Tinggi Maks 175 cm)'},
                'S': {'ld': 118, 'pb': 112, 'bahu': 0, 'lengan': 0, 'lp': 120, 'bb': '42-55 kg'},
                'M': {'ld': 122, 'pb': 115, 'bahu': 0, 'lengan': 0, 'lp': 125, 'bb': '50-65 kg'},
                'L': {'ld': 125, 'pb': 118, 'bahu': 0, 'lengan': 0, 'lp': 130, 'bb': '60-75 kg'},
                'XL': {'ld': 128, 'pb': 120, 'bahu': 0, 'lengan': 0, 'lp': 138, 'bb': '70-85 kg'},
                'XXL': {'ld': 130, 'pb': 122, 'bahu': 0, 'lengan': 0, 'lp': 145, 'bb': '80-95 kg'},
            }
            std = MUKENA_STD.get(size_key, MUKENA_STD['ALL SIZE'])
        # 5. Kulot / Kulot Polos
        elif 'kulot' in cat_slug or 'kulot' in title_lower:
            KULOT_STD = {
                'ALL SIZE': {'ld': 0, 'pb': 95, 'bahu': 0, 'lengan': 0, 'lp': 105, 'bb': '45-70 kg (All Size)'},
                'FREE_SIZE': {'ld': 0, 'pb': 95, 'bahu': 0, 'lengan': 0, 'lp': 105, 'bb': '45-70 kg (All Size)'},
                'STANDAR': {'ld': 0, 'pb': 94, 'bahu': 0, 'lengan': 0, 'lp': 102, 'bb': '45-65 kg'},
                'JUMBO': {'ld': 0, 'pb': 97, 'bahu': 0, 'lengan': 0, 'lp': 120, 'bb': '65-90 kg'},
                'S': {'ld': 0, 'pb': 92, 'bahu': 0, 'lengan': 0, 'lp': 94, 'bb': '42-52 kg'},
                'M': {'ld': 0, 'pb': 94, 'bahu': 0, 'lengan': 0, 'lp': 100, 'bb': '50-60 kg'},
                'L': {'ld': 0, 'pb': 95, 'bahu': 0, 'lengan': 0, 'lp': 106, 'bb': '58-68 kg'},
                'XL': {'ld': 0, 'pb': 96, 'bahu': 0, 'lengan': 0, 'lp': 112, 'bb': '68-78 kg'},
                'XXL': {'ld': 0, 'pb': 97, 'bahu': 0, 'lengan': 0, 'lp': 120, 'bb': '78-90 kg'},
            }
            std = KULOT_STD.get(size_key, KULOT_STD['ALL SIZE'])
        # 6. Celana Pendek & Bogo
        elif any(k in cat_slug for k in ['celana', 'bogo']) or any(k in title_lower for k in ['celana', 'bogo']):
            SHORTS_STD = {
                'ALL SIZE': {'ld': 0, 'pb': 45, 'bahu': 0, 'lengan': 0, 'lp': 105, 'bb': '45-72 kg (All Size)'},
                'FREE_SIZE': {'ld': 0, 'pb': 45, 'bahu': 0, 'lengan': 0, 'lp': 105, 'bb': '45-72 kg (All Size)'},
                'STANDAR': {'ld': 0, 'pb': 44, 'bahu': 0, 'lengan': 0, 'lp': 102, 'bb': '45-65 kg'},
                'JUMBO': {'ld': 0, 'pb': 48, 'bahu': 0, 'lengan': 0, 'lp': 118, 'bb': '65-90 kg'},
                'S': {'ld': 0, 'pb': 42, 'bahu': 0, 'lengan': 0, 'lp': 94, 'bb': '42-52 kg'},
                'M': {'ld': 0, 'pb': 44, 'bahu': 0, 'lengan': 0, 'lp': 100, 'bb': '50-60 kg'},
                'L': {'ld': 0, 'pb': 46, 'bahu': 0, 'lengan': 0, 'lp': 106, 'bb': '58-68 kg'},
                'XL': {'ld': 0, 'pb': 47, 'bahu': 0, 'lengan': 0, 'lp': 112, 'bb': '68-78 kg'},
                'XXL': {'ld': 0, 'pb': 48, 'bahu': 0, 'lengan': 0, 'lp': 118, 'bb': '78-90 kg'},
            }
            std = SHORTS_STD.get(size_key, SHORTS_STD['ALL SIZE'])
        # 7. Daster
        elif 'daster' in cat_slug or 'daster' in title_lower:
            DASTER_STD = {
                'ALL SIZE': {'ld': 112, 'pb': 115, 'bahu': 44, 'lengan': 22, 'lp': 115, 'bb': '45-75 kg (All Size)'},
                'FREE_SIZE': {'ld': 112, 'pb': 115, 'bahu': 44, 'lengan': 22, 'lp': 115, 'bb': '45-75 kg (All Size)'},
                'STANDAR': {'ld': 110, 'pb': 114, 'bahu': 43, 'lengan': 21, 'lp': 112, 'bb': '45-68 kg'},
                'JUMBO': {'ld': 125, 'pb': 118, 'bahu': 48, 'lengan': 25, 'lp': 128, 'bb': '68-95 kg'},
                'S': {'ld': 100, 'pb': 110, 'bahu': 40, 'lengan': 19, 'lp': 104, 'bb': '42-52 kg'},
                'M': {'ld': 106, 'pb': 112, 'bahu': 42, 'lengan': 20, 'lp': 108, 'bb': '50-60 kg'},
                'L': {'ld': 112, 'pb': 115, 'bahu': 44, 'lengan': 22, 'lp': 114, 'bb': '60-70 kg'},
                'XL': {'ld': 118, 'pb': 116, 'bahu': 46, 'lengan': 23, 'lp': 120, 'bb': '70-82 kg'},
                'XXL': {'ld': 125, 'pb': 118, 'bahu': 48, 'lengan': 25, 'lp': 128, 'bb': '80-95 kg'},
            }
            std = DASTER_STD.get(size_key, DASTER_STD['ALL SIZE'])
        # 8. Setelan Dewasa & Kaos / Outer
        else:
            STANDARDS = {
                'ALL SIZE': {'ld': 110, 'pb': 70, 'bahu': 45, 'lengan': 40, 'lp': 106, 'bb': '45-72 kg (All Size)'},
                'FREE_SIZE': {'ld': 110, 'pb': 70, 'bahu': 45, 'lengan': 40, 'lp': 106, 'bb': '45-72 kg (All Size)'},
                'STANDAR': {'ld': 106, 'pb': 68, 'bahu': 43, 'lengan': 38, 'lp': 102, 'bb': '45-65 kg'},
                'JUMBO': {'ld': 120, 'pb': 74, 'bahu': 49, 'lengan': 44, 'lp': 120, 'bb': '65-92 kg'},
                'XS': {'ld': 92, 'pb': 64, 'bahu': 39, 'lengan': 20, 'lp': 90, 'bb': '40-48 kg'},
                'S': {'ld': 96, 'pb': 66, 'bahu': 41, 'lengan': 21, 'lp': 94, 'bb': '45-55 kg'},
                'M': {'ld': 102, 'pb': 68, 'bahu': 43, 'lengan': 22, 'lp': 100, 'bb': '52-62 kg'},
                'L': {'ld': 108, 'pb': 70, 'bahu': 45, 'lengan': 23, 'lp': 106, 'bb': '60-70 kg'},
                'XL': {'ld': 114, 'pb': 72, 'bahu': 47, 'lengan': 24, 'lp': 112, 'bb': '70-80 kg'},
                'XXL': {'ld': 120, 'pb': 74, 'bahu': 49, 'lengan': 25, 'lp': 120, 'bb': '80-92 kg'},
                'XXXL': {'ld': 126, 'pb': 76, 'bahu': 51, 'lengan': 26, 'lp': 126, 'bb': '90-105 kg'},
            }
            std = STANDARDS.get(size_key, STANDARDS['ALL SIZE'])

        return {
            'chest_width': self.chest_width or std['ld'],
            'body_length': self.body_length or std['pb'],
            'shoulder_width': self.shoulder_width or std['bahu'],
            'sleeve_length': self.sleeve_length or std['lengan'],
            'waist_width': self.waist_width or std['lp'],
            'bb_recommendation': std['bb'],
        }

    @property
    def measurements_display(self):
        m = self.effective_measurements
        cat_slug = self.product.category.slug.lower() if self.product and self.product.category else ''
        title_lower = self.product.title.lower() if self.product else ''
        if any(k in title_lower for k in ['kain pantai', 'hijab', 'kerudung', 'pashmina', 'segi empat']) or 'kain-pantai' in cat_slug:
            return f"Panjang: {m['body_length']} cm · Lebar: {m['chest_width']} cm"
        if 'mukena' in title_lower or 'mukena' in cat_slug:
            return f"Panjang Atasan: {m['chest_width']} cm · Panjang Rok: {m['body_length']} cm · LP: {m['waist_width']} cm"
        if any(k in cat_slug for k in ['celana', 'kulot', 'bogo', 'rok']) or any(k in title_lower for k in ['kulot', 'celana', 'bogo']):
            return f"LP (Melar): {m['waist_width']} cm · Panjang: {m['body_length']} cm"
        if 'setelan' in cat_slug or 'setelan' in title_lower:
            return f"LD: {m['chest_width']} cm · PB: {m['body_length']} cm · LP Celana: {m['waist_width']} cm"
        return f"LD: {m['chest_width']} cm · PB: {m['body_length']} cm · Bahu: {m['shoulder_width']} cm"


# ─────────────────────────────────────────
# SHIPPING RATE (ONGKOS KIRIM PER DAERAH)
# ─────────────────────────────────────────
class ShippingRate(models.Model):
    """
    Tarif ongkos kirim per provinsi / daerah.
    Bisa diedit sewaktu-waktu oleh admin di Django Admin.
    """
    province = models.CharField(
        max_length=100,
        unique=True,
        verbose_name="Provinsi / Daerah",
        help_text="Contoh: Jawa Timur, DKI Jakarta, Jawa Barat, Bali"
    )
    cost = models.DecimalField(
        max_digits=12,
        decimal_places=0,
        verbose_name="Ongkos Kirim (Rp)",
        help_text="Tarif flat dalam Rupiah"
    )
    estimated_delivery = models.CharField(
        max_length=50,
        default="2-3 Hari",
        verbose_name="Estimasi Sampai",
        help_text="Contoh: 1-2 Hari, 2-3 Hari"
    )
    is_active = models.BooleanField(
        default=True,
        db_index=True,
        verbose_name="Aktif Ditampilkan"
    )
    sort_order = models.PositiveIntegerField(
        default=0,
        db_index=True,
        verbose_name="Urutan Tampil"
    )

    class Meta:
        verbose_name = "Tarif Ongkir Daerah"
        verbose_name_plural = "Tarif Ongkir Daerah"
        ordering = ['sort_order', 'province']

    def __str__(self):
        return f"{self.province} — Rp {self.cost:,.0f} ({self.estimated_delivery})"


# ─────────────────────────────────────────
# ORDER & ORDER ITEM
# ─────────────────────────────────────────
class Order(models.Model):
    """
    Data pesanan yang dibuat oleh pembeli dari keranjang belanja.
    Stok otomatis terpotong saat pesanan dibuat, dan otomatis kembali
    jika pesanan dibatalkan oleh admin.
    """
    STATUS_CHOICES = [
        ('PENDING', 'Menunggu Pembayaran (WA)'),
        ('CONFIRMED', 'Lunas & Sedang Dikemas'),
        ('SHIPPED', 'Sedang Dikirim'),
        ('COMPLETED', 'Selesai'),
        ('CANCELLED', 'Dibatalkan (Stok Kembali)'),
    ]

    order_number = models.CharField(
        max_length=32,
        unique=True,
        verbose_name="Nomor Pesanan",
        help_text="Format otomatis: ORD-YYYYMMDD-XXXX"
    )
    customer_name = models.CharField(
        max_length=150,
        verbose_name="Nama Pembeli"
    )
    customer_phone = models.CharField(
        max_length=30,
        db_index=True,
        verbose_name="No. WhatsApp Pembeli"
    )
    shipping_province = models.CharField(
        max_length=100,
        verbose_name="Provinsi Tujuan"
    )
    shipping_city = models.CharField(
        max_length=100,
        verbose_name="Kota / Kabupaten"
    )
    shipping_district = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="Kecamatan (Opsional)"
    )
    shipping_address = models.TextField(
        verbose_name="Alamat Lengkap & Patokan"
    )
    shipping_cost = models.DecimalField(
        max_digits=12,
        decimal_places=0,
        default=0,
        verbose_name="Ongkos Kirim (Rp)"
    )
    subtotal_items = models.DecimalField(
        max_digits=12,
        decimal_places=0,
        default=0,
        verbose_name="Subtotal Baju (Rp)"
    )
    total_amount = models.DecimalField(
        max_digits=12,
        decimal_places=0,
        default=0,
        verbose_name="Total Tagihan (Rp)"
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='PENDING',
        db_index=True,
        verbose_name="Status Pesanan"
    )
    assigned_admin = models.CharField(
        max_length=50,
        blank=True,
        default='',
        verbose_name="Admin yang Ditugaskan",
        help_text="Admin WhatsApp yang ditugaskan untuk pesanan ini (misal: Admin 1 / Admin 2)"
    )
    shipping_courier = models.CharField(
        max_length=50,
        blank=True,
        default='',
        verbose_name="Nama Ekspedisi Kurir",
        help_text="Contoh: JNE, J&T Express, SiCepat, SPX, Pos Indonesia, AnterAja"
    )
    tracking_number = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="No. Resi Kurir",
        help_text="Contoh: JNE012345678, JP87654321"
    )
    tracking_receipt_image = models.ImageField(
        upload_to='receipts/%Y/%m/',
        blank=True,
        null=True,
        verbose_name="Foto Struk Resi",
        help_text="Foto bukti struk resi pengiriman dari ekspedisi"
    )
    notes = models.TextField(
        blank=True,
        verbose_name="Catatan Pesanan"
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True, verbose_name="Waktu Pesan")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Terakhir Diperbarui")

    class Meta:
        verbose_name = "Pesanan"
        verbose_name_plural = "Pesanan"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', '-created_at']),
        ]

    def __str__(self):
        return f"{self.order_number} — {self.customer_name} (Rp {self.total_amount:,.0f})"

    def save(self, *args, **kwargs):
        if self.pk:
            orig = Order.objects.filter(pk=self.pk).first()
            # If changed to CANCELLED from another status -> atomically restore stock
            if orig and orig.status != 'CANCELLED' and self.status == 'CANCELLED':
                for item in self.items.all():
                    if item.variant_id:
                        Variant.objects.filter(pk=item.variant_id).update(
                            stock_quantity=F('stock_quantity') + item.quantity
                        )
        super().save(*args, **kwargs)


class OrderItem(models.Model):
    """
    Rincian barang per pesanan.
    """
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name='items',
        verbose_name="Pesanan"
    )
    variant = models.ForeignKey(
        Variant,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='order_items',
        verbose_name="Varian Produk"
    )
    product_title = models.CharField(
        max_length=200,
        verbose_name="Nama Produk"
    )
    color = models.CharField(
        max_length=100,
        verbose_name="Warna"
    )
    size = models.CharField(
        max_length=20,
        verbose_name="Ukuran"
    )
    quantity = models.PositiveIntegerField(
        default=1,
        verbose_name="Jumlah (Qty)"
    )
    unit_price = models.DecimalField(
        max_digits=12,
        decimal_places=0,
        verbose_name="Harga Satuan (Rp)"
    )
    subtotal = models.DecimalField(
        max_digits=12,
        decimal_places=0,
        verbose_name="Subtotal (Rp)"
    )

    class Meta:
        verbose_name = "Item Pesanan"
        verbose_name_plural = "Item Pesanan"

    def __str__(self):
        return f"{self.product_title} ({self.color} - {self.size}) x {self.quantity}"

