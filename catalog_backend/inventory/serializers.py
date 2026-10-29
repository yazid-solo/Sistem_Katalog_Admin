"""
DRF Serializers for the Inventory app.

Hierarchy:
  ProductListSerializer  — lightweight, for the catalog grid
  ProductDetailSerializer — full detail with nested variants and images
"""
from rest_framework import serializers
from .models import Category, Product, ProductImage, Variant, ShippingRate, Order, OrderItem


# ─────────────────────────────────────────
# CATEGORY
# ─────────────────────────────────────────
class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'slug']


# ─────────────────────────────────────────
# PRODUCT IMAGE
# ─────────────────────────────────────────
class ProductImageSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = ProductImage
        fields = ['id', 'image_file', 'image_url', 'color', 'alt_text', 'is_primary', 'sort_order']

    def get_image_url(self, obj):
        return obj.effective_image_url


# ─────────────────────────────────────────
# VARIANT
# ─────────────────────────────────────────
class VariantSerializer(serializers.ModelSerializer):
    availability_label = serializers.ReadOnlyField()
    is_available = serializers.ReadOnlyField()
    measurements = serializers.SerializerMethodField()
    measurements_display = serializers.ReadOnlyField()

    class Meta:
        model = Variant
        fields = [
            'id', 'size', 'color', 'sku',
            'stock_quantity', 'is_available', 'availability_label',
            'chest_width', 'body_length', 'shoulder_width', 'sleeve_length', 'waist_width',
            'measurements', 'measurements_display'
        ]

    def get_measurements(self, obj):
        return obj.effective_measurements


# ─────────────────────────────────────────
# PRODUCT — List (Catalog Grid)
# ─────────────────────────────────────────
class ProductListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for catalog grid view.
    Returns only the data needed to render a product card.
    """
    category = CategorySerializer(read_only=True)
    primary_image = serializers.ReadOnlyField()
    total_stock = serializers.ReadOnlyField()
    stock_status = serializers.ReadOnlyField()
    available_sizes = serializers.SerializerMethodField()
    formatted_price = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id', 'title', 'slug', 'category',
            'base_price', 'formatted_price',
            'primary_image', 'total_stock', 'stock_status',
            'available_sizes', 'is_active'
        ]

    def get_available_sizes(self, obj):
        """Return list of sizes with their availability."""
        SIZE_ORDER = ['ALL SIZE', 'STANDAR', 'JUMBO', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'FREE_SIZE']
        variants = obj.variants.all()
        sizes_map = {}
        for v in variants:
            if v.size not in sizes_map:
                sizes_map[v.size] = {'size': v.size, 'available': False}
            if v.stock_quantity > 0:
                sizes_map[v.size]['available'] = True
        return sorted(
            sizes_map.values(),
            key=lambda x: SIZE_ORDER.index(x['size']) if x['size'] in SIZE_ORDER else 99
        )

    def get_formatted_price(self, obj):
        """Return price formatted in Indonesian Rupiah."""
        price = int(obj.base_price)
        return f"Rp {price:,}".replace(',', '.')


# ─────────────────────────────────────────
# PRODUCT — Detail (Product Page)
# ─────────────────────────────────────────
class ProductDetailSerializer(serializers.ModelSerializer):
    """
    Full serializer with nested images and variants.
    Used for the product detail page.
    """
    category = CategorySerializer(read_only=True)
    images = ProductImageSerializer(many=True, read_only=True)
    variants = serializers.SerializerMethodField()
    primary_image = serializers.ReadOnlyField()
    total_stock = serializers.ReadOnlyField()
    stock_status = serializers.ReadOnlyField()
    formatted_price = serializers.SerializerMethodField()
    # Group variants by color for the frontend selector
    variants_by_color = serializers.SerializerMethodField()
    size_chart = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id', 'title', 'slug', 'description',
            'category', 'base_price', 'formatted_price',
            'primary_image', 'total_stock', 'stock_status',
            'images', 'variants', 'variants_by_color', 'size_guide', 'size_chart',
            'is_active', 'created_at', 'updated_at'
        ]

    def get_variants(self, obj):
        SIZE_ORDER = ['ALL SIZE', 'STANDAR', 'JUMBO', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'FREE_SIZE']
        ordered = sorted(
            obj.variants.all(),
            key=lambda v: (v.color, SIZE_ORDER.index(v.size) if v.size in SIZE_ORDER else 99)
        )
        return VariantSerializer(ordered, many=True).data

    def get_formatted_price(self, obj):
        price = int(obj.base_price)
        return f"Rp {price:,}".replace(',', '.')

    def get_size_chart(self, obj):
        """Return standardized size chart table for all available sizes."""
        SIZE_ORDER = ['ALL SIZE', 'STANDAR', 'JUMBO', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'FREE_SIZE']
        chart = []
        variants = obj.variants.all()
        distinct_sizes = []
        for s in SIZE_ORDER:
            matching = [v for v in variants if v.size == s]
            if matching:
                distinct_sizes.append(matching[0])

        if not distinct_sizes:
            # Fallback standard sizes
            from .models import Variant
            temp_variant = Variant(product=obj)
            for s in ['ALL SIZE', 'STANDAR', 'JUMBO', 'S', 'M', 'L', 'XL', 'XXL']:
                temp_variant.size = s
                chart.append({'size': s, **temp_variant.effective_measurements})
            return chart

        for v in distinct_sizes:
            chart.append({'size': v.size, **v.effective_measurements})
        return chart

    def get_variants_by_color(self, obj):
        """
        Groups variants by color, then lists all sizes with their stock.
        This powers the color-then-size selector on the frontend.

        Example output:
        [
          {
            "color": "Putih Susu",
            "sizes": [
              {"size": "S", "stock_quantity": 5, "is_available": true},
              {"size": "M", "stock_quantity": 0, "is_available": false},
            ]
          },
          ...
        ]
        """
        SIZE_ORDER = ['ALL SIZE', 'STANDAR', 'JUMBO', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'FREE_SIZE']
        color_map = {}

        for variant in obj.variants.all():
            if variant.color not in color_map:
                color_map[variant.color] = {}
            color_map[variant.color][variant.size] = {
                'id': variant.id,
                'size': variant.size,
                'sku': variant.sku,
                'stock_quantity': variant.stock_quantity,
                'is_available': variant.is_available,
                'availability_label': variant.availability_label,
                'measurements': variant.effective_measurements,
                'measurements_display': variant.measurements_display,
            }

        result = []
        for color, sizes_dict in color_map.items():
            ordered_sizes = sorted(
                sizes_dict.values(),
                key=lambda x: SIZE_ORDER.index(x['size']) if x['size'] in SIZE_ORDER else 99
            )
            all_images = list(obj.images.all())
            # Find an image that matches this color
            matching_img = next((img for img in all_images if img.color and img.color.strip().lower() == color.strip().lower()), None)
            if not matching_img:
                matching_img = next((img for img in all_images if img.is_primary), None) or (all_images[0] if all_images else None)
            color_image = matching_img.effective_image_url if matching_img else None

            result.append({
                'color': color,
                'color_image': color_image,
                'sizes': ordered_sizes
            })

        return result


# ─────────────────────────────────────────
# PRODUCT — Admin / Seller View
# ─────────────────────────────────────────
class ProductAdminSerializer(serializers.ModelSerializer):
    """
    Detailed serializer for admin/seller dashboard.
    Includes full variants, images, category, and formatted price.
    """
    category = CategorySerializer(read_only=True)
    images = ProductImageSerializer(many=True, read_only=True)
    variants = serializers.SerializerMethodField()
    variants_by_color = serializers.SerializerMethodField()
    primary_image = serializers.ReadOnlyField()
    total_stock = serializers.ReadOnlyField()
    stock_status = serializers.ReadOnlyField()
    formatted_price = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id', 'title', 'slug', 'description', 'size_guide',
            'category', 'base_price', 'formatted_price',
            'primary_image', 'total_stock', 'stock_status',
            'images', 'variants', 'variants_by_color',
            'is_active', 'created_at', 'updated_at'
        ]

    def get_variants(self, obj):
        SIZE_ORDER = ['ALL SIZE', 'STANDAR', 'JUMBO', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'FREE_SIZE']
        ordered = sorted(
            obj.variants.all(),
            key=lambda v: (v.color, SIZE_ORDER.index(v.size) if v.size in SIZE_ORDER else 99)
        )
        return VariantSerializer(ordered, many=True).data

    def get_formatted_price(self, obj):
        price = int(obj.base_price)
        return f"Rp {price:,}".replace(',', '.')

    def get_variants_by_color(self, obj):
        SIZE_ORDER = ['ALL SIZE', 'STANDAR', 'JUMBO', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'FREE_SIZE']
        colors_map = {}
        for v in obj.variants.all():
            if v.color not in colors_map:
                colors_map[v.color] = []
            colors_map[v.color].append({
                'id': v.id,
                'size': v.size,
                'stock_quantity': v.stock_quantity,
                'is_available': v.is_available,
            })

        all_images = list(obj.images.all())
        result = []
        for color, sizes in colors_map.items():
            ordered_sizes = sorted(
                sizes,
                key=lambda x: SIZE_ORDER.index(x['size']) if x['size'] in SIZE_ORDER else 99
            )
            matching_img = next((img for img in all_images if img.color and img.color.strip().lower() == color.strip().lower()), None)
            img_url = matching_img.effective_image_url if matching_img else None
            result.append({
                'color': color,
                'color_image': img_url,
                'image_id': matching_img.id if matching_img else None,
                'is_primary': matching_img.is_primary if matching_img else False,
                'sizes': ordered_sizes,
            })
        return result


# ─────────────────────────────────────────
# SHIPPING RATE SERIALIZER
# ─────────────────────────────────────────
class ShippingRateSerializer(serializers.ModelSerializer):
    formatted_cost = serializers.SerializerMethodField()

    class Meta:
        model = ShippingRate
        fields = ['id', 'province', 'cost', 'formatted_cost', 'estimated_delivery', 'sort_order']

    def get_formatted_cost(self, obj):
        return f"Rp {obj.cost:,.0f}".replace(',', '.')


# ─────────────────────────────────────────
# ORDER & CHECKOUT SERIALIZERS
# ─────────────────────────────────────────
class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = [
            'id', 'variant', 'product_title', 'color', 'size',
            'quantity', 'unit_price', 'subtotal'
        ]


class OrderDetailSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    tracking_receipt_url = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            'id', 'order_number', 'customer_name', 'customer_phone',
            'shipping_province', 'shipping_city', 'shipping_district',
            'shipping_address', 'shipping_cost', 'subtotal_items',
            'total_amount', 'status', 'assigned_admin', 'shipping_courier', 'tracking_number',
            'tracking_receipt_url', 'notes', 'created_at', 'items'
        ]

    def get_tracking_receipt_url(self, obj):
        if obj.tracking_receipt_image:
            try:
                return obj.tracking_receipt_image.url
            except Exception:
                return None
        return None


class OrderItemInputSerializer(serializers.Serializer):
    variant_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1)


class CheckoutSerializer(serializers.Serializer):
    customer_name = serializers.CharField(max_length=150)
    customer_phone = serializers.CharField(max_length=30)
    shipping_province = serializers.CharField(max_length=100)
    shipping_city = serializers.CharField(max_length=100)
    shipping_district = serializers.CharField(max_length=100, required=False, allow_blank=True)
    shipping_address = serializers.CharField()
    notes = serializers.CharField(required=False, allow_blank=True)
    items = OrderItemInputSerializer(many=True)
