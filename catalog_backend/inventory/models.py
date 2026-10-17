"""
Core database models for the Clothing Catalog Inventory system.

Model hierarchy:
  Category
    └── Product
          ├── ProductImage  (multiple images per product)
          └── Variant       (size + color + stock_quantity)
"""
from django.db import models
from django.utils.text import slugify


# ─────────────────────────────────────────
# CATEGORY
# ─────────────────────────────────────────
class Category(models.Model):
    """
    Top-level product category (e.g., Kemeja, Celana, Dress).
    The slug is auto-generated from name and used in URLs.
    """
    name = models.CharField(
        max_length=100,
        unique=True,
        verbose_name="Nama Kategori",
        help_text="Contoh: Kemeja, Celana, Dress, Outer"
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
    A single clothing product (e.g., "Kemeja Linen Premium Putih").
    One product can have multiple images and multiple size/color variants.
    """
    title = models.CharField(
        max_length=200,
        verbose_name="Nama Produk",
        help_text="Nama lengkap produk, misal: Kemeja Linen Premium Putih"
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
        verbose_name="Harga Dasar (Rp)",
        help_text="Harga dalam Rupiah, tanpa titik/koma pemisah ribuan"
    )
    is_active = models.BooleanField(
        default=True,
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
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Dibuat")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Diperbarui")

    class Meta:
        verbose_name = "Produk"
        verbose_name_plural = "Produk"
        ordering = ['-created_at']

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
        """Returns the primary image URL, or the first image, or None."""
        primary = self.images.filter(is_primary=True).first()
        if primary:
            return primary.effective_image_url
        first = self.images.first()
        return first.effective_image_url if first else None

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

    Example: "Kemeja Linen Premium" → Size: L, Color: Putih, Stock: 12
    """
    SIZE_CHOICES = [
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
        'XS': 0, 'S': 1, 'M': 2, 'L': 3,
        'XL': 4, 'XXL': 5, 'XXXL': 6, 'FREE_SIZE': 99
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
        verbose_name="Ukuran"
    )
    color = models.CharField(
        max_length=100,
        verbose_name="Warna",
        help_text="Nama warna, misal: Putih Susu, Navy, Sage Green"
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
        help_text="Opsional untuk celana/rok, misal: 68, 72, 76"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Varian"
        verbose_name_plural = "Varian"
        # Each product can only have one variant per size+color combo
        unique_together = [['product', 'size', 'color']]
        ordering = ['color', 'size']

    def save(self, *args, **kwargs):
        # Auto-generate SKU if not provided
        if not self.sku:
            product_code = self.product.slug[:8].upper().replace('-', '')
            self.sku = f"{product_code}-{self.size}-{self.color[:3].upper()}"
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
        elif self.stock_quantity <= 3:
            return "Sisa Sedikit"
        return "Tersedia"

    @property
    def effective_measurements(self):
        STANDARDS = {
            'XS': {'ld': 92, 'pb': 68, 'bahu': 40, 'lengan': 56, 'lp': 64, 'bb': '40-48 kg'},
            'S': {'ld': 96, 'pb': 70, 'bahu': 42, 'lengan': 57, 'lp': 68, 'bb': '48-55 kg'},
            'M': {'ld': 100, 'pb': 72, 'bahu': 44, 'lengan': 58, 'lp': 72, 'bb': '55-65 kg'},
            'L': {'ld': 106, 'pb': 74, 'bahu': 46, 'lengan': 59, 'lp': 78, 'bb': '65-75 kg'},
            'XL': {'ld': 112, 'pb': 76, 'bahu': 48, 'lengan': 60, 'lp': 84, 'bb': '75-85 kg'},
            'XXL': {'ld': 118, 'pb': 78, 'bahu': 50, 'lengan': 61, 'lp': 90, 'bb': '85-95 kg'},
            'XXXL': {'ld': 124, 'pb': 80, 'bahu': 52, 'lengan': 62, 'lp': 96, 'bb': '95-105 kg'},
            'FREE_SIZE': {'ld': 104, 'pb': 73, 'bahu': 45, 'lengan': 58, 'lp': 74, 'bb': 'All Size'},
        }
        std = STANDARDS.get(self.size, STANDARDS['M'])
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
        cat_slug = self.product.category.slug if self.product and self.product.category else ''
        if 'celana' in cat_slug or 'rok' in cat_slug:
            return f"LP: {m['waist_width']} cm · Panjang: {m['body_length']} cm"
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
        verbose_name="Aktif Ditampilkan"
    )
    sort_order = models.PositiveIntegerField(
        default=0,
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
        verbose_name="Status Pesanan"
    )
    tracking_number = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="No. Resi Kurir",
        help_text="Contoh: JNE012345678, JP87654321"
    )
    notes = models.TextField(
        blank=True,
        verbose_name="Catatan Pesanan"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Waktu Pesan")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Terakhir Diperbarui")

    class Meta:
        verbose_name = "Pesanan"
        verbose_name_plural = "Pesanan"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.order_number} — {self.customer_name} (Rp {self.total_amount:,.0f})"

    def save(self, *args, **kwargs):
        if self.pk:
            orig = Order.objects.filter(pk=self.pk).first()
            # If changed to CANCELLED from another status -> restore stock
            if orig and orig.status != 'CANCELLED' and self.status == 'CANCELLED':
                for item in self.items.all():
                    if item.variant:
                        item.variant.stock_quantity += item.quantity
                        item.variant.save(update_fields=['stock_quantity'])
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

