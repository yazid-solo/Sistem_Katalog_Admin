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
from django.core.signing import TimestampSigner, BadSignature, SignatureExpired
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
# SECURITY CONSTANTS & FILE VALIDATORS
# ─────────────────────────────────────────
SELLER_SIGNER_SALT = 'dlrs-seller-session-v1'
ALLOWED_IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp'}
ALLOWED_IMAGE_MIMES = {'image/jpeg', 'image/png', 'image/webp'}
MAX_UPLOAD_SIZE = 10 * 1024 * 1024  # 10 MB

def validate_uploaded_image(file_obj):
    """
    Validates uploaded image file extension, MIME type, and size.
    Prevents malicious scripts (.svg, .html, .exe) and DoS via large files.
    """
    if not file_obj:
        return True, None
    if file_obj.size > MAX_UPLOAD_SIZE:
        return False, 'Ukuran file gambar maksimal adalah 10 MB.'
    ext = os.path.splitext(file_obj.name)[1].lower()
    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        return False, f'Format file {ext} tidak diizinkan. Hanya file JPG, JPEG, PNG, dan WEBP yang diperbolehkan.'
    content_type = getattr(file_obj, 'content_type', '')
    if content_type and content_type.lower() not in ALLOWED_IMAGE_MIMES:
        return False, 'Tipe konten file tidak valid. Harap unggah file foto asli.'
    return True, None


# ─────────────────────────────────────────
# SELLER AUTHENTICATION & PERMISSIONS
# ─────────────────────────────────────────
class SellerAuthentication(BaseAuthentication):
    """
    Validates cryptographically signed Authorization: Bearer <token> for Seller Center.
    Token is signed with HMAC-SHA256 using Django SECRET_KEY and expires after 24 hours.
    Tampered or forged tokens are automatically rejected.
    """
    SELLER_TOKEN_MAX_AGE = 24 * 3600  # 24 jam dalam detik

    def authenticate(self, request):
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        token = ''
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1].strip()
        elif request.GET.get('token'):
            token = request.GET.get('token', '').strip()

        if token:
            signer = TimestampSigner(salt=SELLER_SIGNER_SALT)
            try:
                # Verifies cryptographic HMAC signature AND timestamp expiration
                unsigned_payload = signer.unsign(token, max_age=self.SELLER_TOKEN_MAX_AGE)
                if unsigned_payload.startswith('seller_auth:'):
                    return (AnonymousUser(), token)
            except SignatureExpired:
                raise exceptions.AuthenticationFailed('Sesi Anda telah kedaluwarsa setelah 24 jam. Silakan login kembali.')
            except BadSignature:
                # Invalid signature or forged token
                pass

        # Access underlying request._request to avoid DRF lazy auth recursion
        underlying = getattr(request, '_request', request)
        user = getattr(underlying, 'user', None)
        if user and user.is_authenticated and user.is_staff:
            return (user, None)

        return None


class IsSellerAuthenticated(BasePermission):
    """
    Ensures that only authenticated sellers with cryptographically verified token
    or staff can access management endpoints.
    """
    def has_permission(self, request, view):
        if getattr(request, 'auth', None):
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
        val = value.strip().upper()
        if val in ('ALL SIZE', 'ALL_SIZE', 'FREE_SIZE', 'FREESIZE'):
            return queryset.filter(
                variants__size__in=['ALL SIZE', 'FREE_SIZE'],
                variants__stock_quantity__gt=0
            ).distinct()
        return queryset.filter(
            variants__size__iexact=val,
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


def get_admin_whatsapp_contacts():
    """
    Returns list of configured admin WhatsApp contacts for round-robin rotation.
    Format: [{'id': 'admin-1', 'name': 'Admin 1', 'number': '6281390796231'}, ...]
    """
    contacts = []
    # Check numbered environment variables
    for i in range(1, 10):
        num = (
            os.getenv(f'NEXT_PUBLIC_WHATSAPP_NUMBER_{i}') or
            os.getenv(f'WHATSAPP_NUMBER_{i}') or
            ''
        ).strip()
        clean = ''.join(filter(str.isdigit, num))
        if clean:
            contacts.append({
                'id': f'admin-{i}',
                'name': f'Admin {i}',
                'number': clean
            })

    # Fallback to single number if no numbered vars
    if not contacts:
        fallback = (
            os.getenv('NEXT_PUBLIC_WHATSAPP_NUMBER') or
            os.getenv('WHATSAPP_NUMBER') or
            ''
        ).strip()
        clean = ''.join(filter(str.isdigit, fallback))
        if clean:
            contacts.append({
                'id': 'admin-1',
                'name': 'Admin 1',
                'number': clean
            })

    return contacts


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

            # 5. Determine assigned admin via round-robin (count % total_admins)
            admin_contacts = get_admin_whatsapp_contacts()
            if admin_contacts:
                existing_orders_count = Order.objects.count()
                assigned_idx = existing_orders_count % len(admin_contacts)
                assigned_admin_info = admin_contacts[assigned_idx]
                assigned_admin_name = assigned_admin_info['name']
                clean_admin_phone = assigned_admin_info['number']
            else:
                assigned_admin_name = 'Admin'
                clean_admin_phone = ''

            # 6. Create Order
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
                assigned_admin=assigned_admin_name,
            )

            for oi in order_items_to_create:
                oi.order = order
            OrderItem.objects.bulk_create(order_items_to_create)

        # 7. Generate formatted WhatsApp message
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
            f"Halo {assigned_admin_name}, saya ingin memesan pakaian dengan rincian berikut:\n\n"
            f"📋 *NO. PESANAN: {order.order_number}*\n"
            f"----------------------------------------\n"
            f"*Rincian Pesanan:*\n"
            f"{items_text}\n\n"
            f"Subtotal Pakaian: Rp {order.subtotal_items:,.0f}\n"
            f"Ongkos Kirim ({order.shipping_province}): Rp {order.shipping_cost:,.0f}\n"
            f"*Total Tagihan: Rp {order.total_amount:,.0f}*\n"
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
            'assigned_admin': assigned_admin_name,
            'assigned_phone': clean_admin_phone,
        }, status=status.HTTP_201_CREATED)


# ─────────────────────────────────────────
# CART STOCK LIVE SYNC VIEW
# ─────────────────────────────────────────
class CartStockSyncView(APIView):
    """
    GET /api/orders/cart-stock/?variant_ids=1,2,3
    Mengambil sisa stok & harga terkini dari server agar keranjang pembeli selalu akurat.
    """
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        raw_ids = request.query_params.get('variant_ids', '')
        id_list = []
        for part in raw_ids.split(','):
            part = part.strip()
            if part.isdigit():
                id_list.append(int(part))

        if not id_list:
            return Response({'variants': []})

        variants = (
            Variant.objects
            .select_related('product')
            .filter(id__in=id_list[:50])
        )
        data = [
            {
                'variant_id': v.id,
                'product_id': v.product_id,
                'product_title': v.product.title,
                'is_product_active': v.product.is_active,
                'price': float(v.product.base_price),
                'stock_quantity': v.stock_quantity if v.product.is_active else 0,
            }
            for v in variants
        ]
        return Response({'variants': data})


# ─────────────────────────────────────────
# ORDER DETAIL VIEW (BY ORDER NUMBER OR PHONE)
# ─────────────────────────────────────────
def mask_customer_name(name: str) -> str:
    if not name:
        return 'Pelanggan'
    parts = name.strip().split()
    masked_parts = []
    for p in parts:
        if len(p) <= 2:
            masked_parts.append(p)
        else:
            masked_parts.append(p[0] + '*' * (len(p) - 2) + p[-1])
    return ' '.join(masked_parts)

def mask_customer_phone(phone: str) -> str:
    if not phone:
        return ''
    digits = ''.join(filter(str.isdigit, phone))
    if len(digits) >= 8:
        return digits[:4] + '****' + digits[-3:]
    return '****'

class OrderDetailView(APIView):
    """
    GET /api/orders/<order_number>/
    Mendukung pencarian menggunakan Nomor Pesanan (ORD-...) ATAU Nomor WhatsApp Pembeli (08... / 628...).
    Dilengkapi rate-limiting dan masking PII untuk melindungi privasi pembeli dari scraping.
    """
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'order_tracking'

    def get(self, request, order_number):
        query = (order_number or '').strip()
        if not query:
            return Response({'error': 'Masukkan Nomor Pesanan atau Nomor WhatsApp.'}, status=status.HTTP_400_BAD_REQUEST)

        # 1. Coba cari berdasarkan Nomor Pesanan (ORD-...)
        order = Order.objects.prefetch_related('items').filter(order_number__iexact=query).first()

        # 2. Jika tidak ditemukan, cek apakah input berupa Nomor HP / WhatsApp Pembeli
        if not order:
            digits = ''.join(filter(str.isdigit, query))
            if len(digits) >= 8:
                # Normalisasi akhiran nomor HP (tanpa 0 / 62 di depan) agar cocok baik 08xx maupun 628xx
                tail_digits = digits[2:] if digits.startswith('62') else (digits[1:] if digits.startswith('0') else digits)
                if len(tail_digits) >= 7:
                    order = (
                        Order.objects.prefetch_related('items')
                        .filter(customer_phone__icontains=tail_digits)
                        .order_by('-created_at')
                        .first()
                    )

        if not order:
            return Response(
                {'error': f'Pesanan dengan nomor atau WhatsApp "{query}" tidak ditemukan.'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Verifikasi apakah request berasal dari Admin/Seller terotentikasi
        underlying = getattr(request, '_request', request)
        user = getattr(underlying, 'user', None)
        is_seller = bool(user and user.is_authenticated and user.is_staff)
        if not is_seller and getattr(request, 'auth', None):
            is_seller = True
        else:
            auth_header = request.META.get('HTTP_AUTHORIZATION', '')
            if auth_header.startswith('Bearer '):
                t = auth_header.split(' ')[1].strip()
                try:
                    TimestampSigner(salt=SELLER_SIGNER_SALT).unsign(t, max_age=86400)
                    is_seller = True
                except Exception:
                    pass

        serialized = OrderDetailSerializer(order).data

        # Masking data pribadi (PII) jika diakses oleh publik non-admin
        if not is_seller:
            serialized['customer_name'] = mask_customer_name(order.customer_name)
            serialized['customer_phone'] = mask_customer_phone(order.customer_phone)
            serialized['shipping_address'] = f"*** (Alamat detail dilindungi privasi) — {order.shipping_city}, {order.shipping_province}"
            if serialized.get('notes'):
                serialized['notes'] = '***'

        # Sertakan daftar pesanan lain milik nomor HP yang sama agar pembeli mudah berpindah pesanan
        phone_digits = ''.join(filter(str.isdigit, order.customer_phone or ''))
        tail_phone = phone_digits[2:] if phone_digits.startswith('62') else (phone_digits[1:] if phone_digits.startswith('0') else phone_digits)
        related_orders = []
        if len(tail_phone) >= 7:
            siblings = (
                Order.objects
                .filter(customer_phone__icontains=tail_phone)
                .order_by('-created_at')[:10]
            )
            related_orders = [
                {
                    'order_number': o.order_number,
                    'status': o.status,
                    'total_amount': o.total_amount,
                    'created_at': o.created_at,
                }
                for o in siblings
            ]

        serialized['related_orders'] = related_orders
        return Response(serialized)


# ─────────────────────────────────────────
# SELLER CENTER VIEWS (DASHBOARD TOKO KHUSUS)
# ─────────────────────────────────────────
@method_decorator(csrf_exempt, name='dispatch')
class SellerLoginView(APIView):
    """
    POST /api/seller/login/
    Verifikasi kata sandi admin / PIN toko dengan perlindungan brute force
    dan menghasilkan cryptographically-signed token (HMAC-SHA256).
    """
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'seller_login'

    def post(self, request):
        password = request.data.get('password', '').strip()
        username = request.data.get('username', 'admin').strip()

        signer = TimestampSigner(salt=SELLER_SIGNER_SALT)
        now_ts = int(timezone.now().timestamp())

        # Check Django auth
        user = authenticate(username=username, password=password)
        if user and user.is_staff:
            signed_token = signer.sign(f'seller_auth:{user.username}:{now_ts}')
            return Response({
                'success': True,
                'token': signed_token,
                'expires_in': 86400,
                'username': user.username,
            })

        # Check SELLER_PASSCODE from environment
        seller_passcode = os.getenv('SELLER_PASSCODE') or os.getenv('ADMIN_PASSCODE')
        if seller_passcode and password == seller_passcode:
            signed_token = signer.sign(f'seller_auth:admin:{now_ts}')
            return Response({
                'success': True,
                'token': signed_token,
                'expires_in': 86400,
                'username': username or 'admin',
            })

        return Response({'error': 'Kata sandi atau PIN admin salah.'}, status=status.HTTP_401_UNAUTHORIZED)

        return Response({'error': 'Kata sandi atau PIN admin salah.'}, status=status.HTTP_401_UNAUTHORIZED)


@method_decorator(csrf_exempt, name='dispatch')
class SellerStatsView(APIView):
    """
    GET /api/seller/stats/
    Ringkasan performa toko untuk kartu metrik dengan query agregasi berkecepatan tinggi.
    Memisahkan Omset Bersih (Lunas) dengan Menunggu Pembayaran (Pending) serta Omset Hari Ini.
    """
    authentication_classes = [SellerAuthentication]
    permission_classes = [IsSellerAuthenticated]

    def get(self, request):
        from datetime import timedelta
        now = timezone.now()
        today_date = timezone.localtime(now).date()
        expired_cutoff = now - timedelta(hours=24)
        paid_statuses = ['CONFIRMED', 'SHIPPED', 'COMPLETED']

        order_stats = Order.objects.aggregate(
            total_orders=Count('id'),
            pending_orders=Count('id', filter=Q(status='PENDING')),
            confirmed_orders=Count('id', filter=Q(status='CONFIRMED')),
            shipped_orders=Count('id', filter=Q(status='SHIPPED')),
            completed_orders=Count('id', filter=Q(status='COMPLETED')),
            expired_pending_orders=Count('id', filter=Q(status='PENDING', created_at__lte=expired_cutoff)),
            total_revenue=Sum('total_amount', filter=Q(status__in=paid_statuses)),
            pending_revenue=Sum('total_amount', filter=Q(status='PENDING')),
            today_revenue=Sum('total_amount', filter=Q(status__in=paid_statuses, created_at__date=today_date)),
            today_orders=Count('id', filter=Q(created_at__date=today_date) & ~Q(status='CANCELLED')),
        )

        total_products = Product.objects.filter(is_active=True).count()

        variant_stats = Variant.objects.filter(product__is_active=True).aggregate(
            out_of_stock=Count('id', filter=Q(stock_quantity=0)),
            low_stock=Count('id', filter=Q(stock_quantity__gt=0, stock_quantity__lte=5)),
        )

        return Response({
            'total_orders': order_stats['total_orders'] or 0,
            'pending_orders': order_stats['pending_orders'] or 0,
            'confirmed_orders': order_stats['confirmed_orders'] or 0,
            'shipped_orders': order_stats['shipped_orders'] or 0,
            'completed_orders': order_stats['completed_orders'] or 0,
            'expired_pending_orders': order_stats['expired_pending_orders'] or 0,
            'total_revenue': order_stats['total_revenue'] or 0,
            'pending_revenue': order_stats['pending_revenue'] or 0,
            'today_revenue': order_stats['today_revenue'] or 0,
            'today_orders': order_stats['today_orders'] or 0,
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


def detect_courier_from_resi(resi: str) -> str:
    """Deteksi nama ekspedisi kurir otomatis berdasarkan format/awalan nomor resi Indonesia."""
    if not resi:
        return ''
    r = resi.strip().upper()
    if r.startswith(('JP', 'JD', 'JX', 'JT', 'JB')):
        return 'J&T Express'
    if r.startswith('SPXID') or (r.startswith('ID') and len(r) >= 14):
        return 'Shopee Express (SPX)'
    if r.startswith('00') and r.isdigit() and len(r) >= 11:
        return 'SiCepat'
    if r.startswith('1000') and r.isdigit() and len(r) >= 12:
        return 'AnterAja'
    if r.startswith(('11LP', 'LP')):
        return 'Lion Parcel'
    if r.startswith(('IDE', 'IDS')):
        return 'ID Express'
    if r.startswith(('NLIDAP', 'NVID')):
        return 'Ninja Xpress'
    if r.startswith(('SOC', 'CGK', 'BDG', 'SUB', 'TGR', 'JOG', 'DPS', 'MKS', 'MDN', 'SMG', 'SLO', 'MLG', 'BKI', 'DPK', 'BGR', 'PLM', 'PKU', 'BPN', 'BJM', 'CM', 'TKP')):
        return 'JNE'
    if r.startswith('P') and len(r) >= 11:
        return 'Pos Indonesia'
    return ''


@method_decorator(csrf_exempt, name='dispatch')
class SellerOrderStatusUpdateView(APIView):
    """
    PATCH /api/seller/orders/<order_number>/status/
    Ubah status pesanan (Lunas, Kirim, Batal), input nomor resi, kurir & foto struk resi.
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
        shipping_courier = request.data.get('shipping_courier')
        receipt_image = request.FILES.get('receipt_image')
        remove_receipt = str(request.data.get('remove_receipt', '')).lower() in ['true', '1']

        if new_status:
            order.status = new_status

        if tracking_number is not None:
            order.tracking_number = tracking_number.strip()

        if shipping_courier is not None:
            order.shipping_courier = shipping_courier.strip()
        elif order.tracking_number and not order.shipping_courier:
            detected = detect_courier_from_resi(order.tracking_number)
            if detected:
                order.shipping_courier = detected

        if receipt_image:
            is_valid, err_msg = validate_uploaded_image(receipt_image)
            if not is_valid:
                return Response({'error': err_msg}, status=status.HTTP_400_BAD_REQUEST)
            order.tracking_receipt_image = receipt_image
        elif remove_receipt and order.tracking_receipt_image:
            order.tracking_receipt_image.delete(save=False)
            order.tracking_receipt_image = None

        # save() on Order model automatically handles stock restoration if status changed to CANCELLED
        order.save()

        return Response({
            'success': True,
            'order': OrderDetailSerializer(order).data
        })


@method_decorator(csrf_exempt, name='dispatch')
class SellerCancelExpiredOrdersView(APIView):
    """
    POST /api/seller/orders/cancel-expired/
    Membatalkan seluruh pesanan berstatus PENDING yang sudah lewat > 24 jam
    dan mengembalikan stok pakaiannya secara atomik ke katalog.
    """
    authentication_classes = [SellerAuthentication]
    permission_classes = [IsSellerAuthenticated]

    def post(self, request):
        from datetime import timedelta
        cutoff = timezone.now() - timedelta(hours=24)
        with transaction.atomic():
            expired_orders = list(
                Order.objects.prefetch_related('items')
                .filter(status='PENDING', created_at__lte=cutoff)
            )
            cancelled_count = 0
            for o in expired_orders:
                o.status = 'CANCELLED'
                o.save()  # Order.save() atomically restores Variant stock_quantity
                cancelled_count += 1

        return Response({
            'success': True,
            'cancelled_count': cancelled_count,
            'message': f'{cancelled_count} pesanan kedaluwarsa (>24 jam belum bayar) telah dibatalkan & stok dikembalikan ke katalog.',
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

                    if color_file:
                        is_valid, err_msg = validate_uploaded_image(color_file)
                        if not is_valid:
                            return Response({'error': f"Foto variasi '{c_name}': {err_msg}"}, status=status.HTTP_400_BAD_REQUEST)

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
                        {'size': 'ALL SIZE', 'color': color_name, 'stock': 10},
                        {'size': 'STANDAR', 'color': color_name, 'stock': 10},
                        {'size': 'JUMBO', 'color': color_name, 'stock': 8},
                        {'size': 'S', 'color': color_name, 'stock': 5},
                        {'size': 'M', 'color': color_name, 'stock': 10},
                        {'size': 'L', 'color': color_name, 'stock': 10},
                        {'size': 'XL', 'color': color_name, 'stock': 5},
                        {'size': 'XXL', 'color': color_name, 'stock': 5},
                    ]

                for v_data in variants_list:
                    v_size = str(v_data.get('size', 'ALL SIZE')).upper().strip()
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

        if image_file:
            is_valid, err_msg = validate_uploaded_image(image_file)
            if not is_valid:
                return Response({'error': err_msg}, status=status.HTTP_400_BAD_REQUEST)

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
                        {'size': 'ALL SIZE', 'stock': 10},
                        {'size': 'STANDAR', 'stock': 10},
                        {'size': 'JUMBO', 'stock': 8},
                        {'size': 'S', 'stock': 5},
                        {'size': 'M', 'stock': 10},
                        {'size': 'L', 'stock': 10},
                        {'size': 'XL', 'stock': 5},
                        {'size': 'XXL', 'stock': 5},
                    ]

            for s_item in sizes_data:
                v_size = str(s_item.get('size', 'ALL SIZE')).upper().strip()
                v_stock = max(0, int(s_item.get('stock', 0)))
                Variant.objects.update_or_create(
                    product=product,
                    size=v_size,
                    color=color,
                    defaults={'stock_quantity': v_stock},
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
            was_primary = img.is_primary
            img.delete()
            if was_primary:
                next_img = ProductImage.objects.filter(product_id=pk).first()
                if next_img:
                    next_img.is_primary = True
                    next_img.save(update_fields=['is_primary'])
            return Response({'success': True})
        except ProductImage.DoesNotExist:
            return Response({'error': 'Foto tidak ditemukan.'}, status=status.HTTP_404_NOT_FOUND)


@method_decorator(csrf_exempt, name='dispatch')
class SellerProductColorActionView(APIView):
    """
    POST /api/seller/products/<int:pk>/color-action/
    Aksi manajemen variasi warna:
    - action='set_primary': Jadikan foto warna ini sebagai Foto Cover Utama produk
    - action='delete_color': Hapus variasi warna beserta seluruh ukuran dan fotonya
    """
    authentication_classes = [SellerAuthentication]
    permission_classes = [IsSellerAuthenticated]

    def post(self, request, pk):
        try:
            product = Product.objects.get(pk=pk)
        except Product.DoesNotExist:
            return Response({'error': 'Produk tidak ditemukan.'}, status=status.HTTP_404_NOT_FOUND)

        action = request.data.get('action', '').strip()
        color = request.data.get('color', '').strip()

        if not color:
            return Response({'error': 'Nama warna diperlukan.'}, status=status.HTTP_400_BAD_REQUEST)

        if action == 'set_primary':
            target_img = product.images.filter(color__iexact=color).first()
            if not target_img:
                return Response({'error': f'Belum ada foto yang terpasang untuk warna "{color}". Upload foto terlebih dahulu.'}, status=status.HTTP_400_BAD_REQUEST)

            with transaction.atomic():
                product.images.update(is_primary=False)
                target_img.is_primary = True
                target_img.save(update_fields=['is_primary'])

            return Response({
                'success': True,
                'message': f'Foto warna "{color}" berhasil dijadikan Foto Sampul Utama (Cover Katalog).',
            })

        elif action == 'delete_color':
            distinct_colors = list(product.variants.values_list('color', flat=True).distinct())
            if len(distinct_colors) <= 1:
                return Response(
                    {'error': 'Produk wajib memiliki minimal 1 variasi warna. Tambahkan warna lain terlebih dahulu sebelum menghapus warna ini.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            with transaction.atomic():
                product.variants.filter(color__iexact=color).delete()
                product.images.filter(color__iexact=color).delete()
                if not product.images.filter(is_primary=True).exists():
                    next_img = product.images.first()
                    if next_img:
                        next_img.is_primary = True
                        next_img.save(update_fields=['is_primary'])

            return Response({
                'success': True,
                'message': f'Variasi warna "{color}" beserta stok ukurannya berhasil dihapus.',
            })

        return Response({'error': 'Aksi warna tidak valid.'}, status=status.HTTP_400_BAD_REQUEST)


@method_decorator(csrf_exempt, name='dispatch')
class SellerProductUpdateView(APIView):
    """
    PATCH /api/seller/products/<int:pk>/update/
    Edit produk: nama, harga, deskripsi, panduan ukuran, kategori, status aktif/draft.
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
        size_guide = request.data.get('size_guide')
        category_id = request.data.get('category_id')
        is_active = request.data.get('is_active')

        if title is not None:
            product.title = title.strip()
        if base_price is not None:
            try:
                product.base_price = float(base_price)
            except ValueError:
                return Response({'error': 'Harga tidak valid.'}, status=status.HTTP_400_BAD_REQUEST)
        if description is not None:
            product.description = description.strip()
        if size_guide is not None:
            product.size_guide = size_guide.strip()
        if category_id is not None:
            category = Category.objects.filter(pk=category_id).first()
            product.category = category
        if is_active is not None:
            product.is_active = str(is_active).lower() in ['true', '1']

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
            .order_by('stock_quantity', 'product__title')[:250]
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
