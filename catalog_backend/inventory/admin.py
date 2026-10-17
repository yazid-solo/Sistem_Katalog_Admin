"""
Django Admin configuration for the Inventory app.

Key feature: Variant is editable as a TabularInline inside the Product admin page,
giving the admin a spreadsheet-like interface to update stock quantities quickly.
"""
from django.contrib import admin
from django.utils.html import format_html
from django.db import transaction
from django.db.models import Sum
from .models import Category, Product, ProductImage, Variant, ShippingRate, Order, OrderItem


# ─────────────────────────────────────────
# INLINES
# ─────────────────────────────────────────
class VariantInline(admin.TabularInline):
    """
    Embeds variant rows inside the Product edit page.
    Admin can update all sizes/colors/stock from a single spreadsheet-like view.
    """
    model = Variant
    extra = 3  # Show 3 empty rows for quick addition
    fields = ('size', 'color', 'stock_quantity', 'chest_width', 'body_length', 'shoulder_width', 'sleeve_length', 'sku')
    readonly_fields = ()
    show_change_link = False

    def get_queryset(self, request):
        return super().get_queryset(request).order_by('color', 'size')


class ProductImageInline(admin.TabularInline):
    """
    Embeds product image rows inside the Product edit page.
    """
    model = ProductImage
    extra = 2
    fields = ('image_file', 'image_url', 'color', 'alt_text', 'is_primary', 'sort_order', 'preview_thumbnail')
    readonly_fields = ('preview_thumbnail',)

    def preview_thumbnail(self, obj):
        url = obj.effective_image_url
        if url:
            return format_html(
                '<img src="{}" style="height: 60px; width: 48px; object-fit: cover; '
                'border-radius: 4px; border: 1px solid #e5e7eb;" />',
                url
            )
        return "—"
    preview_thumbnail.short_description = "Preview"


# ─────────────────────────────────────────
# CATEGORY ADMIN
# ─────────────────────────────────────────
@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'product_count', 'created_at')
    prepopulated_fields = {'slug': ('name',)}
    search_fields = ('name',)
    ordering = ('name',)

    def product_count(self, obj):
        count = obj.products.filter(is_active=True).count()
        return format_html('<strong>{}</strong> produk aktif', count)
    product_count.short_description = "Jumlah Produk"


# ─────────────────────────────────────────
# PRODUCT ADMIN
# ─────────────────────────────────────────
@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    """
    Main product admin with inline variant editor.
    This is the core tool for the shop admin to manage inventory.
    """
    list_display = (
        'title', 'category', 'formatted_price',
        'stock_status_badge', 'total_stock_display',
        'is_active', 'updated_at'
    )
    list_filter = ('is_active', 'category', 'created_at')
    search_fields = ('title', 'description', 'slug')
    prepopulated_fields = {'slug': ('title',)}
    list_editable = ('is_active',)
    list_per_page = 25
    date_hierarchy = 'created_at'
    ordering = ('-created_at',)

    # Inline editors — The killer feature for stock management
    inlines = [ProductImageInline, VariantInline]

    fieldsets = (
        ('Informasi Dasar', {
            'fields': ('title', 'slug', 'category', 'description')
        }),
        ('Harga & Status', {
            'fields': ('base_price', 'is_active'),
        }),
        ('Panduan Ukuran (Opsional)', {
            'fields': ('size_guide',),
            'classes': ('collapse',),
            'description': 'Tuliskan catatan ukuran khusus jika ada (misal: "Model tinggi 170cm pakai size S")'
        }),
    )

    def formatted_price(self, obj):
        """Display price in Indonesian Rupiah format."""
        price = f"Rp {obj.base_price:,.0f}".replace(',', '.')
        return price
    formatted_price.short_description = "Harga"
    formatted_price.admin_order_field = 'base_price'

    def total_stock_display(self, obj):
        """Display total stock with color coding."""
        total = obj.variants.aggregate(total=Sum('stock_quantity'))['total'] or 0
        if total == 0:
            color = '#dc2626'  # red
            bg = '#fef2f2'
        elif total <= 5:
            color = '#d97706'  # amber
            bg = '#fffbeb'
        else:
            color = '#16a34a'  # green
            bg = '#f0fdf4'

        return format_html(
            '<span style="background:{bg}; color:{color}; padding: 2px 8px; '
            'border-radius: 4px; font-weight: 600; font-size: 12px;">{total} pcs</span>',
            bg=bg, color=color, total=total
        )
    total_stock_display.short_description = "Total Stok"

    def stock_status_badge(self, obj):
        """Display stock status as a colored badge."""
        total = obj.variants.aggregate(total=Sum('stock_quantity'))['total'] or 0
        if total == 0:
            label, color, bg = "HABIS", "#dc2626", "#fef2f2"
        elif total <= 5:
            label, color, bg = "HAMPIR HABIS", "#d97706", "#fffbeb"
        else:
            label, color, bg = "TERSEDIA", "#16a34a", "#f0fdf4"

        return format_html(
            '<span style="background:{bg}; color:{color}; padding: 2px 8px; '
            'border-radius: 999px; font-weight: 700; font-size: 11px; '
            'letter-spacing: 0.05em;">{label}</span>',
            bg=bg, color=color, label=label
        )
    stock_status_badge.short_description = "Status"

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.prefetch_related('variants', 'images').select_related('category')


# ─────────────────────────────────────────
# VARIANT ADMIN (Standalone view)
# ─────────────────────────────────────────
@admin.register(Variant)
class VariantAdmin(admin.ModelAdmin):
    """
    Standalone variant list — useful for quick stock overview.
    Admin can filter by "Habis" to see what needs restocking.
    """
    list_display = (
        'product', 'size', 'color', 'sku',
        'stock_quantity', 'is_available', 'updated_at'
    )
    list_filter = ('size', 'color', 'product__category', 'product__is_active')
    search_fields = ('product__title', 'color', 'sku')
    list_editable = ('stock_quantity',)
    ordering = ('product__title', 'color', 'size')
    list_per_page = 50

    # Custom filter to quickly find empty stock
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('product', 'product__category')

    def stock_quantity_display(self, obj):
        """Color-code the stock quantity."""
        q = obj.stock_quantity
        if q == 0:
            color, bg = '#dc2626', '#fef2f2'
        elif q <= 3:
            color, bg = '#d97706', '#fffbeb'
        else:
            color, bg = '#374151', '#f9fafb'

        return format_html(
            '<span style="background:{bg}; color:{color}; padding: 2px 10px; '
            'border-radius: 4px; font-weight: 600;">{q}</span>',
            bg=bg, color=color, q=q
        )
    stock_quantity_display.short_description = "Stok"
    stock_quantity_display.admin_order_field = 'stock_quantity'

    def is_available(self, obj):
        if obj.stock_quantity > 0:
            return format_html('✅')
        return format_html('❌')
    is_available.short_description = "Tersedia"
    is_available.boolean = False  # Use custom HTML instead of Django's boolean icons


# ─────────────────────────────────────────
# PRODUCT IMAGE ADMIN (Standalone)
# ─────────────────────────────────────────
@admin.register(ProductImage)
class ProductImageAdmin(admin.ModelAdmin):
    list_display = ('product', 'preview_thumbnail', 'is_primary', 'sort_order')
    list_filter = ('is_primary', 'product__category')
    search_fields = ('product__title',)
    list_editable = ('is_primary', 'sort_order')
    ordering = ('product', 'sort_order')

    def preview_thumbnail(self, obj):
        url = obj.effective_image_url
        if url:
            return format_html(
                '<img src="{}" style="height: 60px; width: 48px; object-fit: cover; '
                'border-radius: 4px;" />',
                url
            )
        return "—"
    preview_thumbnail.short_description = "Preview"


# ─────────────────────────────────────────
# SHIPPING RATE ADMIN
# ─────────────────────────────────────────
@admin.register(ShippingRate)
class ShippingRateAdmin(admin.ModelAdmin):
    list_display = ('province', 'formatted_cost', 'estimated_delivery', 'is_active', 'sort_order')
    list_editable = ('is_active', 'sort_order')
    search_fields = ('province',)
    ordering = ('sort_order', 'province')

    def formatted_cost(self, obj):
        return f"Rp {obj.cost:,.0f}".replace(',', '.')
    formatted_cost.short_description = "Ongkos Kirim"


# ─────────────────────────────────────────
# ORDER ITEM INLINE
# ─────────────────────────────────────────
class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    fields = ('product_title', 'color', 'size', 'quantity', 'unit_price', 'subtotal')
    readonly_fields = ('product_title', 'color', 'size', 'quantity', 'unit_price', 'subtotal')
    can_delete = False


# ─────────────────────────────────────────
# ORDER ADMIN
# ─────────────────────────────────────────
@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    """
    Panel pengelolaan pesanan masuk dari WhatsApp.
    Admin bisa memverifikasi pembayaran, memasukkan nomor resi,
    atau membatalkan pesanan (stok otomatis kembali).
    """
    list_display = (
        'order_number', 'customer_name', 'customer_phone',
        'shipping_province', 'formatted_total', 'status_badge',
        'tracking_number', 'created_at'
    )
    list_filter = ('status', 'shipping_province', 'created_at')
    search_fields = ('order_number', 'customer_name', 'customer_phone', 'tracking_number')
    list_editable = ('tracking_number',)
    ordering = ('-created_at',)
    inlines = [OrderItemInline]
    readonly_fields = (
        'order_number', 'customer_name', 'customer_phone',
        'shipping_province', 'shipping_city', 'shipping_district',
        'shipping_address', 'shipping_cost', 'subtotal_items',
        'total_amount', 'created_at', 'updated_at'
    )
    actions = ['mark_as_confirmed', 'mark_as_shipped', 'cancel_and_restore_stock']

    fieldsets = (
        ('Informasi Pesanan', {
            'fields': ('order_number', 'status', 'tracking_number', 'created_at', 'updated_at')
        }),
        ('Data Pembeli', {
            'fields': ('customer_name', 'customer_phone', 'notes')
        }),
        ('Alamat Pengiriman', {
            'fields': ('shipping_address', 'shipping_district', 'shipping_city', 'shipping_province')
        }),
        ('Rincian Pembayaran', {
            'fields': ('subtotal_items', 'shipping_cost', 'total_amount')
        }),
    )

    def formatted_total(self, obj):
        return f"Rp {obj.total_amount:,.0f}".replace(',', '.')
    formatted_total.short_description = "Total Tagihan"

    def status_badge(self, obj):
        colors = {
            'PENDING': ('#92400e', '#fef3c7', 'Menunggu WA'),
            'CONFIRMED': ('#1e40af', '#dbeafe', 'Lunas / Dikemas'),
            'SHIPPED': ('#6b21a8', '#f3e8ff', 'Sedang Dikirim'),
            'COMPLETED': ('#166534', '#dcfce7', 'Selesai'),
            'CANCELLED': ('#991b1b', '#fee2e2', 'Dibatalkan (Stok Kembali)'),
        }
        color, bg, label = colors.get(obj.status, ('#374151', '#f3f4f6', obj.status))
        return format_html(
            '<span style="background:{}; color:{}; padding: 3px 10px; border-radius: 999px; '
            'font-weight: 700; font-size: 11px;">{}</span>',
            bg, color, label
        )
    status_badge.short_description = "Status Pesanan"

    def save_model(self, request, obj, form, change):
        if change:
            orig = Order.objects.get(pk=obj.pk)
            # If changing to CANCELLED from another status -> restore stock
            if obj.status == 'CANCELLED' and orig.status != 'CANCELLED':
                with transaction.atomic():
                    for item in obj.items.all():
                        if item.variant:
                            item.variant.stock_quantity += item.quantity
                            item.variant.save(update_fields=['stock_quantity'])
            # If un-cancelling -> deduct stock again if available
            elif orig.status == 'CANCELLED' and obj.status != 'CANCELLED':
                with transaction.atomic():
                    for item in obj.items.all():
                        if item.variant:
                            if item.variant.stock_quantity >= item.quantity:
                                item.variant.stock_quantity -= item.quantity
                                item.variant.save(update_fields=['stock_quantity'])
        super().save_model(request, obj, form, change)

    @admin.action(description="Tandai Pesanan: Lunas & Sedang Dikemas")
    def mark_as_confirmed(self, request, queryset):
        queryset.update(status='CONFIRMED')
        self.message_user(request, "Pesanan terpilih berhasil ditandai Lunas & Sedang Dikemas.")

    @admin.action(description="Tandai Pesanan: Sedang Dikirim")
    def mark_as_shipped(self, request, queryset):
        queryset.update(status='SHIPPED')
        self.message_user(request, "Pesanan terpilih berhasil ditandai Sedang Dikirim.")

    @admin.action(description="Batalkan Pesanan & Kembalikan Stok Otomatis")
    def cancel_and_restore_stock(self, request, queryset):
        restored_count = 0
        with transaction.atomic():
            for order in queryset.exclude(status='CANCELLED'):
                for item in order.items.all():
                    if item.variant:
                        item.variant.stock_quantity += item.quantity
                        item.variant.save(update_fields=['stock_quantity'])
                order.status = 'CANCELLED'
                order.save(update_fields=['status'])
                restored_count += 1
        self.message_user(request, f"{restored_count} pesanan dibatalkan dan stok produk otomatis dikembalikan.")
