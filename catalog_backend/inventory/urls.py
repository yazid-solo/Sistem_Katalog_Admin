"""
URL patterns for the Inventory API.
All routes are prefixed with /api/ from the root urls.py.
"""
from django.urls import path, re_path
from .views import (
    CategoryListView,
    ProductListView,
    ProductDetailView,
    StockCheckView,
    ShippingRateListView,
    CheckoutView,
    CartStockSyncView,
    OrderDetailView,
    SellerLoginView,
    SellerStatsView,
    SellerOrderListView,
    SellerOrderStatusUpdateView,
    SellerCancelExpiredOrdersView,
    SellerVariantStockUpdateView,
    SellerShippingRateUpdateView,
    SellerProductCreateView,
    SellerProductListView,
    SellerColorImageUploadView,
    SellerProductImageDeleteView,
    SellerProductColorActionView,
    SellerProductUpdateView,
    SellerProductBulkActionView,
    SellerLowStockAlertsView,
)

app_name = 'inventory'

urlpatterns = [
    # Customer APIs (Support both trailing and non-trailing slash)
    re_path(r'^categories/?$', CategoryListView.as_view(), name='category-list'),
    re_path(r'^products/?$', ProductListView.as_view(), name='product-list'),
    re_path(r'^products/(?P<slug>[-a-zA-Z0-9_]+)/?$', ProductDetailView.as_view(), name='product-detail'),
    re_path(r'^products/(?P<slug>[-a-zA-Z0-9_]+)/stock/?$', StockCheckView.as_view(), name='product-stock'),
    re_path(r'^shipping-rates/?$', ShippingRateListView.as_view(), name='shipping-rate-list'),
    re_path(r'^orders/checkout/?$', CheckoutView.as_view(), name='order-checkout'),
    re_path(r'^orders/cart-stock/?$', CartStockSyncView.as_view(), name='order-cart-stock'),
    re_path(r'^orders/(?P<order_number>[^/]+)/?$', OrderDetailView.as_view(), name='order-detail'),

    # Seller Center (Admin Toko) APIs (Support both trailing and non-trailing slash)
    re_path(r'^seller/login/?$', SellerLoginView.as_view(), name='seller-login'),
    re_path(r'^seller/stats/?$', SellerStatsView.as_view(), name='seller-stats'),
    re_path(r'^seller/orders/?$', SellerOrderListView.as_view(), name='seller-orders'),
    re_path(r'^seller/orders/cancel-expired/?$', SellerCancelExpiredOrdersView.as_view(), name='seller-orders-cancel-expired'),
    re_path(r'^seller/orders/(?P<order_number>[^/]+)/status/?$', SellerOrderStatusUpdateView.as_view(), name='seller-order-status'),
    re_path(r'^seller/variants/(?P<pk>\d+)/stock/?$', SellerVariantStockUpdateView.as_view(), name='seller-variant-stock'),
    re_path(r'^seller/shipping-rates/(?P<pk>\d+)/?$', SellerShippingRateUpdateView.as_view(), name='seller-shipping-rate-update'),
    re_path(r'^seller/products/?$', SellerProductListView.as_view(), name='seller-products-list'),
    re_path(r'^seller/products/create/?$', SellerProductCreateView.as_view(), name='seller-product-create'),
    re_path(r'^seller/products/bulk-action/?$', SellerProductBulkActionView.as_view(), name='seller-product-bulk'),
    re_path(r'^seller/products/(?P<pk>\d+)/update/?$', SellerProductUpdateView.as_view(), name='seller-product-update'),
    re_path(r'^seller/products/(?P<pk>\d+)/color-image/?$', SellerColorImageUploadView.as_view(), name='seller-product-color-image'),
    re_path(r'^seller/products/(?P<pk>\d+)/color-action/?$', SellerProductColorActionView.as_view(), name='seller-product-color-action'),
    re_path(r'^seller/products/(?P<pk>\d+)/images/(?P<image_id>\d+)/?$', SellerProductImageDeleteView.as_view(), name='seller-product-image-delete'),
    re_path(r'^seller/alerts/low-stock/?$', SellerLowStockAlertsView.as_view(), name='seller-low-stock-alerts'),
]
