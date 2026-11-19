"""بيانات تجريبية احترافية لبدء المتجر مباشرة."""
from sqlalchemy.orm import Session

import models
import store_config
from security import hash_password
from settings import ADMIN_PASSWORD, ADMIN_USERNAME
from utils import slugify

CATEGORIES = [
    {
        "name": "رجالي",
        "slug": "men",
        "description": "قطع أساسية وأنيقة لدولاب الرجل العصري.",
        "image_url": "/static/img/cat-men.jpg",
        "sort_order": 1,
    },
    {
        "name": "نسائي",
        "slug": "women",
        "description": "فساتين وبلوزات بتفاصيل ناعمة تناسب كل مناسبة.",
        "image_url": "/static/img/cat-women.jpg",
        "sort_order": 2,
    },
    {
        "name": "أحذية",
        "slug": "shoes",
        "description": "راحة وأناقة في كل خطوة.",
        "image_url": "/static/img/cat-shoes.jpg",
        "sort_order": 3,
    },
    {
        "name": "شنط وإكسسوارات",
        "slug": "bags",
        "description": "تفاصيل صغيرة تكمل الإطلالة.",
        "image_url": "/static/img/cat-bags.jpg",
        "sort_order": 4,
    },
    {
        "name": "ساعات",
        "slug": "watches",
        "description": "ساعات بتصميمات خالدة ودقة عالية.",
        "image_url": "/static/img/cat-watches.jpg",
        "sort_order": 5,
    },
    {
        "name": "عطور",
        "slug": "perfumes",
        "description": "روائح شرقية وزهريه تدوم معاك.",
        "image_url": "/static/img/cat-perfumes.jpg",
        "sort_order": 6,
    },
]

CLOTHING_SIZES = ["S", "M", "L", "XL", "XXL"]
SHOE_SIZES = ["39", "40", "41", "42", "43", "44", "45"]

PRODUCTS = [
    {
        "name": "قميص كتان كلاسيك",
        "slug": "linen-shirt",
        "category": "men",
        "price": 749,
        "compare_at_price": 899,
        "stock": 24,
        "image_url": "/static/img/linen-shirt.jpg",
        "sizes": CLOTHING_SIZES,
        "colors": [
            {"name": "أبيض", "hex": "#F4F1EA"},
            {"name": "بيج", "hex": "#D9C7B2"},
            {"name": "أزرق", "hex": "#3E5C76"},
        ],
        "rating": 4.9,
        "reviews_count": 128,
        "is_featured": True,
        "description": "قميص من الكتان الطبيعي بقصة مريحة، خفيف على الجسم ومثالي لأيام الصيف الطويلة. تفاصيل خياطة نظيفة وأزرار صدفية تمنحه لمسة راقية.",
        "details": "الخامة: 100% كتان طبيعي\nالقصة: Regular fit\nالعناية: غسيل بارد على 30°\nبلد التصنيع: مصر",
    },
    {
        "name": "تيشيرت قطن أساسي",
        "slug": "essential-tee",
        "category": "men",
        "price": 349,
        "compare_at_price": None,
        "stock": 60,
        "image_url": "/static/img/essential-tee.jpg",
        "sizes": CLOTHING_SIZES,
        "colors": [
            {"name": "أبيض", "hex": "#F4F1EA"},
            {"name": "أسود", "hex": "#1B1B1B"},
            {"name": "رمادي", "hex": "#8C8C8C"},
        ],
        "rating": 4.8,
        "reviews_count": 246,
        "is_featured": True,
        "description": "تيشيرت من القطن المصري عالي الجودة، بقصة أوفرسايز عصرية وحافة رقبة مقواة تدوم مع الغسيل. قطعة أساسية في كل دولاب.",
        "details": "الخامة: 100% قطن مصري\nالوزن: 220 جرام\nالقصة: Oversized\nالعناية: غسيل بارد",
    },
    {
        "name": "هودي قطن ثقيل",
        "slug": "heavy-hoodie",
        "category": "men",
        "price": 899,
        "compare_at_price": 1099,
        "stock": 18,
        "image_url": "/static/img/heavy-hoodie.jpg",
        "sizes": ["M", "L", "XL", "XXL"],
        "colors": [
            {"name": "بيج", "hex": "#D9C7B2"},
            {"name": "أسود", "hex": "#1B1B1B"},
        ],
        "rating": 4.7,
        "reviews_count": 84,
        "is_featured": True,
        "description": "هودي بقماش قطن مبطن ثقيل يحافظ على الدفء، بجيب أمامي كبير وقبعة مزدوجة. مناسب للشتا واللوك الكاجوال.",
        "details": "الخامة: قطن مبطن 380 جرام\nالقصة: Relaxed fit\nيحتوي على جيب أمامي\nالعناية: غسيل على 30°",
    },
    {
        "name": "قميص أوكسفورد",
        "slug": "oxford-shirt",
        "category": "men",
        "price": 799,
        "compare_at_price": None,
        "stock": 30,
        "image_url": "/static/img/oxford-shirt.jpg",
        "sizes": ["M", "L", "XL"],
        "colors": [
            {"name": "أزرق", "hex": "#3E5C76"},
            {"name": "أبيض", "hex": "#F4F1EA"},
        ],
        "rating": 4.8,
        "reviews_count": 61,
        "is_featured": False,
        "description": "قميص أوكسفورد بقماش منسوج بإحكام، مناسب للعمل والمناسبات. قصة مستقيمة ولون ثابت لا يبهت.",
        "details": "الخامة: 100% قطن أوكسفورد\nالقصة: Slim fit\nأزرار كلاسيكية\nقابل للكي",
    },
    {
        "name": "فستان ساتان طويل",
        "slug": "satin-dress",
        "category": "women",
        "price": 1290,
        "compare_at_price": 1490,
        "stock": 12,
        "image_url": "/static/img/satin-dress.jpg",
        "sizes": ["S", "M", "L"],
        "colors": [
            {"name": "شامبانيا", "hex": "#E4CBB8"},
            {"name": "أسود", "hex": "#1B1B1B"},
        ],
        "rating": 4.9,
        "reviews_count": 97,
        "is_featured": True,
        "description": "فستان ساتان بلمعة ناعمة وقصة انسيابية تبرز القوام بأناقة. مثالي للسهرات والمناسبات الخاصة.",
        "details": "الخامة: ساتان عالي الجودة\nالقصة: ميدي/طويل\nسحاب خلفي مخفي\nالعناية: غسيل يدوي أو تنظيف جاف",
    },
    {
        "name": "فستان صيفي مطبوع",
        "slug": "summer-dress",
        "category": "women",
        "price": 950,
        "compare_at_price": None,
        "stock": 20,
        "image_url": "/static/img/summer-dress.jpg",
        "sizes": ["S", "M", "L", "XL"],
        "colors": [
            {"name": "متعدد", "hex": "#C98B6B"},
            {"name": "أزرق", "hex": "#3E5C76"},
        ],
        "rating": 4.6,
        "reviews_count": 53,
        "is_featured": False,
        "description": "فستان خفيف بطبعات مستوحاة من الطبيعة، بقصة واسعة مريحة وأكمام قصيرة. قطعة منعشة لأيام المصيف.",
        "details": "الخامة: فيسكوز ناعم\nالقصة: A-line\nأكمام قصيرة\nمبطن من الداخل",
    },
    {
        "name": "بلوزة حرير ناعمة",
        "slug": "silk-blouse",
        "category": "women",
        "price": 680,
        "compare_at_price": 820,
        "stock": 25,
        "image_url": "/static/img/silk-blouse.jpg",
        "sizes": ["S", "M", "L"],
        "colors": [
            {"name": "أوف وايت", "hex": "#EFEAE0"},
            {"name": "وردي", "hex": "#D8A7A7"},
        ],
        "rating": 4.7,
        "reviews_count": 72,
        "is_featured": True,
        "description": "بلوزة من الحرير الصناعي الناعم بلمعة خفيفة، بتفاصيل أكمام أنيقة وسهولة في التنسيق مع البنطلون أو الجيبة.",
        "details": "الخامة: حرير صناعي\nالقصة: Relaxed\nأكمام طويلة\nالعناية: غسيل بارد",
    },
    {
        "name": "فستان كلاسيك",
        "slug": "classic-dress",
        "category": "women",
        "price": 1150,
        "compare_at_price": None,
        "stock": 15,
        "image_url": "/static/img/classic-dress.jpg",
        "sizes": ["S", "M", "L"],
        "colors": [
            {"name": "أسود", "hex": "#1B1B1B"},
            {"name": "كحلي", "hex": "#2A3A55"},
        ],
        "rating": 4.8,
        "reviews_count": 44,
        "is_featured": False,
        "description": "فستان بقصة كلاسيكية خالدة ولون محايد يناسب كل المناسبات، مصنوع من قماش مريح يحافظ على شكله.",
        "details": "الخامة: بوليستر مخلوط\nالقصة: Straight\nطول: تحت الركبة\nسحاب جانبي",
    },
    {
        "name": "سنيكرز جلد أبيض",
        "slug": "leather-sneakers",
        "category": "shoes",
        "price": 1490,
        "compare_at_price": 1790,
        "stock": 16,
        "image_url": "/static/img/leather-sneakers.jpg",
        "sizes": SHOE_SIZES,
        "colors": [
            {"name": "أبيض", "hex": "#F4F1EA"},
            {"name": "بيج", "hex": "#D9C7B2"},
        ],
        "rating": 4.9,
        "reviews_count": 156,
        "is_featured": True,
        "description": "سنيكرز من الجلد الطبيعي بتصميم مينيمال ونعل مرن مريح للاستخدام اليومي. يناسب اللوك الكاجوال والرسمي الخفيف.",
        "details": "الخامة: جلد طبيعي\nالنعل: مطاطي مرن\nالبطانة: قماش تنفسي\nصناعة: مصر",
    },
    {
        "name": "حذاء رياضي خفيف",
        "slug": "sport-shoes",
        "category": "shoes",
        "price": 1290,
        "compare_at_price": None,
        "stock": 22,
        "image_url": "/static/img/sport-shoes.jpg",
        "sizes": SHOE_SIZES,
        "colors": [
            {"name": "رمادي", "hex": "#8C8C8C"},
            {"name": "أسود", "hex": "#1B1B1B"},
        ],
        "rating": 4.7,
        "reviews_count": 88,
        "is_featured": False,
        "description": "حذاء رياضي خفيف الوزن بنعل ممتص للصدمات وخامة تنفسية، مثالي للمشي والتمارين اليومية.",
        "details": "الخامة: ميش تنفسي\nالنعل: EVA خفيف\nمقاوم للانزلاق\nمناسب للجري الخفيف",
    },
    {
        "name": "سنيكرز يومي",
        "slug": "daily-sneakers",
        "category": "shoes",
        "price": 990,
        "compare_at_price": 1190,
        "stock": 28,
        "image_url": "/static/img/daily-sneakers.jpg",
        "sizes": SHOE_SIZES,
        "colors": [
            {"name": "أبيض", "hex": "#F4F1EA"},
            {"name": "كحلي", "hex": "#2A3A55"},
        ],
        "rating": 4.6,
        "reviews_count": 112,
        "is_featured": True,
        "description": "سنيكرز عملي بتصميم بسيط وألوان سهلة التنسيق، مع بطانة مريحة ونعل مقاوم للانزلاق.",
        "details": "الخامة: جلد صناعي + قماش\nالنعل: مطاطي\nبطانة إسفنجية\nوزن خفيف",
    },
    {
        "name": "شنطة يد جلد طبيعي",
        "slug": "leather-handbag",
        "category": "bags",
        "price": 1350,
        "compare_at_price": None,
        "stock": 10,
        "image_url": "/static/img/leather-handbag.jpg",
        "sizes": [],
        "colors": [
            {"name": "بني", "hex": "#7A5230"},
            {"name": "أسود", "hex": "#1B1B1B"},
        ],
        "rating": 4.9,
        "reviews_count": 64,
        "is_featured": True,
        "description": "شنطة يد من الجلد الطبيعي بتشطيب يدوي وحجم عملي يتسع لكل أساسياتك. تصميم كلاسيكي يعيش معاك سنين.",
        "details": "الخامة: جلد طبيعي\nبطانة قماشية\nجيب داخلي بسحاب\nحزام كتف قابل للفك",
    },
    {
        "name": "شنطة كتف أنيقة",
        "slug": "shoulder-bag",
        "category": "bags",
        "price": 890,
        "compare_at_price": 1050,
        "stock": 14,
        "image_url": "/static/img/shoulder-bag.jpg",
        "sizes": [],
        "colors": [
            {"name": "بيج", "hex": "#D9C7B2"},
            {"name": "أسود", "hex": "#1B1B1B"},
        ],
        "rating": 4.7,
        "reviews_count": 39,
        "is_featured": False,
        "description": "شنطة كتف بحجم مثالي للخروجات، حزام قابل للتعديل وجيوب داخلية منظمة.",
        "details": "الخامة: جلد صناعي فاخر\nحزام قابل للتعديل\nسحاب علوي\nجيوب داخلية",
    },
    {
        "name": "حقيبة ظهر عملية",
        "slug": "city-backpack",
        "category": "bags",
        "price": 750,
        "compare_at_price": None,
        "stock": 26,
        "image_url": "/static/img/city-backpack.jpg",
        "sizes": [],
        "colors": [
            {"name": "رمادي", "hex": "#8C8C8C"},
            {"name": "أسود", "hex": "#1B1B1B"},
        ],
        "rating": 4.8,
        "reviews_count": 77,
        "is_featured": False,
        "description": "حقيبة ظهر بمساحة ذكية للابتوب والأغراض اليومية، خامة مقاومة للماء وسحابات متينة.",
        "details": "تتسع للابتوب حتى 15 بوصة\nخامة مقاومة للماء\nجيب خلفي سري\nحمالات مبطنة",
    },
    {
        "name": "ساعة كلاسيك جلد",
        "slug": "classic-watch",
        "category": "watches",
        "price": 1850,
        "compare_at_price": 2200,
        "stock": 8,
        "image_url": "/static/img/classic-watch.jpg",
        "sizes": [],
        "colors": [
            {"name": "بني", "hex": "#7A5230"},
            {"name": "أسود", "hex": "#1B1B1B"},
        ],
        "rating": 4.9,
        "reviews_count": 58,
        "is_featured": True,
        "description": "ساعة كلاسيكية بحركة كوارتز دقيقة وسوار جلد طبيعي، تصميم خالد يناسب كل الإطلالات.",
        "details": "حركة كوارتز يابانية\nسوار جلد طبيعي\nمقاومة للماء 3ATM\nضمان سنة",
    },
    {
        "name": "ساعة مينيمال",
        "slug": "minimal-watch",
        "category": "watches",
        "price": 1450,
        "compare_at_price": None,
        "stock": 12,
        "image_url": "/static/img/minimal-watch.jpg",
        "sizes": [],
        "colors": [
            {"name": "فضي", "hex": "#B9BCC0"},
            {"name": "ذهبي", "hex": "#C9A24B"},
        ],
        "rating": 4.7,
        "reviews_count": 41,
        "is_featured": False,
        "description": "ساعة بتصميم مينيمال وميناء نظيف، خفيفة على المعصم ومناسبة للاستخدام اليومي.",
        "details": "ميناء 38 مم\nحركة كوارتز\nسوار ستانلس ستيل\nمقاومة للماء 3ATM",
    },
    {
        "name": "عطر عود ملكي",
        "slug": "royal-oud",
        "category": "perfumes",
        "price": 1650,
        "compare_at_price": None,
        "stock": 18,
        "image_url": "/static/img/royal-oud.jpg",
        "sizes": [],
        "colors": [],
        "rating": 4.9,
        "reviews_count": 132,
        "is_featured": True,
        "description": "عطر شرقي فخم بمزيج من العود والعنبر والمسك، ثبات طويل وقاعدة دافئة تترك أثرًا لا يُنسى.",
        "details": "الحجم: 100 مل\nالعائلة العطرية: شرقي خشبي\nالثبات: 8-10 ساعات\nالاستخدام: مسائي",
    },
    {
        "name": "عطر مسك أبيض",
        "slug": "white-musk",
        "category": "perfumes",
        "price": 980,
        "compare_at_price": 1150,
        "stock": 30,
        "image_url": "/static/img/white-musk.jpg",
        "sizes": [],
        "colors": [],
        "rating": 4.8,
        "reviews_count": 89,
        "is_featured": False,
        "description": "عطر مسك أبيض ناعم ونظيف، مناسب للاستخدام اليومي وللأجواء الصيفية.",
        "details": "الحجم: 100 مل\nالعائلة العطرية: مسك أبيض\nالثبات: 6-8 ساعات\nالاستخدام: نهاري",
    },
    {
        "name": "عطر زهري فاخر",
        "slug": "floral-perfume",
        "category": "perfumes",
        "price": 1250,
        "compare_at_price": None,
        "stock": 20,
        "image_url": "/static/img/floral-perfume.jpg",
        "sizes": [],
        "colors": [],
        "rating": 4.7,
        "reviews_count": 66,
        "is_featured": False,
        "description": "عطر زهري أنثوي بقلب من الياسمين والورد، خفيف ومنعش مع ثبات يدوم طوال اليوم.",
        "details": "الحجم: 100 مل\nالعائلة العطرية: زهري\nالثبات: 6-8 ساعات\nالاستخدام: يومي",
    },
]


def ensure_admin(db: Session) -> None:
    admin = (
        db.query(models.AdminUser)
        .filter(models.AdminUser.username == ADMIN_USERNAME)
        .first()
    )
    if admin is None:
        db.add(
            models.AdminUser(
                username=ADMIN_USERNAME,
                password_hash=hash_password(ADMIN_PASSWORD),
                display_name="مدير المتجر",
            )
        )
        db.commit()


def seed_database(db: Session) -> None:
    ensure_admin(db)
    store_config.ensure_defaults(db)
    store_config.ensure_governorates(db)
    store_config.ensure_payment_methods(db)

    if db.query(models.Category).count() == 0:
        for item in CATEGORIES:
            db.add(models.Category(**item))
        db.commit()

    if db.query(models.Product).count() > 0:
        return

    categories = {
        category.slug: category for category in db.query(models.Category).all()
    }

    for item in PRODUCTS:
        data = dict(item)
        category_slug = data.pop("category")
        category = categories.get(category_slug)
        data["category_id"] = category.id if category else None
        data["slug"] = slugify(data["slug"])
        db.add(models.Product(**data))

    db.commit()
