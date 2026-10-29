"""
Management command to seed the database with realistic clothing catalog data
covering:
1. Kulot
2. Kulot Polos
3. Celana Pendek
4. Bogo
5. Kaos
6. Daster
7. Setelan Panjang/Pendek
8. Kain Pantai
9. Outer
10. Setelan Anak
11. Mukena
12. Hijab

Usage: python manage.py seed_data [--clean]
"""
from django.core.management.base import BaseCommand
from django.utils.text import slugify
from inventory.models import Category, Product, ProductImage, Variant, ShippingRate
import decimal


ALL_SIZES_ORDER = ['ALL SIZE', 'STANDAR', 'JUMBO', 'S', 'M', 'L', 'XL', 'XXL']


def build_variants(colors_stocks, item_type='top'):
    """
    Generates all 8 standard sizes (ALL SIZE, STANDAR, JUMBO, S, M, L, XL, XXL)
    for every color in colors_stocks with realistic measurements for each item_type.
    """
    variants = []
    for color_name, stocks_list in colors_stocks:
        for idx, size_name in enumerate(ALL_SIZES_ORDER):
            stock_val = stocks_list[idx] if idx < len(stocks_list) else 8

            if item_type == 'kulot':
                specs = {
                    'ALL SIZE': {'waist_width': 78, 'body_length': 96},
                    'STANDAR': {'waist_width': 74, 'body_length': 94},
                    'JUMBO': {'waist_width': 92, 'body_length': 98},
                    'S': {'waist_width': 68, 'body_length': 92},
                    'M': {'waist_width': 72, 'body_length': 94},
                    'L': {'waist_width': 78, 'body_length': 96},
                    'XL': {'waist_width': 84, 'body_length': 98},
                    'XXL': {'waist_width': 90, 'body_length': 100},
                }[size_name]
            elif item_type == 'shorts':
                specs = {
                    'ALL SIZE': {'waist_width': 76, 'body_length': 42},
                    'STANDAR': {'waist_width': 72, 'body_length': 40},
                    'JUMBO': {'waist_width': 90, 'body_length': 46},
                    'S': {'waist_width': 66, 'body_length': 38},
                    'M': {'waist_width': 70, 'body_length': 40},
                    'L': {'waist_width': 76, 'body_length': 42},
                    'XL': {'waist_width': 82, 'body_length': 44},
                    'XXL': {'waist_width': 88, 'body_length': 46},
                }[size_name]
            elif item_type == 'daster':
                specs = {
                    'ALL SIZE': {'chest_width': 115, 'body_length': 115, 'shoulder_width': 44, 'sleeve_length': 22},
                    'STANDAR': {'chest_width': 110, 'body_length': 112, 'shoulder_width': 42, 'sleeve_length': 21},
                    'JUMBO': {'chest_width': 126, 'body_length': 118, 'shoulder_width': 48, 'sleeve_length': 24},
                    'S': {'chest_width': 100, 'body_length': 110, 'shoulder_width': 40, 'sleeve_length': 20},
                    'M': {'chest_width': 106, 'body_length': 112, 'shoulder_width': 42, 'sleeve_length': 21},
                    'L': {'chest_width': 112, 'body_length': 115, 'shoulder_width': 44, 'sleeve_length': 22},
                    'XL': {'chest_width': 118, 'body_length': 117, 'shoulder_width': 46, 'sleeve_length': 23},
                    'XXL': {'chest_width': 124, 'body_length': 119, 'shoulder_width': 48, 'sleeve_length': 24},
                }[size_name]
            elif item_type == 'setelan':
                specs = {
                    'ALL SIZE': {'chest_width': 110, 'body_length': 68, 'waist_width': 78, 'shoulder_width': 44, 'sleeve_length': 52},
                    'STANDAR': {'chest_width': 106, 'body_length': 66, 'waist_width': 74, 'shoulder_width': 42, 'sleeve_length': 50},
                    'JUMBO': {'chest_width': 122, 'body_length': 72, 'waist_width': 92, 'shoulder_width': 48, 'sleeve_length': 55},
                    'S': {'chest_width': 98, 'body_length': 64, 'waist_width': 68, 'shoulder_width': 40, 'sleeve_length': 48},
                    'M': {'chest_width': 104, 'body_length': 66, 'waist_width': 72, 'shoulder_width': 42, 'sleeve_length': 50},
                    'L': {'chest_width': 110, 'body_length': 68, 'waist_width': 78, 'shoulder_width': 44, 'sleeve_length': 52},
                    'XL': {'chest_width': 116, 'body_length': 70, 'waist_width': 84, 'shoulder_width': 46, 'sleeve_length': 54},
                    'XXL': {'chest_width': 122, 'body_length': 72, 'waist_width': 90, 'shoulder_width': 48, 'sleeve_length': 55},
                }[size_name]
            elif item_type == 'kids':
                specs = {
                    'ALL SIZE': {'chest_width': 74, 'body_length': 48, 'waist_width': 56, 'shoulder_width': 32, 'sleeve_length': 16},
                    'STANDAR': {'chest_width': 70, 'body_length': 46, 'waist_width': 52, 'shoulder_width': 30, 'sleeve_length': 15},
                    'JUMBO': {'chest_width': 84, 'body_length': 54, 'waist_width': 64, 'shoulder_width': 36, 'sleeve_length': 18},
                    'S': {'chest_width': 64, 'body_length': 42, 'waist_width': 48, 'shoulder_width': 28, 'sleeve_length': 14},
                    'M': {'chest_width': 70, 'body_length': 46, 'waist_width': 52, 'shoulder_width': 30, 'sleeve_length': 15},
                    'L': {'chest_width': 76, 'body_length': 50, 'waist_width': 56, 'shoulder_width': 32, 'sleeve_length': 16},
                    'XL': {'chest_width': 82, 'body_length': 53, 'waist_width': 60, 'shoulder_width': 34, 'sleeve_length': 17},
                    'XXL': {'chest_width': 88, 'body_length': 56, 'waist_width': 64, 'shoulder_width': 36, 'sleeve_length': 18},
                }[size_name]
            elif item_type == 'kain_pantai':
                specs = {
                    'ALL SIZE': {'body_length': 180, 'chest_width': 120},
                    'STANDAR': {'body_length': 170, 'chest_width': 115},
                    'JUMBO': {'body_length': 200, 'chest_width': 140},
                    'S': {'body_length': 165, 'chest_width': 110},
                    'M': {'body_length': 175, 'chest_width': 115},
                    'L': {'body_length': 180, 'chest_width': 120},
                    'XL': {'body_length': 190, 'chest_width': 130},
                    'XXL': {'body_length': 200, 'chest_width': 140},
                }[size_name]
            elif item_type == 'hijab':
                specs = {
                    'ALL SIZE': {'body_length': 115, 'chest_width': 115},
                    'STANDAR': {'body_length': 110, 'chest_width': 110},
                    'JUMBO': {'body_length': 130, 'chest_width': 130},
                    'S': {'body_length': 110, 'chest_width': 110},
                    'M': {'body_length': 115, 'chest_width': 115},
                    'L': {'body_length': 120, 'chest_width': 120},
                    'XL': {'body_length': 130, 'chest_width': 130},
                    'XXL': {'body_length': 140, 'chest_width': 140},
                }[size_name]
            elif item_type == 'mukena':
                specs = {
                    'ALL SIZE': {'chest_width': 125, 'body_length': 118, 'waist_width': 80},
                    'STANDAR': {'chest_width': 120, 'body_length': 115, 'waist_width': 76},
                    'JUMBO': {'chest_width': 135, 'body_length': 125, 'waist_width': 94},
                    'S': {'chest_width': 115, 'body_length': 112, 'waist_width': 72},
                    'M': {'chest_width': 120, 'body_length': 115, 'waist_width': 76},
                    'L': {'chest_width': 125, 'body_length': 118, 'waist_width': 80},
                    'XL': {'chest_width': 130, 'body_length': 122, 'waist_width': 88},
                    'XXL': {'chest_width': 135, 'body_length': 125, 'waist_width': 94},
                }[size_name]
            else:
                # Default: Kaos / Outer
                specs = {
                    'ALL SIZE': {'chest_width': 108, 'body_length': 70, 'shoulder_width': 45, 'sleeve_length': 22},
                    'STANDAR': {'chest_width': 104, 'body_length': 68, 'shoulder_width': 43, 'sleeve_length': 21},
                    'JUMBO': {'chest_width': 120, 'body_length': 74, 'shoulder_width': 50, 'sleeve_length': 25},
                    'S': {'chest_width': 96, 'body_length': 66, 'shoulder_width': 41, 'sleeve_length': 20},
                    'M': {'chest_width': 102, 'body_length': 68, 'shoulder_width': 43, 'sleeve_length': 21},
                    'L': {'chest_width': 108, 'body_length': 70, 'shoulder_width': 45, 'sleeve_length': 22},
                    'XL': {'chest_width': 114, 'body_length': 72, 'shoulder_width': 47, 'sleeve_length': 23},
                    'XXL': {'chest_width': 120, 'body_length': 74, 'shoulder_width': 49, 'sleeve_length': 24},
                }[size_name]

            variants.append({
                'size': size_name,
                'color': color_name,
                'stock': stock_val,
                **specs,
            })
    return variants


REALISTIC_PRODUCTS = [
    # 1. KULOT (Crinkle / Motif)
    {
        "title": "Celana Kulot Crinkle Airflow Highwaist",
        "description": "Celana kulot model highwaist berbahan Crinkle Airflow Grade A yang jatuh sempurna, adem, ironless (tidak perlu disetrika), dan tidak menerawang. Pinggang belakang full karet elastis yang nyaman mengikuti bentuk pinggang tanpa terasa sesak, dilengkapi saku samping kanan-kiri yang dalam.",
        "category": "Kulot",
        "base_price": 65000,
        "size_guide": "Pinggang karet elastis fleksibel. Tersedia lengkap dari All Size, Standar, Jumbo hingga S–XXL.",
        "images": [
            {"url": "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=1200&q=85", "is_primary": True, "alt": "Celana Kulot Crinkle Airflow Krem", "color": "Krem Susu"},
            {"url": "https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=1200&q=85", "is_primary": False, "alt": "Celana Kulot Crinkle Airflow Hitam", "color": "Hitam Pekat"},
        ],
        "variants": build_variants([
            ("Krem Susu", [18, 15, 12, 8, 14, 12, 10, 6]),
            ("Hitam Pekat", [20, 16, 14, 10, 15, 14, 9, 5]),
        ], item_type='kulot'),
    },
    # 2. KULOT POLOS
    {
        "title": "Kulot Polos Linen Look Loose Pants",
        "description": "Kulot polos berpotongan lurus longgar (loose wide-leg) dari bahan Linen Look Soft Weave yang sejuk di kulit dan memberi kesan rapi. Cocok dipadukan dengan kaos harian, blouse, maupun outer untuk beraktivitas di rumah, kuliah, atau jalan santai.",
        "category": "Kulot",
        "base_price": 69000,
        "size_guide": "Potongan loose wide-leg dengan karet pinggang elastis dan tali serut hidup.",
        "images": [
            {"url": "https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=1200&q=85", "is_primary": True, "alt": "Kulot Polos Linen Look Charcoal", "color": "Abu Charcoal"},
            {"url": "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=1200&q=85", "is_primary": False, "alt": "Kulot Polos Linen Look Milo", "color": "Cokelat Milo"},
        ],
        "variants": build_variants([
            ("Abu Charcoal", [16, 14, 10, 7, 12, 12, 8, 5]),
            ("Cokelat Milo", [14, 12, 9, 6, 10, 10, 7, 4]),
        ], item_type='kulot'),
    },
    # 3. CELANA PENDEK
    {
        "title": "Celana Pendek Santai Katun Rayon Daily",
        "description": "Celana pendek harian super adem dari bahan Katun Rayon pilihan yang halus, ringan, dan menyerap keringat dengan cepat. Jahitan selangkangan ganda anti-sobek, karet pinggang elastis empuk, dan saku samping fungsional untuk bersantai di rumah.",
        "category": "Celana Pendek & Bogo",
        "base_price": 32000,
        "size_guide": "Pinggang full karet melar nyaman. Tersedia semua ukuran untuk dewasa & remaja.",
        "images": [
            {"url": "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=1200&q=85", "is_primary": True, "alt": "Celana Pendek Santai Olive", "color": "Olive Green"},
            {"url": "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=1200&q=85", "is_primary": False, "alt": "Celana Pendek Santai Khaki", "color": "Khaki Cream"},
        ],
        "variants": build_variants([
            ("Olive Green", [25, 20, 15, 10, 16, 18, 12, 8]),
            ("Khaki Cream", [22, 18, 14, 8, 14, 15, 10, 6]),
        ], item_type='shorts'),
    },
    # 4. BOGO
    {
        "title": "Celana Pendek Bogo Tali Serut Santai",
        "description": "Celana pendek Bogo legendaris yang terkenal awet, praktis, dan adem dipakai sehari-hari. Dilengkapi karet pinggang elastis dengan tali serut aktif serta kantong samping. Pilihan favorit untuk pakaian santai harian di rumah maupun liburan.",
        "category": "Celana Pendek & Bogo",
        "base_price": 25000,
        "size_guide": "Model Bogo unisex santai, lingkar paha longgar bebas bergerak.",
        "images": [
            {"url": "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=1200&q=85", "is_primary": True, "alt": "Celana Bogo Tali Serut Beige", "color": "Beige Tan"},
            {"url": "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=1200&q=85", "is_primary": False, "alt": "Celana Bogo Tali Serut Army", "color": "Hijau Army"},
        ],
        "variants": build_variants([
            ("Beige Tan", [30, 24, 18, 12, 20, 20, 14, 10]),
            ("Hijau Army", [28, 22, 16, 10, 18, 18, 12, 8]),
        ], item_type='shorts'),
    },
    # 5. KAOS
    {
        "title": "Kaos Harian Cotton Combed 30s Adem",
        "description": "Kaos oblong harian berbahan 100% Cotton Combed 30s asli yang lembut, sejuk, dan tidak membuat gerah di cuaca panas. Kerah bulat rib rapi yang tidak mudah melar setelah dicuci, potongan nyaman untuk pria maupun wanita (unisex).",
        "category": "Kaos",
        "base_price": 49000,
        "size_guide": "Tersedia lengkap ukuran All Size, Standar, Jumbo, hingga S, M, L, XL, XXL.",
        "images": [
            {"url": "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=1200&q=85", "is_primary": True, "alt": "Kaos Harian Cotton Combed Stone Grey", "color": "Abu Misty"},
            {"url": "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=1200&q=85", "is_primary": False, "alt": "Kaos Harian Cotton Combed Hitam", "color": "Hitam Polos"},
            {"url": "https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=1200&q=85", "is_primary": False, "alt": "Kaos Harian Cotton Combed Putih", "color": "Putih Bersih"},
        ],
        "variants": build_variants([
            ("Abu Misty", [20, 16, 12, 10, 18, 18, 12, 8]),
            ("Hitam Polos", [24, 20, 15, 12, 20, 22, 15, 10]),
            ("Putih Bersih", [18, 15, 10, 8, 14, 16, 10, 6]),
        ], item_type='top'),
    },
    # 6. DASTER
    {
        "title": "Daster Rayon Viscose Busui Friendly Adem",
        "description": "Daster harian favorit berbahan Rayon Viscose Premium yang terkenal sangat adem, halus, dan jatuh lembut di badan. Dilengkapi resleting depan (Busui Friendly) sepanjang 20 cm, kantong samping kanan untuk menyimpan HP/uang, serta motif cantik yang tidak luntur.",
        "category": "Daster",
        "base_price": 55000,
        "size_guide": "Potongan longgar leluasa, sangat nyaman untuk ibu menyusui maupun santai di rumah.",
        "images": [
            {"url": "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=1200&q=85", "is_primary": True, "alt": "Daster Rayon Viscose Motif Terracotta", "color": "Motif Terracotta"},
            {"url": "https://images.unsplash.com/photo-1551163943-3f7fb596e61f?w=1200&q=85", "is_primary": False, "alt": "Daster Rayon Viscose Motif Sage", "color": "Motif Sage Green"},
        ],
        "variants": build_variants([
            ("Motif Terracotta", [25, 20, 18, 10, 15, 16, 12, 8]),
            ("Motif Sage Green", [22, 18, 16, 8, 14, 15, 10, 7]),
        ], item_type='daster'),
    },
    # 7. SETELAN PANJANG/PENDEK
    {
        "title": "One Set Setelan Rayon Lengan Panjang & Pendek",
        "description": "Setelan harian serbaguna (atasan + celana senada) berbahan Rayon Twill adem yang tidak tipis. Kancing depan hidup penuh (Busui Friendly) dan celana pinggang karet elastis yang nyaman untuk tidur, santai di rumah, maupun keluar rumah.",
        "category": "Setelan",
        "base_price": 89000,
        "size_guide": "Harga sudah termasuk 1 set lengkap (Baju Atasan + Celana Bawahan).",
        "images": [
            {"url": "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=1200&q=85", "is_primary": True, "alt": "One Set Setelan Rayon Sage Green", "color": "Set Panjang Sage"},
            {"url": "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=1200&q=85", "is_primary": False, "alt": "One Set Setelan Rayon Putih Krem", "color": "Set Pendek Krem"},
        ],
        "variants": build_variants([
            ("Set Panjang Sage", [16, 14, 12, 8, 12, 14, 10, 6]),
            ("Set Pendek Krem", [18, 15, 12, 9, 14, 14, 9, 5]),
        ], item_type='setelan'),
    },
    # 8. KAIN PANTAI
    {
        "title": "Kain Pantai Bali Rayon Rumbai Motif Tropis",
        "description": "Kain pantai khas Bali berukuran lebar dengan aksen rumbai cantik di kedua ujungnya. Terbuat dari bahan Rayon Santung lembut yang adem, cepat kering, dan multifungsi: bisa dijadikan sarung pantai, outer lilit, rok lilit, alas piknik, maupun selimut tipis perjalanan.",
        "category": "Kain Pantai",
        "base_price": 42000,
        "size_guide": "Ukuran kain lebar menutup sempurna, mudah diikat menjadi berbagai gaya rok atau dress pantai.",
        "images": [
            {"url": "https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=1200&q=85", "is_primary": True, "alt": "Kain Pantai Bali Motif Bunga Sunset", "color": "Motif Sunset"},
            {"url": "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=1200&q=85", "is_primary": False, "alt": "Kain Pantai Bali Motif Biru Laut", "color": "Motif Biru Laut"},
        ],
        "variants": build_variants([
            ("Motif Sunset", [30, 22, 18, 10, 15, 15, 10, 8]),
            ("Motif Biru Laut", [26, 20, 15, 8, 12, 14, 10, 6]),
        ], item_type='kain_pantai'),
    },
    # 9. OUTER
    {
        "title": "Outer Kimono Cardigan Crinkle Airflow",
        "description": "Outer model kimono/cardigan terbuka tanpa kancing yang praktis langsung pakai (throw-on). Menggunakan bahan Crinkle Airflow bertekstur lembut yang jatuh anggun, lengan lebar wudhu-friendly, dan cocok dipadukan dengan kaos, daster, kulot, maupun dress.",
        "category": "Outer",
        "base_price": 68000,
        "size_guide": "Potongan loose kimono terbuka di bagian depan, leluasa untuk berbagai bentuk tubuh.",
        "images": [
            {"url": "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=1200&q=85", "is_primary": True, "alt": "Outer Kimono Cardigan Mocha", "color": "Mocha Brown"},
            {"url": "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=1200&q=85", "is_primary": False, "alt": "Outer Kimono Cardigan Broken White", "color": "Broken White"},
        ],
        "variants": build_variants([
            ("Mocha Brown", [15, 14, 10, 7, 12, 12, 8, 5]),
            ("Broken White", [14, 12, 9, 6, 10, 10, 7, 4]),
        ], item_type='top'),
    },
    # 10. SETELAN ANAK
    {
        "title": "Setelan Anak Katun Combed Lembut Harian",
        "description": "Setelan baju dan celana anak berbahan 100% Katun Combed lembut yang hipoalergenik, bebas gatal, dan menyerap keringat dengan sangat baik untuk anak yang aktif bermain. Karet pinggang celana ekstra lentur dan tidak meninggalkan bekas di perut anak.",
        "category": "Setelan Anak",
        "base_price": 45000,
        "size_guide": "Tersedia lengkap ukuran anak dari S (1-2 Thn), M (3-4 Thn), L (5-6 Thn), XL (7-8 Thn), XXL (9-10 Thn) hingga All Size/Standar/Jumbo.",
        "images": [
            {"url": "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=1200&q=85", "is_primary": True, "alt": "Setelan Anak Katun Combed Biru", "color": "Biru Cerah"},
            {"url": "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=1200&q=85", "is_primary": False, "alt": "Setelan Anak Katun Combed Kuning", "color": "Soft Sage"},
        ],
        "variants": build_variants([
            ("Biru Cerah", [18, 16, 12, 14, 18, 18, 14, 10]),
            ("Soft Sage", [15, 14, 10, 12, 16, 16, 12, 8]),
        ], item_type='kids'),
    },
    # 11. MUKENA
    {
        "title": "Mukena Bali Rayon Premium 2in1 Travel Pouch",
        "description": "Mukena dewasa bahan Rayon Janger Bali asli yang terkenal sangat dingin, lembut di wajah, dan tidak menerawang. Model 2-in-1 dengan resleting di bawah dagu sehingga bisa dipakai biasa maupun ponco (tanpa merusak tatanan hijab), sudah termasuk tas pouch cantik.",
        "category": "Mukena & Hijab",
        "base_price": 135000,
        "size_guide": "Ukuran mukena leluasa menutup aurat dengan sempurna, dilengkapi tas pouch senada.",
        "images": [
            {"url": "https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=1200&q=85", "is_primary": True, "alt": "Mukena Bali Rayon Premium Champagne", "color": "Champagne Rose"},
            {"url": "https://images.unsplash.com/photo-1548883354-7622d03aca27?w=1200&q=85", "is_primary": False, "alt": "Mukena Bali Rayon Premium Dove Grey", "color": "Dove Grey"},
        ],
        "variants": build_variants([
            ("Champagne Rose", [20, 16, 14, 8, 12, 14, 10, 8]),
            ("Dove Grey", [18, 14, 12, 6, 10, 12, 8, 6]),
        ], item_type='mukena'),
    },
    # 12. HIJAB
    {
        "title": "Hijab Segi Empat Paris Voal Premium Tegak Dahi",
        "description": "Hijab segi empat berbahan Paris Voal Ultrafine yang ringan, langsung tegak paripurna di dahi, mudah dibentuk, dan tidak membuat telinga berdengung. Finishing jahit tepi kecil (lasercut/neci rapi) yang awet untuk pemakaian harian maupun acara spesial.",
        "category": "Mukena & Hijab",
        "base_price": 29000,
        "size_guide": "Tersedia ukuran Reguler/Standar (110x110 cm), All Size (115x115 cm), hingga Syar'i/Jumbo (130x130 cm).",
        "images": [
            {"url": "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=1200&q=85", "is_primary": True, "alt": "Hijab Segi Empat Paris Voal Caramel", "color": "Caramel Latte"},
            {"url": "https://images.unsplash.com/photo-1578932750294-f5075e85f44a?w=1200&q=85", "is_primary": False, "alt": "Hijab Segi Empat Paris Voal Navy", "color": "Navy Blue"},
        ],
        "variants": build_variants([
            ("Caramel Latte", [35, 28, 20, 12, 20, 20, 15, 10]),
            ("Navy Blue", [30, 24, 18, 10, 18, 18, 12, 8]),
        ], item_type='hijab'),
    },
]


DEFAULT_SHIPPING_RATES = [
    ("DKI Jakarta", 10000, "1-2 Hari", 1),
    ("Jawa Barat", 10000, "1-2 Hari", 2),
    ("Banten", 10000, "1-2 Hari", 3),
    ("Jawa Tengah", 15000, "2-3 Hari", 4),
    ("D.I. Yogyakarta", 15000, "2-3 Hari", 5),
    ("Jawa Timur", 15000, "2-3 Hari", 6),
    ("Bali", 20000, "2-3 Hari", 7),
    ("Nusa Tenggara Barat (NTB)", 25000, "3-4 Hari", 8),
    ("Nusa Tenggara Timur (NTT)", 30000, "3-5 Hari", 9),
    ("Lampung", 20000, "2-3 Hari", 10),
    ("Sumatera Selatan", 22000, "2-3 Hari", 11),
    ("Sumatera Barat", 25000, "3-4 Hari", 12),
    ("Riau & Kep. Riau", 25000, "3-4 Hari", 13),
    ("Jambi & Bengkulu", 25000, "2-3 Hari", 14),
    ("Sumatera Utara", 28000, "3-4 Hari", 15),
    ("Aceh", 32000, "3-5 Hari", 16),
    ("Kalimantan Barat & Selatan", 30000, "3-4 Hari", 17),
    ("Kalimantan Tengah & Timur", 32000, "3-5 Hari", 18),
    ("Kalimantan Utara", 38000, "4-6 Hari", 19),
    ("Sulawesi Selatan", 28000, "3-4 Hari", 20),
    ("Sulawesi Lainnya", 35000, "3-5 Hari", 21),
    ("Maluku & Papua", 50000, "4-7 Hari", 22),
]


class Command(BaseCommand):
    help = 'Seeds the database with the 12 core clothing catalog products and 9 merged categories'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clean',
            action='store_true',
            help='Hapus produk & kategori lama dan bangun ulang seluruh data katalog dari awal',
        )

    def handle(self, *args, **options):
        clean_mode = options.get('clean', False)
        self.stdout.write(self.style.MIGRATE_HEADING('🌿 Memulai sinkronisasi katalog pakaian lengkap...'))

        category_names = [
            'Kulot',
            'Celana Pendek & Bogo',
            'Daster',
            'Setelan',
            'Setelan Anak',
            'Kaos',
            'Outer',
            'Kain Pantai',
            'Mukena & Hijab',
        ]

        if clean_mode:
            self.stdout.write(self.style.WARNING('⚠️  Mode Clean: Menghapus produk & kategori lama...'))
            Product.objects.all().delete()
            Category.objects.exclude(name__in=category_names).delete()
            self.stdout.write(self.style.SUCCESS('✓ Produk & kategori lama telah dibersihkan.'))

        # 1. Kategori Pakaian (9 Kategori Gabungan)
        categories = {}
        for name in category_names:
            desired_slug = slugify(name)
            cat, created = Category.objects.update_or_create(
                name=name,
                defaults={'slug': desired_slug}
            )
            categories[name] = cat
            status_text = '✓ Dibuat' if created else '→ Diperbarui'
            self.stdout.write(f"  Kategori: {name} [{cat.slug}] ({status_text})")

        # Bersihkan kategori lama yang sudah tidak memiliki produk
        Category.objects.exclude(name__in=category_names).filter(products__isnull=True).delete()

        # 2. Sinkronisasi Produk & Varian
        for p_data in REALISTIC_PRODUCTS:
            product, p_created = Product.objects.get_or_create(
                title=p_data['title'],
                defaults={
                    'description': p_data['description'],
                    'category': categories[p_data['category']],
                    'base_price': decimal.Decimal(p_data['base_price']),
                    'size_guide': p_data.get('size_guide', ''),
                    'is_active': True,
                }
            )

            if not p_created:
                product.description = p_data['description']
                product.category = categories[p_data['category']]
                product.base_price = decimal.Decimal(p_data['base_price'])
                product.size_guide = p_data.get('size_guide', '')
                product.is_active = True
                product.save()

            # Sinkronisasi Gambar
            for i, img_data in enumerate(p_data.get('images', [])):
                ProductImage.objects.update_or_create(
                    product=product,
                    image_url=img_data['url'],
                    color=img_data.get('color', ''),
                    defaults={
                        'alt_text': img_data.get('alt', ''),
                        'is_primary': img_data.get('is_primary', i == 0),
                        'sort_order': i,
                    }
                )

            # Sinkronisasi Varian & Stok
            for v_data in p_data.get('variants', []):
                Variant.objects.update_or_create(
                    product=product,
                    size=v_data['size'],
                    color=v_data['color'],
                    defaults={
                        'stock_quantity': v_data['stock'],
                        'chest_width': v_data.get('chest_width'),
                        'body_length': v_data.get('body_length'),
                        'shoulder_width': v_data.get('shoulder_width'),
                        'sleeve_length': v_data.get('sleeve_length'),
                        'waist_width': v_data.get('waist_width'),
                    }
                )

            total_variants = product.variants.count()
            total_stock = product.total_stock
            self.stdout.write(
                f"  ✓ {product.title[:45]} | {total_variants} Varian | Total Stok: {total_stock} pcs"
            )

        # 3. Pastikan Tarif Ongkir Daerah Tersedia
        for prov, cost, est, order_idx in DEFAULT_SHIPPING_RATES:
            ShippingRate.objects.get_or_create(
                province=prov,
                defaults={
                    'cost': decimal.Decimal(cost),
                    'estimated_delivery': est,
                    'is_active': True,
                    'sort_order': order_idx,
                }
            )

        self.stdout.write(self.style.SUCCESS('\n✨ Sinkronisasi data katalog pakaian berhasil!'))
        self.stdout.write(f"   Total Kategori: {Category.objects.count()}")
        self.stdout.write(f"   Total Produk Aktif: {Product.objects.filter(is_active=True).count()}")
        self.stdout.write(f"   Total Varian: {Variant.objects.count()}")
