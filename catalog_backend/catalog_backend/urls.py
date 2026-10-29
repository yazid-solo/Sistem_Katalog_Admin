"""
URL configuration for catalog_backend project.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

# Customize Admin branding
admin.site.site_header = "DLRS — Admin Katalog Pakaian"
admin.site.site_title = "DLRS Admin Katalog"
admin.site.index_title = "Manajemen Katalog & Inventaris Pakaian"

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('inventory.urls')),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
