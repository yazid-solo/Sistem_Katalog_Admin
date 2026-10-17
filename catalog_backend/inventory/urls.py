"""
URL patterns for the Inventory API.
All routes are prefixed with /api/ from the root urls.py.
"""
from django.urls import path
from .views import (
    CategoryListView,
    ProductListView,
    ProductDetailView,
    StockCheckView,
    ShippingRateListView,
    CheckoutView,
    OrderDetailView,
    SellerLoginView,
    SellerStatsView,
    SellerOrderListView,
    SellerOrderStatusUpdateView,
    SellerVariantStockUpdateView,
    SellerShippingRateUpdateView,
    SellerProductCreateView,
    SellerProductListView,
    SellerColorImageUploadView,
    SellerProductImageDeleteView,
    SellerProductUpdateView,
    SellerProductBulkActionView,
    SellerLowStockAlertsView,
)

app_name = 'inventory'

urlpatterns = [
    # Customer APIs
    path('categories/', CategoryListView.as_view(), name='category-list'),
    path('products/', ProductListView.as_view(), name='product-list'),
    path('products/<slug:slug>/', ProductDetailView.as_view(), name='product-detail'),
    path('products/<slug:slug>/stock/', StockCheckView.as_view(), name='product-stock'),
    path('shipping-rates/', ShippingRateListView.as_view(), name='shipping-rate-list'),
    path('orders/checkout/', CheckoutView.as_view(), name='order-checkout'),
    path('orders/<str:order_number>/', OrderDetailView.as_view(), name='order-detail'),

    # Seller Center (Admin Toko) APIs
    path('seller/login/', SellerLoginView.as_view(), name='seller-login'),
    path('seller/stats/', SellerStatsView.as_view(), name='seller-stats'),
    path('seller/orders/', SellerOrderListView.as_view(), name='seller-orders'),
    path('seller/orders/<str:order_number>/status/', SellerOrderStatusUpdateView.as_view(), name='seller-order-status'),
    path('seller/variants/<int:pk>/stock/', SellerVariantStockUpdateView.as_view(), name='seller-variant-stock'),
    path('seller/shipping-rates/<int:pk>/', SellerShippingRateUpdateView.as_view(), name='seller-shipping-rate-update'),
    path('seller/products/', SellerProductListView.as_view(), name='seller-products-list'),
    path('seller/products/create/', SellerProductCreateView.as_view(), name='seller-product-create'),
    path('seller/products/bulk-action/', SellerProductBulkActionView.as_view(), name='seller-product-bulk'),
    path('seller/products/<int:pk>/update/', SellerProductUpdateView.as_view(), name='seller-product-update'),
    path('seller/products/<int:pk>/color-image/', SellerColorImageUploadView.as_view(), name='seller-product-color-image'),
    path('seller/products/<int:pk>/images/<int:image_id>/', SellerProductImageDeleteView.as_view(), name='seller-product-image-delete'),
    path('seller/alerts/low-stock/', SellerLowStockAlertsView.as_view(), name='seller-low-stock-alerts'),
]
