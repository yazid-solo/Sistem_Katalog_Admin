"""
API Views for the Inventory app.

Endpoints:
  GET /api/products/          — paginated catalog list with filtering
  GET /api/products/<slug>/   — full product detail with variants
  GET /api/categories/        — list of all categories
"""
import os
import json
import uuid
import urllib.parse
from django.contrib.auth import authenticate
from django.contrib.auth.models import AnonymousUser
from django.db import transaction
from django.db.models import Sum, Count, Q
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import generics, filters, status, exceptions
from rest_framework.authentication import BaseAuthentication
from rest_framework.permissions import BasePermission, AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from .models import Category, Product, ProductImage, Variant, ShippingRate, Order, OrderItem
from .serializers import (
    CategorySerializer,
    ProductListSerializer,
    ProductDetailSerializer,
    ProductAdminSerializer,
    ProductImageSerializer,
    ShippingRateSerializer,
    OrderDetailSerializer,
    CheckoutSerializer,
)
import django_filters


# ─────────────────────────────────────────
# SELLER AUTHENTICATION & PERMISSIONS
# ─────────────────────────────────────────
class SellerAuthentication(BaseAuthentication):
    """
    Validates Authorization: Bearer <token> for Seller Center.
    Accepts tokens starting with 'seller_auth_' or active Django staff sessions.
    Token expires automatically if older than 24 hours (86400 seconds).
    """
    SELLER_TOKEN_MAX_AGE = 24 * 3600  # 24 jam dalam detik

    def authenticate(self, request):
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        token = ''
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1].strip()
        elif request.GET.get('token'):
            token = request.GET.get('token', '').strip()

        if token.startswith('seller_auth_'):
            # Validate 24-hour expiration based on embedded timestamp
            parts = token.split('_')
            try:
                token_time = int(parts[-1])
                current_time = int(timezone.now().timestamp())
                if current_time - token_time > self.SELLER_TOKEN_MAX_AGE:
                    raise exceptions.AuthenticationFailed('Sesi Anda telah kedaluwarsa setelah 24 jam. Silakan login kembali.')
            except (ValueError, IndexError):
                raise exceptions.AuthenticationFailed('Token otentikasi tidak valid.')

            return (AnonymousUser(), token)

        # Access underlying request._request to avoid DRF lazy auth recursion
        underlying = getattr(request, '_request', request)
        user = getattr(underlying, 'user', None)
        if user and user.is_authenticated and user.is_staff:
            return (user, None)

        return None


class IsSellerAuthenticated(BasePermission):
    """
    Ensures that only authenticated sellers or staff can access management endpoints.
    """
    def has_permission(self, request, view):
        if getattr(request, 'auth', None) and isinstance(request.auth, str) and request.auth.startswith('seller_auth_'):
            return True
        underlying = getattr(request, '_request', request)
        user = getattr(underlying, 'user', None)
        if user and user.is_authenticated and user.is_staff:
            return True
        return False


# ─────────────────────────────────────────
# FILTERS
# ─────────────────────────────────────────
class ProductFilter(django_filters.FilterSet):
    """
    Advanced filtering for the catalog.
    Supports: category, price range, availability.
    """
    category = django_filters.CharFilter(field_name='category__slug', lookup_expr='exact')
    min_price = django_filters.NumberFilter(field_name='base_price', lookup_expr='gte')
    max_price = django_filters.NumberFilter(field_name='base_price', lookup_expr='lte')
    has_size = django_filters.CharFilter(method='filter_by_available_size')

    class Meta:
        model = Product
        fields = ['category', 'min_price', 'max_price', 'has_size']

    def filter_by_available_size(self, queryset, name, value):
        """
        Filter: /api/products/?has_size=L
        Returns only products that have stock > 0 for the given size.
        """
        return queryset.filter(
            variants__size=value.upper(),
            variants__stock_quantity__gt=0
        ).distinct()


# ─────────────────────────────────────────
# CATEGORY LIST
# ─────────────────────────────────────────
class CategoryListView(generics.ListAPIView):
    """
    GET /api/categories/
    Returns all product categories.
    """
    queryset = Category.objects.all().order_by('name')
    serializer_class = CategorySerializer
    pagination_class = None  # Return all categories without pagination


# ─────────────────────────────────────────
# PRODUCT LIST
# ─────────────────────────────────────────
class ProductListView(generics.ListAPIView):
    """
    GET /api/products/
    Returns paginated product catalog list.

    Query params:
      ?category=<slug>        — filter by category slug
      ?min_price=<int>        — filter by minimum price
      ?max_price=<int>        — filter by maximum price
      ?has_size=<size>        — filter products with stock for given size (S/M/L/XL)
      ?search=<query>         — search in title and description
      ?ordering=<field>       — order by: base_price, -base_price, created_at, -created_at
      ?page=<int>             — pagination
    """
    serializer_class = ProductListSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = ProductFilter
    search_fields = ['title', 'description', 'category__name']
    ordering_fields = ['base_price', 'created_at', 'title']
    ordering = ['-created_at']

    def get_queryset(self):
        return (
            Product.objects
            .filter(is_active=True)
            .select_related('category')
            .prefetch_related('variants', 'images')
        )


# ─────────────────────────────────────────
# PRODUCT DETAIL
# ─────────────────────────────────────────
class ProductDetailView(generics.RetrieveAPIView):
    """
    GET /api/products/<slug>/
    Returns full product detail with nested variants and images.
    """
    serializer_class = ProductDetailSerializer
    lookup_field = 'slug'

    def get_queryset(self):
        return (
            Product.objects
            .filter(is_active=True)
            .select_related('category')
            .prefetch_related('variants', 'images')
        )


# ─────────────────────────────────────────
# STOCK STATUS (for real-time checks)
# ─────────────────────────────────────────
class StockCheckView(APIView):
    """
    GET /api/products/<slug>/stock/
    Returns lightweight stock info for a specific product.
    Used for quick stock checks without loading the full product detail.
    """
    def get(self, request, slug):
        try:
            product = Product.objects.prefetch_related('variants').get(
                slug=slug, is_active=True
            )
        except Product.DoesNotExist:
            return Response({'error': 'Produk tidak ditemukan'}, status=404)

        variants_data = [
            {
                'id': v.id,
                'size': v.size,
                'color': v.color,
                'stock_quantity': v.stock_quantity,
                'is_available': v.is_available,
                'availability_label': v.availability_label,
            }
            for v in product.variants.all()
        ]

        return Response({
            'product_id': product.id,
            'slug': product.slug,
            'total_stock': product.total_stock,
            'stock_status': product.stock_status,
            'variants': variants_data,
        })


# ─────────────────────────────────────────
# SHIPPING RATES LIST
# ─────────────────────────────────────────
class ShippingRateListView(generics.ListAPIView):
    """
    GET /api/shipping-rates/
    Daftar ongkir per provinsi / daerah untuk pilihan checkout.
    """
    queryset = ShippingRate.objects.filter(is_active=True).order_by('sort_order', 'province')
    serializer_class = ShippingRateSerializer
    pagination_class = None


# ─────────────────────────────────────────
# CHECKOUT VIEW (AUTO DEDUCT STOCK + WA LINK)
# ─────────────────────────────────────────
@method_decorator(csrf_exempt, name='dispatch')
class CheckoutView(APIView):
    """
    POST /api/orders/checkout/
    Memproses pemesanan dari keranjang belanja:
    1. Validasi ketersediaan stok
    2. Potong stok otomatis di database
    3. Simpan data pesanan (Order & OrderItems)
    4. Buat pesan WhatsApp terstruktur & link wa.me
    """
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'checkout'

    def post(self, request):
        serializer = CheckoutSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        items_data = data['items']

        if not items_data:
            return Response({'error': 'Keranjang belanja masih kosong.'}, status=status.HTTP_400_BAD_REQUEST)

        # 1. Fetch & lock variants to prevent race conditions
        variant_ids = [item['variant_id'] for item in items_data]
        qty_map = {item['variant_id']: item['quantity'] for item in items_data}

        with transaction.atomic():
            variants = list(
                Variant.objects.select_for_update()
                .select_related('product')
                .filter(id__in=variant_ids)
            )

            if len(variants) != len(variant_ids):
                return Response(
                    {'error': 'Sebagian produk dalam keranjang tidak ditemukan.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # 2. Check stock for every item
            insufficient_stock_errors = []
            for v in variants:
                requested_qty = qty_map[v.id]
                if v.stock_quantity < requested_qty:
                    insufficient_stock_errors.append(
                        f"Stok '{v.product.title}' ({v.color} - {v.size}) hanya tersisa {v.stock_quantity} pcs (diminta {requested_qty} pcs)."
                    )

            if insufficient_stock_errors:
                return Response(
                    {'error': ' '.join(insufficient_stock_errors)},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # 3. Calculate shipping cost
            shipping_rate = ShippingRate.objects.filter(
                province__iexact=data['shipping_province'].strip(),
                is_active=True
            ).first()

            if shipping_rate:
                shipping_cost = shipping_rate.cost
                est_delivery = shipping_rate.estimated_delivery
            else:
                shipping_cost = 15000
                est_delivery = "2-3 Hari"

            # 4. Generate unique order number
            today_str = timezone.now().strftime('%Y%m%d')
            rand_code = uuid.uuid4().hex[:5].upper()
            order_number = f"ORD-{today_str}-{rand_code}"

            subtotal_items = 0
            order_items_to_create = []

            # Deduct stock and prepare OrderItems
            for v in variants:
                qty = qty_map[v.id]
                unit_price = v.product.base_price
                line_total = unit_price * qty
                subtotal_items += line_total

                # Deduct stock
                v.stock_quantity -= qty
                v.save(update_fields=['stock_quantity'])

                order_items_to_create.append(
                    OrderItem(
                        variant=v,
                        product_title=v.product.title,
                        color=v.color,
                        size=v.size,
                        quantity=qty,
                        unit_price=unit_price,
                        subtotal=line_total,
                    )
                )

            total_amount = subtotal_items + shipping_cost

            # 5. Create Order
            order = Order.objects.create(
                order_number=order_number,
                customer_name=data['customer_name'].strip(),
                customer_phone=data['customer_phone'].strip(),
                shipping_province=data['shipping_province'].strip(),
                shipping_city=data['shipping_city'].strip(),
                shipping_district=data.get('shipping_district', '').strip(),
                shipping_address=data['shipping_address'].strip(),
                shipping_cost=shipping_cost,
                subtotal_items=subtotal_items,
                total_amount=total_amount,
                notes=data.get('notes', '').strip(),
                status='PENDING',
            )

            for oi in order_items_to_create:
                oi.order = order
            OrderItem.objects.bulk_create(order_items_to_create)

        # 6. Generate formatted WhatsApp message
        items_lines = []
        for idx, item in enumerate(order_items_to_create, 1):
            items_lines.append(
                f"{idx}. *{item.product_title}*\n"
                f"   • Warna: {item.color} | Ukuran: {item.size}\n"
                f"   • {item.quantity} pcs x Rp {item.unit_price:,.0f} = Rp {item.subtotal:,.0f}"
            )
        items_text = "\n".join(items_lines)

        dist_text = f", Kec. {order.shipping_district}" if order.shipping_district else ""
        notes_text = f"\n- Catatan: {order.notes}" if order.notes else ""

        wa_message = (
            f"Halo Admin, saya ingin memesan pakaian dengan rincian berikut:\n\n"
            f"📋 *NO. PESANAN: {order.order_number}*\n"
            f"----------------------------------------\n"
            f"*Rincian Pesanan:*\n"
            f"{items_text}\n\n"
            f"Total Pakaian: Rp {order.subtotal_items:,.0f}\n"
            f"Daerah Pengiriman: {order.shipping_province}\n"
            f"----------------------------------------\n"
            f"📍 *Data Pengiriman:*\n"
            f"- Nama: {order.customer_name}\n"
            f"- No. WhatsApp: {order.customer_phone}\n"
            f"- Alamat: {order.shipping_address}\n"
            f"- Kota: {order.shipping_city}{dist_text}, {order.shipping_province}"
            f"{notes_text}\n"
            f"----------------------------------------\n"
            f"Mohon info nomor rekening pembayarannya ya min. Terima kasih!"
        )

        admin_phone = os.getenv('NEXT_PUBLIC_WHATSAPP_NUMBER') or os.getenv('WHATSAPP_NUMBER') or ''
        clean_admin_phone = ''.join(filter(str.isdigit, admin_phone))
        whatsapp_url = f"https://wa.me/{clean_admin_phone}?text={urllib.parse.quote(wa_message)}" if clean_admin_phone else ""

        return Response({
            'success': True,
            'order_number': order.order_number,
            'total_amount': order.total_amount,
            'subtotal_items': order.subtotal_items,
            'shipping_cost': order.shipping_cost,
            'shipping_province': order.shipping_province,
            'whatsapp_url': whatsapp_url,
            'whatsapp_message': wa_message,
        }, status=status.HTTP_201_CREATED)


# ─────────────────────────────────────────
# ORDER DETAIL VIEW
# ─────────────────────────────────────────
class OrderDetailView(generics.RetrieveAPIView):
    """
    GET /api/orders/<order_number>/
    """
    queryset = Order.objects.prefetch_related('items')
    serializer_class = OrderDetailSerializer
    lookup_field = 'order_number'


# ─────────────────────────────────────────
# SELLER CENTER VIEWS (DASHBOARD TOKO KHUSUS)
# ─────────────────────────────────────────
@method_decorator(csrf_exempt, name='dispatch')
class SellerLoginView(APIView):
    """
    POST /api/seller/login/
    Verifikasi kata sandi admin / PIN toko dengan perlindungan brute force.
    """
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'seller_login'

    def post(self, request):
        password = request.data.get('password', '').strip()
        username = request.data.get('username', 'admin').strip()

        # Check Django auth
        user = authenticate(username=username, password=password)
        if user and user.is_staff:
            now_ts = int(timezone.now().timestamp())
            return Response({
                'success': True,
                'token': f'seller_auth_{user.id}_{now_ts}',
                'expires_in': 86400,
                'username': user.username,
            })

        # Check SELLER_PASSCODE from environment
        seller_passcode = os.getenv('SELLER_PASSCODE') or os.getenv('ADMIN_PASSCODE')
        if seller_passcode and password == seller_passcode:
            now_ts = int(timezone.now().timestamp())
            return Response({
                'success': True,
                'token': f'seller_auth_admin_{now_ts}',
                'expires_in': 86400,
                'username': username or 'admin',
            })

        return Response({'error': 'Kata sandi atau PIN admin salah.'}, status=status.HTTP_401_UNAUTHORIZED)


@method_decorator(csrf_exempt, name='dispatch')
class SellerStatsView(APIView):
    """
    GET /api/seller/stats/
    Ringkasan performa toko untuk kartu metrik dengan query agregasi berkecepatan tinggi.
    """
    authentication_classes = [SellerAuthentication]
    permission_classes = [IsSellerAuthenticated]

    def get(self, request):
        order_stats = Order.objects.aggregate(
            total_orders=Count('id'),
            pending_orders=Count('id', filter=Q(status='PENDING')),
            confirmed_orders=Count('id', filter=Q(status='CONFIRMED')),
            shipped_orders=Count('id', filter=Q(status='SHIPPED')),
            total_revenue=Sum('total_amount', filter=~Q(status='CANCELLED')),
        )
        total_revenue = order_stats['total_revenue'] or 0

        total_products = Product.objects.filter(is_active=True).count()

        variant_stats = Variant.objects.filter(product__is_active=True).aggregate(
            out_of_stock=Count('id', filter=Q(stock_quantity=0)),
            low_stock=Count('id', filter=Q(stock_quantity__gt=0, stock_quantity__lte=3)),
        )

        return Response({
            'total_orders': order_stats['total_orders'] or 0,
            'pending_orders': order_stats['pending_orders'] or 0,
            'confirmed_orders': order_stats['confirmed_orders'] or 0,
            'shipped_orders': order_stats['shipped_orders'] or 0,
            'total_revenue': total_revenue,
            'total_products': total_products,
            'out_of_stock': variant_stats['out_of_stock'] or 0,
            'low_stock': variant_stats['low_stock'] or 0,
        })


@method_decorator(csrf_exempt, name='dispatch')
class SellerOrderListView(generics.ListAPIView):
    """
    GET /api/seller/orders/
    Daftar pesanan dengan filter status dan pencarian (terproteksi & dibatasi aman).
    """
    authentication_classes = [SellerAuthentication]
    permission_classes = [IsSellerAuthenticated]
    serializer_class = OrderDetailSerializer
    pagination_class = None

    def get_queryset(self):
        qs = Order.objects.prefetch_related('items').order_by('-created_at')
        status_filter = self.request.query_params.get('status')
        search = self.request.query_params.get('search')

        if status_filter and status_filter.upper() != 'ALL':
            qs = qs.filter(status=status_filter.upper())

        if search:
            qs = qs.filter(
                Q(order_number__icontains=search) |
                Q(customer_name__icontains=search) |
                Q(customer_phone__icontains=search) |
                Q(tracking_number__icontains=search)
            )

        limit = self.request.query_params.get('limit')
        if limit:
            try:
                limit_int = max(1, min(500, int(limit)))
                return qs[:limit_int]
            except ValueError:
                pass
        return qs[:150]


@method_decorator(csrf_exempt, name='dispatch')
class SellerOrderStatusUpdateView(APIView):
    """
    PATCH /api/seller/orders/<order_number>/status/
    Ubah status pesanan (Lunas, Kirim, Batal) & input nomor resi.
    """
    authentication_classes = [SellerAuthentication]
    permission_classes = [IsSellerAuthenticated]

    def patch(self, request, order_number):
        try:
            order = Order.objects.prefetch_related('items__variant').get(order_number=order_number)
        except Order.DoesNotExist:
            return Response({'error': 'Pesanan tidak ditemukan.'}, status=status.HTTP_404_NOT_FOUND)

        new_status = request.data.get('status')
        tracking_number = request.data.get('tracking_number')

        if new_status:
            order.status = new_status

        if tracking_number is not None:
            order.tracking_number = tracking_number.strip()

        # save() on Order model automatically handles stock restoration if status changed to CANCELLED
        order.save()

        return Response({
            'success': True,
            'order': OrderDetailSerializer(order).data
        })


@method_decorator(csrf_exempt, name='dispatch')
class SellerVariantStockUpdateView(APIView):
    """
    PATCH /api/seller/variants/<int:pk>/stock/
    Edit cepat angka stok per varian baju.
    """
    authentication_classes = [SellerAuthentication]
    permission_classes = [IsSellerAuthenticated]

    def patch(self, request, pk):
        try:
            variant = Variant.objects.get(pk=pk)
        except Variant.DoesNotExist:
            return Response({'error': 'Varian tidak ditemukan.'}, status=status.HTTP_404_NOT_FOUND)

        new_stock = request.data.get('stock_quantity')
        if new_stock is None:
            return Response({'error': 'Nilai stock_quantity diperlukan.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            variant.stock_quantity = max(0, int(new_stock))
            variant.save(update_fields=['stock_quantity'])
        except ValueError:
            return Response({'error': 'Format angka stok tidak valid.'}, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            'success': True,
            'variant_id': variant.id,
            'stock_quantity': variant.stock_quantity,
            'is_available': variant.is_available,
        })


@method_decorator(csrf_exempt, name='dispatch')
class SellerShippingRateUpdateView(APIView):
    """
    PATCH /api/seller/shipping-rates/<int:pk>/
    Ubah tarif ongkir per provinsi.
    """
    authentication_classes = [SellerAuthentication]
    permission_classes = [IsSellerAuthenticated]

    def patch(self, request, pk):
        try:
            rate = ShippingRate.objects.get(pk=pk)
        except ShippingRate.DoesNotExist:
            return Response({'error': 'Tarif ongkir tidak ditemukan.'}, status=status.HTTP_404_NOT_FOUND)

        cost = request.data.get('cost')
        est = request.data.get('estimated_delivery')
        is_active = request.data.get('is_active')

        if cost is not None:
            rate.cost = cost
        if est is not None:
            rate.estimated_delivery = est
        if is_active is not None:
            rate.is_active = is_active

        rate.save()
        return Response({
            'success': True,
            'rate': ShippingRateSerializer(rate).data
        })


@method_decorator(csrf_exempt, name='dispatch')
class SellerProductListView(generics.ListAPIView):
    """
    GET /api/seller/products/
    Daftar produk lengkap dengan foto dan varian untuk admin toko.
    """
    authentication_classes = [SellerAuthentication]
    permission_classes = [IsSellerAuthenticated]
    serializer_class = ProductAdminSerializer
    pagination_class = None

    def get_queryset(self):
        return (
            Product.objects
            .all()
            .select_related('category')
            .prefetch_related('variants', 'images')
            .order_by('-created_at')
        )


@method_decorator(csrf_exempt, name='dispatch')
class SellerProductCreateView(APIView):
    """
    POST /api/seller/products/create/
    Tambah baju baru lengkap dengan foto & variasi warna/ukuran dalam 1 form simpel!
    Mendukung upload foto khusus per variasi warna.
    """
    authentication_classes = [SellerAuthentication]
    permission_classes = [IsSellerAuthenticated]

    def post(self, request):
        title = request.data.get('title', '').strip()
        base_price = request.data.get('base_price')
        category_id = request.data.get('category_id')
        description = request.data.get('description', '').strip()
        size_guide = request.data.get('size_guide', '').strip()

        if not title or not base_price:
            return Response({'error': 'Nama baju dan harga wajib diisi.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            price_val = float(base_price)
        except ValueError:
            return Response({'error': 'Harga harus berupa angka.'}, status=status.HTTP_400_BAD_REQUEST)

        category = None
        if category_id:
            category = Category.objects.filter(pk=category_id).first()

        with transaction.atomic():
            product = Product.objects.create(
                title=title,
                category=category,
                base_price=price_val,
                description=description,
                size_guide=size_guide,
                is_active=True,
            )

            has_primary = False

            # Check if multi-color variation structure is sent
            colors_raw = request.data.get('colors_data')
            if colors_raw:
                try:
                    colors_list = json.loads(colors_raw) if isinstance(colors_raw, str) else colors_raw
                except Exception:
                    colors_list = []
            else:
                colors_list = []

            if colors_list:
                for idx, c_data in enumerate(colors_list):
                    c_name = str(c_data.get('color', f'Warna {idx+1}')).strip() or f'Warna {idx+1}'
                    file_key = c_data.get('file_key') or f"color_image_{idx}"
                    color_file = request.FILES.get(file_key) or request.FILES.get(f"image_{c_name}")
                    color_url = c_data.get('image_url', '').strip()
                    is_prim = c_data.get('is_primary', False) or (idx == 0 and not has_primary)

                    if color_file or color_url:
                        ProductImage.objects.create(
                            product=product,
                            color=c_name,
                            image_file=color_file,
                            image_url=color_url if not color_file else '',
                            is_primary=is_prim,
                            sort_order=idx,
                        )
                        if is_prim:
                            has_primary = True

                    # Create variants for this color
                    sizes_data = c_data.get('sizes', [])
                    if isinstance(sizes_data, dict):
                        sizes_data = [{'size': s, 'stock': q} for s, q in sizes_data.items()]

                    for s_item in sizes_data:
                        v_size = str(s_item.get('size', 'All Size')).upper().strip()
                        v_stock = max(0, int(s_item.get('stock', 0)))
                        Variant.objects.create(
                            product=product,
                            size=v_size,
                            color=c_name,
                            stock_quantity=v_stock,
                        )
            else:
                # Handle single image and standard variants
                image_file = request.FILES.get('image_file')
                image_url = request.data.get('image_url', '').strip()
                color_name = request.data.get('color', '').strip() or 'Standar'

                if image_file or image_url:
                    ProductImage.objects.create(
                        product=product,
                        color=color_name,
                        image_file=image_file,
                        image_url=image_url if not image_file else '',
                        is_primary=True,
                        sort_order=0,
                    )
                    has_primary = True

                variants_raw = request.data.get('variants')
                if isinstance(variants_raw, str):
                    try:
                        variants_list = json.loads(variants_raw)
                    except Exception:
                        variants_list = []
                elif isinstance(variants_raw, list):
                    variants_list = variants_raw
                else:
                    variants_list = []

                if not variants_list:
                    variants_list = [
                        {'size': 'S', 'color': color_name, 'stock': 5},
                        {'size': 'M', 'color': color_name, 'stock': 10},
                        {'size': 'L', 'color': color_name, 'stock': 10},
                        {'size': 'XL', 'color': color_name, 'stock': 5},
                    ]

                for v_data in variants_list:
                    v_size = str(v_data.get('size', 'All Size')).upper().strip()
                    v_color = str(v_data.get('color', color_name)).strip() or color_name
                    v_stock = max(0, int(v_data.get('stock', 0)))

                    Variant.objects.create(
                        product=product,
                        size=v_size,
                        color=v_color,
                        stock_quantity=v_stock,
                    )

            # Ensure at least one primary image exists if images exist
            first_img = product.images.first()
            if first_img and not product.images.filter(is_primary=True).exists():
                first_img.is_primary = True
                first_img.save()

        return Response({
            'success': True,
            'product_id': product.id,
            'slug': product.slug,
            'title': product.title,
        }, status=status.HTTP_201_CREATED)


@method_decorator(csrf_exempt, name='dispatch')
class SellerColorImageUploadView(APIView):
    """
    POST /api/seller/products/<int:pk>/color-image/
    Upload atau ganti foto khusus untuk variasi warna tertentu dari produk yang sudah ada.
    """
    authentication_classes = [SellerAuthentication]
    permission_classes = [IsSellerAuthenticated]

    def post(self, request, pk):
        try:
            product = Product.objects.get(pk=pk)
        except Product.DoesNotExist:
            return Response({'error': 'Produk tidak ditemukan.'}, status=status.HTTP_404_NOT_FOUND)

        color = request.data.get('color', '').strip()
        image_file = request.FILES.get('image_file')
        image_url = request.data.get('image_url', '').strip()
        is_primary = str(request.data.get('is_primary', '')).lower() in ['true', '1']

        if not color:
            return Response({'error': 'Nama warna harus diisi.'}, status=status.HTTP_400_BAD_REQUEST)

        if not image_file and not image_url:
            return Response({'error': 'Harap pilih file gambar atau masukkan URL gambar.'}, status=status.HTTP_400_BAD_REQUEST)

        # Check existing image for this color
        existing_img = product.images.filter(color__iexact=color).first()
        if existing_img:
            if image_file:
                existing_img.image_file = image_file
            if image_url:
                existing_img.image_url = image_url
            if is_primary:
                existing_img.is_primary = True
            existing_img.save()
            img_obj = existing_img
        else:
            has_primary = product.images.filter(is_primary=True).exists()
            img_obj = ProductImage.objects.create(
                product=product,
                color=color,
                image_file=image_file,
                image_url=image_url if not image_file else '',
                is_primary=is_primary or not has_primary,
                sort_order=product.images.count(),
            )
        # Ensure variants (sizes & stock) exist for this color
        existing_variants = product.variants.filter(color__iexact=color)
        if not existing_variants.exists():
            sizes_raw = request.data.get('sizes')
            if sizes_raw:
                try:
                    sizes_data = json.loads(sizes_raw) if isinstance(sizes_raw, str) else sizes_raw
                except Exception:
                    sizes_data = []
            else:
                sizes_data = []

            if not sizes_data:
                distinct_sizes = list(product.variants.values_list('size', flat=True).distinct())
                if distinct_sizes:
                    sizes_data = [{'size': s, 'stock': 5} for s in distinct_sizes]
                else:
                    sizes_data = [
                        {'size': 'S', 'stock': 5},
                        {'size': 'M', 'stock': 10},
                        {'size': 'L', 'stock': 10},
                        {'size': 'XL', 'stock': 5},
                    ]

            for s_item in sizes_data:
                v_size = str(s_item.get('size', 'All Size')).upper().strip()
                v_stock = max(0, int(s_item.get('stock', 0)))
                Variant.objects.create(
                    product=product,
                    size=v_size,
                    color=color,
                    stock_quantity=v_stock,
                )

        return Response({
            'success': True,
            'image': ProductImageSerializer(img_obj).data,
            'images': ProductImageSerializer(product.images.all(), many=True).data,
        })


@method_decorator(csrf_exempt, name='dispatch')
class SellerProductImageDeleteView(APIView):
    """
    DELETE /api/seller/products/<int:pk>/images/<int:image_id>/
    Hapus foto warna produk.
    """
    authentication_classes = [SellerAuthentication]
    permission_classes = [IsSellerAuthenticated]

    def delete(self, request, pk, image_id):
        try:
            img = ProductImage.objects.get(pk=image_id, product_id=pk)
            img.delete()
            return Response({'success': True})
        except ProductImage.DoesNotExist:
            return Response({'error': 'Foto tidak ditemukan.'}, status=status.HTTP_404_NOT_FOUND)


@method_decorator(csrf_exempt, name='dispatch')
class SellerProductUpdateView(APIView):
    """
    PATCH /api/seller/products/<int:pk>/update/
    Edit produk: nama, harga, deskripsi, kategori, status aktif/draft.
    """
    authentication_classes = [SellerAuthentication]
    permission_classes = [IsSellerAuthenticated]

    def patch(self, request, pk):
        try:
            product = Product.objects.get(pk=pk)
        except Product.DoesNotExist:
            return Response({'error': 'Produk tidak ditemukan.'}, status=status.HTTP_404_NOT_FOUND)

        title = request.data.get('title')
        base_price = request.data.get('base_price')
        description = request.data.get('description')
        category_id = request.data.get('category_id')
        is_active = request.data.get('is_active')
        sort_order = request.data.get('sort_order')

        if title is not None:
            product.title = title.strip()
        if base_price is not None:
            try:
                product.base_price = float(base_price)
            except ValueError:
                return Response({'error': 'Harga tidak valid.'}, status=status.HTTP_400_BAD_REQUEST)
        if description is not None:
            product.description = description.strip()
        if category_id is not None:
            category = Category.objects.filter(pk=category_id).first()
            product.category = category
        if is_active is not None:
            product.is_active = str(is_active).lower() in ['true', '1']
        if sort_order is not None:
            try:
                product.sort_order = int(sort_order)
            except (ValueError, AttributeError):
                pass

        product.save()

        return Response({
            'success': True,
            'product_id': product.id,
            'title': product.title,
            'is_active': product.is_active,
        })


@method_decorator(csrf_exempt, name='dispatch')
class SellerProductBulkActionView(APIView):
    """
    POST /api/seller/products/bulk-action/
    Bulk actions: delete, activate, deactivate.
    Body: { action: 'delete'|'activate'|'deactivate', ids: [1,2,3] }
    """
    authentication_classes = [SellerAuthentication]
    permission_classes = [IsSellerAuthenticated]

    def post(self, request):
        action = request.data.get('action')
        ids = request.data.get('ids', [])

        if not action or not ids:
            return Response({'error': 'Action dan IDs diperlukan.'}, status=status.HTTP_400_BAD_REQUEST)

        products = Product.objects.filter(pk__in=ids)
        count = products.count()

        if action == 'delete':
            products.delete()
            return Response({'success': True, 'message': f'{count} produk berhasil dihapus.'})
        elif action == 'activate':
            products.update(is_active=True)
            return Response({'success': True, 'message': f'{count} produk diaktifkan.'})
        elif action == 'deactivate':
            products.update(is_active=False)
            return Response({'success': True, 'message': f'{count} produk dinonaktifkan (draft).'})
        else:
            return Response({'error': 'Action tidak dikenal.'}, status=status.HTTP_400_BAD_REQUEST)


@method_decorator(csrf_exempt, name='dispatch')
class SellerLowStockAlertsView(APIView):
    """
    GET /api/seller/alerts/low-stock/
    Daftar varian dengan stok menipis atau habis.
    """
    authentication_classes = [SellerAuthentication]
    permission_classes = [IsSellerAuthenticated]

    def get(self, request):
        threshold = int(request.query_params.get('threshold', 5))
        low_variants = (
            Variant.objects
            .filter(product__is_active=True, stock_quantity__lte=threshold)
            .select_related('product', 'product__category')
            .order_by('stock_quantity')[:50]
        )

        data = []
        for v in low_variants:
            data.append({
                'variant_id': v.id,
                'product_id': v.product.id,
                'product_title': v.product.title,
                'product_slug': v.product.slug,
                'primary_image': v.product.primary_image,
                'category_name': v.product.category.name if v.product.category else 'Umum',
                'size': v.size,
                'color': v.color,
                'stock_quantity': v.stock_quantity,
                'status': 'Habis' if v.stock_quantity == 0 else 'Menipis',
            })

        return Response({'alerts': data, 'total': len(data)})
