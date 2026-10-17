"""
Management command to seed the database with realistic, high-fashion clothing catalog data.

Usage: python manage.py seed_data [--clean]
"""
from django.core.management.base import BaseCommand
from inventory.models import Category, Product, ProductImage, Variant, ShippingRate
import decimal


REALISTIC_PRODUCTS = [
    {
        "title": "Kemeja Linen French Relaxed Sage",
        "description": "Kemeja berbahan 100% French Linen premium dengan proses finishing garment-washed untuk tekstur lembut sejak pemakaian pertama. Memiliki kerah model Cuban (camp collar) yang rileks, saku tempel di dada kiri, serta kancing cangkang kerang alami. Sirkulasi udara optimal, sangat nyaman dan adem untuk iklim tropis maupun liburan santai.",
        "category": "Kemeja",
        "base_price": 389000,
        "size_guide": "Model pria bertinggi badan 176 cm, berat badan 65 kg, mengenakan ukuran M.",
        "images": [
            {"url": "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=1200&q=85", "is_primary": True, "alt": "Kemeja Linen French Relaxed Sage", "color": "Sage Green"},
            {"url": "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=1200&q=85", "is_primary": False, "alt": "Detail tekstur French Linen Sage", "color": "Sage Green"},
            {"url": "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=1200&q=85", "is_primary": False, "alt": "Kemeja Linen French Relaxed Putih Krem", "color": "Putih Krem"},
        ],
        "variants": [
            {"size": "S", "color": "Sage Green", "stock": 8, "chest_width": 102, "body_length": 71, "shoulder_width": 44, "sleeve_length": 24},
            {"size": "M", "color": "Sage Green", "stock": 14, "chest_width": 106, "body_length": 73, "shoulder_width": 46, "sleeve_length": 25},
            {"size": "L", "color": "Sage Green", "stock": 6, "chest_width": 112, "body_length": 75, "shoulder_width": 48, "sleeve_length": 26},
            {"size": "XL", "color": "Sage Green", "stock": 2, "chest_width": 118, "body_length": 77, "shoulder_width": 50, "sleeve_length": 27},
            {"size": "S", "color": "Putih Krem", "stock": 10, "chest_width": 102, "body_length": 71, "shoulder_width": 44, "sleeve_length": 24},
            {"size": "M", "color": "Putih Krem", "stock": 12, "chest_width": 106, "body_length": 73, "shoulder_width": 46, "sleeve_length": 25},
            {"size": "L", "color": "Putih Krem", "stock": 5, "chest_width": 112, "body_length": 75, "shoulder_width": 48, "sleeve_length": 26},
            {"size": "XL", "color": "Putih Krem", "stock": 0, "chest_width": 118, "body_length": 77, "shoulder_width": 50, "sleeve_length": 27},
        ]
    },
    {
        "title": "Kemeja Oxford Button-Down Classic White",
        "description": "Kemeja kerja klasik esensial dari 100% Katun Oxford 40s benang ganda dengan tenunan rapat yang kokoh namun tetap fleksibel. Dilengkapi kerah button-down berstruktur rapi, jahitan presisi single-needle seam, dan pleat belakang untuk kebebasan gerak maksimal. Wajib dimiliki untuk tampilan semi-formal profesional maupun gaya smart-casual.",
        "category": "Kemeja",
        "base_price": 329000,
        "size_guide": "Model pria bertinggi 178 cm, berat 70 kg, mengenakan ukuran L untuk regular fit.",
        "images": [
            {"url": "https://images.unsplash.com/photo-1620012253295-c15c429fbb41?w=1200&q=85", "is_primary": True, "alt": "Kemeja Oxford Button-Down Putih Bersih", "color": "Putih Bersih"},
            {"url": "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=1200&q=85", "is_primary": False, "alt": "Kemeja Oxford Button-Down Biru Langit", "color": "Biru Langit"},
        ],
        "variants": [
            {"size": "S", "color": "Putih Bersih", "stock": 12, "chest_width": 100, "body_length": 72, "shoulder_width": 43, "sleeve_length": 61},
            {"size": "M", "color": "Putih Bersih", "stock": 18, "chest_width": 104, "body_length": 74, "shoulder_width": 45, "sleeve_length": 62},
            {"size": "L", "color": "Putih Bersih", "stock": 10, "chest_width": 110, "body_length": 76, "shoulder_width": 47, "sleeve_length": 63},
            {"size": "XL", "color": "Putih Bersih", "stock": 4, "chest_width": 116, "body_length": 78, "shoulder_width": 49, "sleeve_length": 64},
            {"size": "S", "color": "Biru Langit", "stock": 7, "chest_width": 100, "body_length": 72, "shoulder_width": 43, "sleeve_length": 61},
            {"size": "M", "color": "Biru Langit", "stock": 9, "chest_width": 104, "body_length": 74, "shoulder_width": 45, "sleeve_length": 62},
            {"size": "L", "color": "Biru Langit", "stock": 6, "chest_width": 110, "body_length": 76, "shoulder_width": 47, "sleeve_length": 63},
            {"size": "XL", "color": "Biru Langit", "stock": 0, "chest_width": 116, "body_length": 78, "shoulder_width": 49, "sleeve_length": 64},
        ]
    },
    {
        "title": "Kemeja Flannel Tartan Vintage Navy",
        "description": "Kemeja kasual bermotif tartan klasik dari bahan 100% Brushed Cotton 210gsm tebal yang melalui proses brushing ganda agar berbulu halus dan empuk. Menggunakan benang celup (yarn-dyed) sehingga warna tahan pudar bertahun-tahun. Dilengkapi dual flap chest pockets dan kancing berukir motif kayu vintage.",
        "category": "Kemeja",
        "base_price": 299000,
        "size_guide": "Model pria bertinggi 172 cm, berat 62 kg, mengenakan ukuran M.",
        "images": [
            {"url": "https://images.unsplash.com/photo-1578932750294-f5075e85f44a?w=1200&q=85", "is_primary": True, "alt": "Kemeja Flannel Tartan Vintage Navy", "color": "Navy Blue"},
            {"url": "https://images.unsplash.com/photo-1603252109303-2751441dd157?w=1200&q=85", "is_primary": False, "alt": "Kemeja Flannel Tartan Vintage Maroon", "color": "Maroon Red"},
        ],
        "variants": [
            {"size": "S", "color": "Navy Blue", "stock": 10, "chest_width": 104, "body_length": 72, "shoulder_width": 45, "sleeve_length": 60},
            {"size": "M", "color": "Navy Blue", "stock": 15, "chest_width": 108, "body_length": 74, "shoulder_width": 47, "sleeve_length": 61},
            {"size": "L", "color": "Navy Blue", "stock": 20, "chest_width": 114, "body_length": 76, "shoulder_width": 49, "sleeve_length": 62},
            {"size": "XL", "color": "Navy Blue", "stock": 8, "chest_width": 120, "body_length": 78, "shoulder_width": 51, "sleeve_length": 63},
            {"size": "S", "color": "Maroon Red", "stock": 5, "chest_width": 104, "body_length": 72, "shoulder_width": 45, "sleeve_length": 60},
            {"size": "M", "color": "Maroon Red", "stock": 10, "chest_width": 108, "body_length": 74, "shoulder_width": 47, "sleeve_length": 61},
            {"size": "L", "color": "Maroon Red", "stock": 12, "chest_width": 114, "body_length": 76, "shoulder_width": 49, "sleeve_length": 62},
            {"size": "XL", "color": "Maroon Red", "stock": 3, "chest_width": 120, "body_length": 78, "shoulder_width": 51, "sleeve_length": 63},
        ]
    },
    {
        "title": "Wide Leg Pleated Trousers Cream",
        "description": "Celana panjang model wide leg kontemporer dengan aksen lipit depan ganda (double pleats) yang memberi siluet jatuh tegas dan memanjangkan siluet kaki. Dibuat dari material Crepe Semi-Wool berkualitas tinggi yang tidak mudah kusut, berbobot pas, dan sejuk. Dilengkapi kantong samping dalam dan ban pinggang belakang semi-karet elastis tersembunyi.",
        "category": "Celana",
        "base_price": 395000,
        "size_guide": "Model wanita bertinggi 168 cm, pinggang 66 cm, mengenakan ukuran S.",
        "images": [
            {"url": "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=1200&q=85", "is_primary": True, "alt": "Wide Leg Pleated Trousers Cream", "color": "Cream"},
            {"url": "https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=1200&q=85", "is_primary": False, "alt": "Wide Leg Pleated Trousers Charcoal", "color": "Charcoal"},
        ],
        "variants": [
            {"size": "S", "color": "Cream", "stock": 4, "waist_width": 68, "body_length": 100},
            {"size": "M", "color": "Cream", "stock": 7, "waist_width": 72, "body_length": 102},
            {"size": "L", "color": "Cream", "stock": 2, "waist_width": 78, "body_length": 104},
            {"size": "XL", "color": "Cream", "stock": 0, "waist_width": 84, "body_length": 106},
            {"size": "S", "color": "Charcoal", "stock": 0, "waist_width": 68, "body_length": 100},
            {"size": "M", "color": "Charcoal", "stock": 5, "waist_width": 72, "body_length": 102},
            {"size": "L", "color": "Charcoal", "stock": 8, "waist_width": 78, "body_length": 104},
            {"size": "XL", "color": "Charcoal", "stock": 6, "waist_width": 84, "body_length": 106},
        ]
    },
    {
        "title": "Slim Fit Chino Pants Olive Green",
        "description": "Celana chino slim-fit modern dari bahan Katun Twill Stretch 280gsm (98% katun, 2% elastane) yang tahan aus namun tetap elastis mengikuti setiap pergerakan. Menggunakan ritsleting metal YKK original, saku koin kecil tersembunyi, serta saku belakang ganda berkancing.",
        "category": "Celana",
        "base_price": 349000,
        "size_guide": "Model pria bertinggi 175 cm, berat 67 kg, mengenakan ukuran 32 (M).",
        "images": [
            {"url": "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=1200&q=85", "is_primary": True, "alt": "Slim Fit Chino Pants Olive Green", "color": "Olive Green"},
            {"url": "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=1200&q=85", "is_primary": False, "alt": "Slim Fit Chino Pants Khaki Beige", "color": "Khaki Beige"},
        ],
        "variants": [
            {"size": "S", "color": "Olive Green", "stock": 6, "waist_width": 76, "body_length": 98},
            {"size": "M", "color": "Olive Green", "stock": 14, "waist_width": 80, "body_length": 100},
            {"size": "L", "color": "Olive Green", "stock": 11, "waist_width": 85, "body_length": 102},
            {"size": "XL", "color": "Olive Green", "stock": 5, "waist_width": 90, "body_length": 104},
            {"size": "S", "color": "Khaki Beige", "stock": 8, "waist_width": 76, "body_length": 98},
            {"size": "M", "color": "Khaki Beige", "stock": 12, "waist_width": 80, "body_length": 100},
            {"size": "L", "color": "Khaki Beige", "stock": 7, "waist_width": 85, "body_length": 102},
            {"size": "XL", "color": "Khaki Beige", "stock": 3, "waist_width": 90, "body_length": 104},
        ]
    },
    {
        "title": "Tiered Midi Dress Rayon Terracotta",
        "description": "Midi dress feminin model bertingkat (tiered) dari bahan 100% Rayon Viscose Twill Grade A bertekstur lembut dan berdaya serap tinggi. Memiliki kerah V-neck yang anggun, lengan puff berkaret nyaman yang wudhu-friendly, dan saku samping fungsional. Siluet flowy memberi kesan anggun dan sejuk dipakai sepanjang hari.",
        "category": "Dress",
        "base_price": 425000,
        "size_guide": "Model wanita bertinggi 165 cm, berat 50 kg, mengenakan ukuran S.",
        "images": [
            {"url": "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=1200&q=85", "is_primary": True, "alt": "Tiered Midi Dress Rayon Terracotta", "color": "Terracotta"},
            {"url": "https://images.unsplash.com/photo-1551163943-3f7fb596e61f?w=1200&q=85", "is_primary": False, "alt": "Tiered Midi Dress Sage Green", "color": "Sage Green"},
        ],
        "variants": [
            {"size": "XS", "color": "Terracotta", "stock": 3, "chest_width": 88, "body_length": 115, "waist_width": 70},
            {"size": "S", "color": "Terracotta", "stock": 8, "chest_width": 92, "body_length": 117, "waist_width": 74},
            {"size": "M", "color": "Terracotta", "stock": 10, "chest_width": 98, "body_length": 119, "waist_width": 80},
            {"size": "L", "color": "Terracotta", "stock": 4, "chest_width": 104, "body_length": 121, "waist_width": 86},
            {"size": "XS", "color": "Sage Green", "stock": 2, "chest_width": 88, "body_length": 115, "waist_width": 70},
            {"size": "S", "color": "Sage Green", "stock": 6, "chest_width": 92, "body_length": 117, "waist_width": 74},
            {"size": "M", "color": "Sage Green", "stock": 7, "chest_width": 98, "body_length": 119, "waist_width": 80},
            {"size": "L", "color": "Sage Green", "stock": 0, "chest_width": 104, "body_length": 121, "waist_width": 86},
        ]
    },
    {
        "title": "Satin Bias Cut Slip Dress Navy",
        "description": "Slip dress mewah berbahan Silk Touch Satin dengan kilau halus elegan yang tidak menerawang. Dipotong dengan teknik bias-cut untuk menciptakan efek drapery yang meliuk mengikuti lekuk tubuh secara natural. Dilengkapi tali bahu tipis adjustable dan jahitan kelim Prancis yang halus.",
        "category": "Dress",
        "base_price": 485000,
        "size_guide": "Model wanita bertinggi 170 cm, mengenakan ukuran S.",
        "images": [
            {"url": "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=1200&q=85", "is_primary": True, "alt": "Satin Bias Cut Slip Dress Navy", "color": "Navy Blue"},
            {"url": "https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=1200&q=85", "is_primary": False, "alt": "Satin Bias Cut Slip Dress Champagne Gold", "color": "Champagne Gold"},
        ],
        "variants": [
            {"size": "XS", "color": "Navy Blue", "stock": 0, "chest_width": 86, "body_length": 120},
            {"size": "S", "color": "Navy Blue", "stock": 6, "chest_width": 90, "body_length": 122},
            {"size": "M", "color": "Navy Blue", "stock": 8, "chest_width": 96, "body_length": 124},
            {"size": "L", "color": "Navy Blue", "stock": 3, "chest_width": 102, "body_length": 126},
            {"size": "XS", "color": "Champagne Gold", "stock": 4, "chest_width": 86, "body_length": 120},
            {"size": "S", "color": "Champagne Gold", "stock": 7, "chest_width": 90, "body_length": 122},
            {"size": "M", "color": "Champagne Gold", "stock": 5, "chest_width": 96, "body_length": 124},
            {"size": "L", "color": "Champagne Gold", "stock": 0, "chest_width": 102, "body_length": 126},
        ]
    },
    {
        "title": "Tailored Oversized Blazer Caramel",
        "description": "Blazer terstruktur modern berpotongan oversized dengan bahu tegas empuk dan notch lapel proporsional. Terbuat dari bahan Wool-Blend berbobot medium yang jatuh rapi dan tidak mudah berkerut. Unlined di bagian badan belakang demi kelancaran sirkulasi udara khas iklim tropis, dilengkapi kancing resin tanduk alami.",
        "category": "Outer",
        "base_price": 689000,
        "size_guide": "Model bertinggi 174 cm, mengenakan ukuran S untuk loose oversized fit.",
        "images": [
            {"url": "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=1200&q=85", "is_primary": True, "alt": "Tailored Oversized Blazer Caramel", "color": "Caramel Tan"},
            {"url": "https://images.unsplash.com/photo-1548883354-7622d03aca27?w=1200&q=85", "is_primary": False, "alt": "Tailored Oversized Blazer Dove Grey", "color": "Dove Grey"},
        ],
        "variants": [
            {"size": "S", "color": "Caramel Tan", "stock": 3, "chest_width": 106, "body_length": 76, "shoulder_width": 46, "sleeve_length": 60},
            {"size": "M", "color": "Caramel Tan", "stock": 6, "chest_width": 112, "body_length": 78, "shoulder_width": 48, "sleeve_length": 61},
            {"size": "L", "color": "Caramel Tan", "stock": 4, "chest_width": 118, "body_length": 80, "shoulder_width": 50, "sleeve_length": 62},
            {"size": "XL", "color": "Caramel Tan", "stock": 1, "chest_width": 124, "body_length": 82, "shoulder_width": 52, "sleeve_length": 63},
            {"size": "S", "color": "Dove Grey", "stock": 0, "chest_width": 106, "body_length": 76, "shoulder_width": 46, "sleeve_length": 60},
            {"size": "M", "color": "Dove Grey", "stock": 5, "chest_width": 112, "body_length": 78, "shoulder_width": 48, "sleeve_length": 61},
            {"size": "L", "color": "Dove Grey", "stock": 7, "chest_width": 118, "body_length": 80, "shoulder_width": 50, "sleeve_length": 62},
            {"size": "XL", "color": "Dove Grey", "stock": 2, "chest_width": 124, "body_length": 82, "shoulder_width": 52, "sleeve_length": 63},
        ]
    },
    {
        "title": "Textured Knit Cardigan Mocha",
        "description": "Cardigan rajut bertekstur wafel tebal terbuat dari benang campuran katun combed dan wol halus (cotton-wool blend). Tekstur rajutan lembut, tidak menusuk atau gatal di kulit, mampu memberi kehangatan tanpa membuat gerah. Saku saku depan ganda dan kancing kayu oak alami menambah pesona hangat dan santai.",
        "category": "Outer",
        "base_price": 549000,
        "size_guide": "Model bertinggi 168 cm, berat 54 kg, mengenakan ukuran M.",
        "images": [
            {"url": "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=1200&q=85", "is_primary": True, "alt": "Textured Knit Cardigan Mocha", "color": "Mocha Brown"},
            {"url": "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=1200&q=85", "is_primary": False, "alt": "Textured Knit Cardigan Broken White", "color": "Broken White"},
        ],
        "variants": [
            {"size": "S", "color": "Mocha Brown", "stock": 6, "chest_width": 104, "body_length": 68, "shoulder_width": 45, "sleeve_length": 58},
            {"size": "M", "color": "Mocha Brown", "stock": 10, "chest_width": 110, "body_length": 70, "shoulder_width": 47, "sleeve_length": 59},
            {"size": "L", "color": "Mocha Brown", "stock": 5, "chest_width": 116, "body_length": 72, "shoulder_width": 49, "sleeve_length": 60},
            {"size": "XL", "color": "Mocha Brown", "stock": 0, "chest_width": 122, "body_length": 74, "shoulder_width": 51, "sleeve_length": 61},
            {"size": "S", "color": "Broken White", "stock": 4, "chest_width": 104, "body_length": 68, "shoulder_width": 45, "sleeve_length": 58},
            {"size": "M", "color": "Broken White", "stock": 7, "chest_width": 110, "body_length": 70, "shoulder_width": 47, "sleeve_length": 59},
            {"size": "L", "color": "Broken White", "stock": 3, "chest_width": 116, "body_length": 72, "shoulder_width": 49, "sleeve_length": 60},
        ]
    },
    {
        "title": "Heavyweight Cotton Boxy Tee Stone",
        "description": "Kaos oblong bersiluet boxy modern terbuat dari 100% Heavyweight Cotton Combed 16s (240gsm) padat dan kokoh. Potongan pundak dropped shoulder dengan rib leher selebar 3 cm yang diperkuat jahitan ganda agar tidak mudah melar sehabis dicuci. Pilihan terbaik untuk streetwear minimalist dan daily wear.",
        "category": "Atasan",
        "base_price": 179000,
        "size_guide": "Model bertinggi 175 cm, berat 65 kg, mengenakan ukuran L untuk loose boxy fit.",
        "images": [
            {"url": "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=1200&q=85", "is_primary": True, "alt": "Heavyweight Cotton Boxy Tee Stone Grey", "color": "Stone Grey"},
            {"url": "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=1200&q=85", "is_primary": False, "alt": "Heavyweight Cotton Boxy Tee Washed Charcoal", "color": "Washed Charcoal"},
        ],
        "variants": [
            {"size": "S", "color": "Stone Grey", "stock": 15, "chest_width": 106, "body_length": 70, "shoulder_width": 48, "sleeve_length": 23},
            {"size": "M", "color": "Stone Grey", "stock": 20, "chest_width": 112, "body_length": 72, "shoulder_width": 50, "sleeve_length": 24},
            {"size": "L", "color": "Stone Grey", "stock": 16, "chest_width": 118, "body_length": 74, "shoulder_width": 52, "sleeve_length": 25},
            {"size": "XL", "color": "Stone Grey", "stock": 8, "chest_width": 124, "body_length": 76, "shoulder_width": 54, "sleeve_length": 26},
            {"size": "S", "color": "Washed Charcoal", "stock": 6, "chest_width": 106, "body_length": 70, "shoulder_width": 48, "sleeve_length": 23},
            {"size": "M", "color": "Washed Charcoal", "stock": 12, "chest_width": 112, "body_length": 72, "shoulder_width": 50, "sleeve_length": 24},
            {"size": "L", "color": "Washed Charcoal", "stock": 9, "chest_width": 118, "body_length": 74, "shoulder_width": 52, "sleeve_length": 25},
            {"size": "XL", "color": "Washed Charcoal", "stock": 3, "chest_width": 124, "body_length": 76, "shoulder_width": 54, "sleeve_length": 26},
        ]
    },
    {
        "title": "Pima Cotton Crewneck Tee Jet Black",
        "description": "Kaos esensial premium dari 100% Pima Cotton 200gsm berserat panjang (extra-long staple). Sentuhan bahan luar biasa lembut mirip sutra, sangat ringan dan memiliki ketahanan warna pekat yang tidak luntur setelah puluhan kali cuci. Potongan regular fit serbaguna yang pas untuk dikenakan langsung atau sebagai pakaian dalam jas/blazer.",
        "category": "Atasan",
        "base_price": 199000,
        "size_guide": "Model bertinggi 177 cm, berat 68 kg, mengenakan ukuran M.",
        "images": [
            {"url": "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=1200&q=85", "is_primary": True, "alt": "Pima Cotton Crewneck Tee Jet Black", "color": "Jet Black"},
            {"url": "https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=1200&q=85", "is_primary": False, "alt": "Pima Cotton Crewneck Tee Pure White", "color": "Pure White"},
        ],
        "variants": [
            {"size": "S", "color": "Jet Black", "stock": 14, "chest_width": 98, "body_length": 70, "shoulder_width": 43, "sleeve_length": 21},
            {"size": "M", "color": "Jet Black", "stock": 18, "chest_width": 102, "body_length": 72, "shoulder_width": 45, "sleeve_length": 22},
            {"size": "L", "color": "Jet Black", "stock": 12, "chest_width": 108, "body_length": 74, "shoulder_width": 47, "sleeve_length": 23},
            {"size": "XL", "color": "Jet Black", "stock": 5, "chest_width": 114, "body_length": 76, "shoulder_width": 49, "sleeve_length": 24},
            {"size": "S", "color": "Pure White", "stock": 10, "chest_width": 98, "body_length": 70, "shoulder_width": 43, "sleeve_length": 21},
            {"size": "M", "color": "Pure White", "stock": 15, "chest_width": 102, "body_length": 72, "shoulder_width": 45, "sleeve_length": 22},
            {"size": "L", "color": "Pure White", "stock": 8, "chest_width": 108, "body_length": 74, "shoulder_width": 47, "sleeve_length": 23},
            {"size": "XL", "color": "Pure White", "stock": 2, "chest_width": 114, "body_length": 76, "shoulder_width": 49, "sleeve_length": 24},
        ]
    },
    {
        "title": "Pleated Wrap Maxi Skirt Terracotta",
        "description": "Rok panjang beraksen lilit asimetris (wrap skirt) dari material Rayon Viscose Crepe premium yang jatuh halus dan melambai anggun. Desain pita lilit fleksibel yang mudah disesuaikan dengan lingkar pinggang, serta aksen lipit depan yang memberi ilusi tubuh jenjang.",
        "category": "Rok",
        "base_price": 329000,
        "size_guide": "Desain Free Size dengan ikat pinggang lilit fleksibel, cocok untuk lingkar pinggang 64 cm hingga 90 cm.",
        "images": [
            {"url": "https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=1200&q=85", "is_primary": True, "alt": "Pleated Wrap Maxi Skirt Terracotta", "color": "Terracotta"},
        ],
        "variants": [
            {"size": "FREE_SIZE", "color": "Terracotta", "stock": 14, "waist_width": 72, "body_length": 92},
            {"size": "FREE_SIZE", "color": "Dusty Rose", "stock": 3, "waist_width": 72, "body_length": 92},
        ]
    },
]


class Command(BaseCommand):
    help = 'Seeds the database with professional production-ready clothing catalog data'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clean',
            action='store_true',
            help='Hapus produk lama dan bangun ulang seluruh data katalog dari awal',
        )

    def handle(self, *args, **options):
        clean_mode = options.get('clean', False)
        self.stdout.write(self.style.MIGRATE_HEADING('🌿 Memulai sinkronisasi katalog pakaian profesional...'))

        if clean_mode:
            self.stdout.write(self.style.WARNING('⚠️  Mode Clean: Menghapus produk lama...'))
            Product.objects.all().delete()
            self.stdout.write(self.style.SUCCESS('✓ Produk lama telah dibersihkan.'))

        # 1. Kategori Pakaian
        categories = {}
        category_names = ['Kemeja', 'Celana', 'Dress', 'Outer', 'Atasan', 'Rok']
        for name in category_names:
            cat, created = Category.objects.get_or_create(name=name)
            categories[name] = cat
            status_text = '✓ Dibuat' if created else '→ Sudah ada'
            self.stdout.write(f"  Kategori: {name} ({status_text})")

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

            # Jika produk sudah ada namun dalam mode update, perbarui deskripsi & harga
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
                    defaults={
                        'alt_text': img_data.get('alt', ''),
                        'color': img_data.get('color', ''),
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

        # 3. Hapus produk tak berkategori atau invalid jika ada
        orphan_products = Product.objects.filter(category__isnull=True)
        if orphan_products.exists():
            for orphan in orphan_products:
                if 'Flannel' in orphan.title or 'Kemeja' in orphan.title:
                    orphan.category = categories['Kemeja']
                    orphan.save()
                else:
                    orphan.delete()

        self.stdout.write(self.style.SUCCESS('\n✨ Sinkronisasi data pakaian profesional berhasil!'))
        self.stdout.write(f"   Total Produk Aktif: {Product.objects.filter(is_active=True).count()}")
        self.stdout.write(f"   Total Varian: {Variant.objects.count()}")
