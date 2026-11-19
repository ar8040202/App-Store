"""متجر EMO STORE على Streamlit Cloud — بالتصميم الأصلي HTML/CSS بدون سيرفر خارجي.

البيانات بتقرأ وتكتب مباشرة في SQLite الموجود داخل الـ repo.
الواجهة مبنية بـ st.html باستخدام نفس الـ class names والـ CSS بتاع الموقع الأصلي،
مع الاحتفاظ بـ widgets Streamlit للتفاعل (سلة / طلبات / إعدادات).
"""
import base64
from contextlib import contextmanager
from html import escape
from pathlib import Path

import streamlit as st

import models
import schemas
import store_config
from database import Base, SessionLocal, engine, ensure_schema
from routers.admin import update_order_status
from routers.orders import create_order
from seed import seed_database
from security import verify_password
from settings import ORDER_STATUS_LABELS, STATIC_DIR

st.set_page_config(
    page_title="EMO STORE | قطع مختارة بعناية",
    page_icon="🛍️",
    layout="wide",
    initial_sidebar_state="collapsed",
)

SITE_CSS = """
<style>
[data-testid="stSidebar"], [data-testid="stHeader"], [data-testid="stToolbar"],
[data-testid="stBottomBlockContainer"] { display: none !important; }
footer:not(.site-footer) { visibility: hidden; }
.block-container { max-width: 1240px !important; margin-inline: auto !important; padding: 0 24px 32px !important; }

.emo-site {
  --bg:#f7f4ee; --bg-2:#f1ece3; --surface:#fffdf9; --white:#fff;
  --ink:#191714; --ink-2:#3d3933; --muted:#7b7468;
  --line:#e6dfd2; --line-strong:#d6ccba;
  --brand:#1f3d33; --brand-700:#173128; --brand-500:#2e5a4a; --brand-100:#e4ece7;
  --gold:#c9a24b; --gold-700:#a98634; --gold-soft:#f0e4c9;
  --danger:#a5342c; --success:#2f6b4f;
  --radius:18px; --radius-sm:12px;
  --shadow-sm:0 1px 2px rgba(25,23,20,.05), 0 10px 30px -18px rgba(25,23,20,.25);
  --shadow-md:0 30px 70px -40px rgba(25,23,20,.45);
  --shadow-lg:0 50px 100px -50px rgba(25,23,20,.5);
  --font:"Cairo","Segoe UI",Tahoma,sans-serif;
  --font-display:"Amiri","Cairo",serif;
  direction:rtl; color:var(--ink); font-family:var(--font); line-height:1.7;
}
.emo-site * { box-sizing:border-box; }
.emo-site h1,.emo-site h2,.emo-site h3,.emo-site h4 { margin:0; line-height:1.3; font-family:var(--font-display); font-weight:700; }
.emo-site a { color:inherit; text-decoration:none; }
.emo-site img { display:block; max-width:100%; }
.emo-site .container { width:100%; max-width:1240px; margin-inline:auto; padding-inline:24px; }
.emo-site .announce { background:var(--brand-700); color:#efe9db; font-size:12px; font-weight:500; letter-spacing:.2px; }
.emo-site .announce-inner { min-height:38px; display:flex; align-items:center; justify-content:center; gap:16px; flex-wrap:wrap; text-align:center; }
.emo-site .announce-dot { width:3px; height:3px; border-radius:50%; background:var(--gold); flex:none; }
.emo-site .site-header { background:rgba(247,244,238,.9); backdrop-filter:blur(16px); border-bottom:1px solid var(--line); }
.emo-site .header-inner { height:76px; display:flex; align-items:center; gap:26px; }
.emo-site .brand { display:inline-flex; align-items:center; gap:10px; flex:none; }
.emo-site .brand-mark { width:42px; height:42px; border-radius:12px; background:var(--brand); color:var(--gold); display:grid; place-items:center; font-family:var(--font-display); font-size:25px; box-shadow:0 6px 16px -10px rgba(31,61,51,.8); }
.emo-site .brand-text strong { display:block; font-family:var(--font-display); font-size:25px; line-height:1; color:var(--brand); }
.emo-site .brand-text small { display:block; font-size:8px; letter-spacing:3.4px; color:var(--muted); font-weight:700; margin-top:4px; }
.emo-site .main-nav { display:flex; align-items:center; gap:26px; margin-inline-start:18px; }
.emo-site .main-nav a { position:relative; font-size:14px; font-weight:600; color:var(--ink-2); padding:6px 0; white-space:nowrap; }
.emo-site .main-nav a::after { content:""; position:absolute; inset-inline:0; bottom:0; height:1.5px; background:var(--gold); transform:scaleX(0); transform-origin:right; transition:transform .3s; }
.emo-site .main-nav a:hover::after,.emo-site .main-nav a.active::after { transform:scaleX(1); }
.emo-site .main-nav a.active { color:var(--ink); }
.emo-site .header-actions { margin-inline-start:auto; display:flex; align-items:center; gap:4px; }
.emo-site .header-link { display:inline-flex; align-items:center; gap:7px; font-size:13px; font-weight:600; color:var(--ink-2); padding:8px 12px; border-radius:999px; }
.emo-site .header-link:hover { background:rgba(25,23,20,.05); }
.emo-site .cart-pill { background:var(--gold-soft); color:#241c0d; border-radius:999px; padding:8px 14px; font-size:13px; font-weight:700; white-space:nowrap; }
.emo-site .hero { position:relative; overflow:hidden; padding:56px 0 68px; }
.emo-site .hero::before { content:""; position:absolute; inset:0; background:radial-gradient(900px 500px at 85% 10%, rgba(201,162,75,.13), transparent 65%), radial-gradient(700px 500px at 10% 90%, rgba(31,61,51,.08), transparent 65%); pointer-events:none; }
.emo-site .hero-grid { position:relative; display:grid; grid-template-columns:1.02fr .98fr; align-items:center; gap:56px; }
.emo-site .eyebrow { display:inline-flex; align-items:center; gap:10px; font-size:12.5px; font-weight:700; letter-spacing:2px; text-transform:uppercase; color:var(--brand-500); }
.emo-site .eyebrow::before { content:""; width:28px; height:1px; background:var(--gold); }
.emo-site .hero-copy h1 { font-size:clamp(42px,5.2vw,72px); line-height:1.14; letter-spacing:-1px; margin:18px 0 20px; }
.emo-site .hero-copy h1 em { font-style:normal; color:var(--brand); position:relative; white-space:nowrap; }
.emo-site .hero-copy h1 em::after { content:""; position:absolute; inset-inline:2px; bottom:6px; height:8px; background:var(--gold-soft); z-index:-1; border-radius:2px; }
.emo-site .hero-copy > p { max-width:500px; color:var(--muted); font-size:16.5px; line-height:1.85; }
.emo-site .hero-meta { display:flex; gap:40px; margin-top:40px; padding-top:26px; border-top:1px solid var(--line); }
.emo-site .hero-meta strong { display:block; font-family:var(--font-display); font-size:27px; line-height:1.2; }
.emo-site .hero-meta span { font-size:12.5px; color:var(--muted); }
.emo-site .hero-visual { position:relative; }
.emo-site .hero-visual::before { content:""; position:absolute; inset:20px -20px -20px 20px; border:1px solid rgba(201,162,75,.55); border-radius:240px 240px 26px 26px; pointer-events:none; }
.emo-site .hero-image { position:relative; aspect-ratio:4/4.65; border-radius:240px 240px 26px 26px; overflow:hidden; background:var(--bg-2); box-shadow:var(--shadow-lg); }
.emo-site .hero-image img { width:100%; height:100%; object-fit:cover; }
.emo-site .hero-image::after { content:""; position:absolute; inset:0; background:linear-gradient(180deg,transparent 55%,rgba(20,18,15,.32)); }
.emo-site .hero-float-card { position:absolute; bottom:26px; inset-inline-start:-26px; width:252px; display:flex; align-items:center; gap:12px; padding:10px; border-radius:16px; background:rgba(255,253,249,.94); backdrop-filter:blur(12px); box-shadow:var(--shadow-md); z-index:2; }
.emo-site .hero-float-card img { width:64px; height:78px; border-radius:10px; object-fit:cover; flex:none; }
.emo-site .hero-float-card small { font-size:10.5px; color:var(--muted); }
.emo-site .hero-float-card strong { display:block; font-size:13.5px; font-weight:700; margin:1px 0 2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.emo-site .hero-float-card .fc-price { font-size:13px; font-weight:800; color:var(--brand); }
.emo-site .hero-badge { position:absolute; top:34px; inset-inline-end:-16px; background:var(--gold); color:#241c0d; padding:12px 18px; border-radius:14px; text-align:center; transform:rotate(-4deg); box-shadow:0 16px 30px -18px rgba(169,134,52,.9); z-index:2; }
.emo-site .hero-badge strong { display:block; font-size:13px; font-weight:800; line-height:1.3; }
.emo-site .hero-badge small { font-size:10px; font-weight:600; opacity:.8; }
.emo-site .trust { border-block:1px solid var(--line); }
.emo-site .trust-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:20px; padding-block:26px; }
.emo-site .trust-item { display:flex; align-items:center; gap:12px; }
.emo-site .trust-item b { display:block; font-size:13.5px; }
.emo-site .trust-item span { font-size:11.5px; color:var(--muted); }
.emo-site .section { padding-block:66px; }
.emo-site .section-head { display:flex; align-items:flex-end; justify-content:space-between; gap:24px; margin-bottom:34px; }
.emo-site .section-head h2 { font-size:clamp(28px,3.4vw,42px); letter-spacing:-.5px; }
.emo-site .section-head p { color:var(--muted); font-size:15px; margin-top:6px; }
.emo-site .product-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:28px 22px; }
.emo-site .product-card { display:flex; flex-direction:column; min-width:0; }
.emo-site .product-media { position:relative; aspect-ratio:3/3.8; border-radius:16px; overflow:hidden; background:#ece6da; }
.emo-site .product-media img { width:100%; height:100%; object-fit:cover; transition:transform .75s; }
.emo-site .product-card:hover .product-media img { transform:scale(1.055); }
.emo-site .product-media::after { content:""; position:absolute; inset:0; background:linear-gradient(180deg,transparent 65%,rgba(20,18,15,.08)); pointer-events:none; }
.emo-site .product-badges { position:absolute; top:12px; inset-inline-start:12px; display:flex; flex-direction:column; gap:6px; z-index:2; }
.emo-site .badge { border-radius:999px; padding:5px 11px; font-size:11.5px; font-weight:700; line-height:1; }
.emo-site .badge-new { background:var(--brand); color:#f8f5ee; }
.emo-site .badge-sale { background:var(--gold); color:#241c0d; }
.emo-site .badge-soft { background:var(--brand-100); color:var(--brand); }
.emo-site .product-info { padding:13px 3px 0; }
.emo-site .product-cat { font-size:11px; font-weight:600; letter-spacing:.6px; color:var(--muted); }
.emo-site .product-name { font-size:15px; font-weight:700; line-height:1.5; margin:2px 0 4px; }
.emo-site .stars { display:inline-flex; gap:2px; color:var(--gold); font-size:12px; }
.emo-site .stars .count { color:var(--muted); margin-inline-start:6px; font-weight:500; }
.emo-site .price-row { display:flex; align-items:baseline; gap:8px; flex-wrap:wrap; margin-top:4px; }
.emo-site .price { font-size:15.5px; font-weight:800; color:var(--ink); }
.emo-site .price-old { font-size:12.5px; color:var(--muted); text-decoration:line-through; }
.emo-site .out-of-stock { font-size:11.5px; font-weight:700; color:var(--danger); }
.emo-site .site-footer { background:#14120f; color:#d9d3c6; padding:64px 0 28px; margin-top:10px; }
.emo-site .footer-grid { display:grid; grid-template-columns:1.6fr 1fr 1fr 1.25fr; gap:44px; }
.emo-site .brand-light .brand-mark { background:var(--gold); color:var(--brand-700); }
.emo-site .brand-light .brand-text strong { color:#f3efe6; }
.emo-site .brand-light .brand-text small { color:#8f8778; }
.emo-site .footer-brand p { font-size:13.5px; line-height:1.9; color:#9c9486; max-width:320px; margin-top:18px; }
.emo-site .social-row { display:flex; gap:10px; margin-top:22px; }
.emo-site .social-row a { width:38px; height:38px; border-radius:50%; border:1px solid #322e26; display:grid; place-items:center; color:#b9b1a2; font-size:13px; font-weight:700; transition:.25s; }
.emo-site .social-row a:hover { border-color:var(--gold); color:var(--gold); transform:translateY(-2px); }
.emo-site .footer-col h4 { font-family:var(--font); font-size:12.5px; font-weight:700; letter-spacing:1.6px; color:#f3efe6; margin-bottom:20px; }
.emo-site .footer-col a { display:block; font-size:13.5px; color:#a9a193; margin-bottom:11px; }
.emo-site .footer-col a:hover { color:var(--gold); }
.emo-site .footer-contact p { font-size:12.5px; color:#8f8778; line-height:1.9; margin-top:10px; }
.emo-site .pay-badges { display:flex; flex-wrap:wrap; gap:8px; margin-top:18px; }
.emo-site .pay-badges span { border:1px solid #343028; border-radius:8px; padding:5px 9px; font-size:10.5px; color:#cfc7b8; }
.emo-site .footer-bottom { display:flex; align-items:center; justify-content:space-between; gap:16px; flex-wrap:wrap; border-top:1px solid #2a261f; margin-top:50px; padding-top:24px; font-size:12px; color:#8b8375; }
.emo-site .footer-bottom .heart { color:var(--gold); }
.emo-site .panel { background:var(--surface); border:1px solid var(--line); border-radius:var(--radius); padding:24px; box-shadow:var(--shadow-sm); }

/* أزرار Streamlit بنفس شكل الموقع الأصلي — مربوطة بـ key مش بـ class داخلي */
[class*="st-key-add_"] button {
  height:44px !important; min-height:44px !important; padding:0 16px !important;
  border-radius:999px !important; background:rgba(255,253,249,.96) !important;
  color:var(--ink) !important; border:1px solid var(--line) !important;
  box-shadow:var(--shadow-sm) !important; font-size:13px !important; font-weight:700 !important;
  width:100% !important;
}
[class*="st-key-add_"] button:hover { background:var(--brand) !important; color:#f8f5ee !important; border-color:var(--brand) !important; }
[class*="st-key-auth"] button { background:transparent !important; color:var(--ink-2) !important; border:0 !important; box-shadow:none !important; padding:8px 12px !important; font-size:13px !important; font-weight:600 !important; border-radius:999px !important; }
[class*="st-key-auth"] button:hover { background:rgba(25,23,20,.05) !important; }
[class*="st-key-primary_"] button {
  background:var(--brand) !important; color:#f8f5ee !important; border:0 !important;
  height:52px !important; min-height:52px !important; padding:0 28px !important;
  border-radius:999px !important; font-size:14.5px !important; font-weight:700 !important;
  box-shadow:0 14px 30px -18px rgba(31,61,51,.9) !important;
}
[class*="st-key-primary_"] button:hover { background:var(--brand-700) !important; }
[class*="st-key-ghost_"] button { background:transparent !important; color:var(--ink) !important; border:1px solid var(--line-strong) !important; box-shadow:none !important; height:42px !important; padding:0 18px !important; border-radius:999px !important; font-size:13px !important; font-weight:600 !important; }
[class*="st-key-ghost_"] button:hover { border-color:var(--ink) !important; }
[data-testid="stTextInput"] input,[data-testid="stTextArea"] textarea,[data-testid="stNumberInput"] input,[data-testid="stSelectbox"] > div > div {
  background:#fff !important; border:1px solid var(--line-strong) !important; border-radius:12px !important;
  color:var(--ink) !important; text-align:right !important; min-height:48px !important;
}
[data-testid="stContainer"] { background:transparent !important; border:0 !important; box-shadow:none !important; padding:0 !important; }
[data-testid="stAlert"] { border-radius:12px !important; }
</style>
"""

st.html(SITE_CSS)

STATUSES = list(ORDER_STATUS_LABELS.keys())
PAGE_KEYS = ["home", "shop", "cart", "orders", "settings"]
PAGE_LABELS = {
    "home": "الرئيسية",
    "shop": "المتجر",
    "women": "نسائي",
    "men": "رجالي",
    "offers": "أقل من غيرها",
    "about": "قصتنا",
    "cart": "السلة",
    "orders": "الطلبات",
    "settings": "الإعدادات",
}


@st.cache_resource
def init_database() -> bool:
    Base.metadata.create_all(bind=engine)
    ensure_schema()
    with session_scope() as db:
        seed_database(db)
    return True


@contextmanager
def session_scope():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def current_page() -> str:
    return st.query_params.get("page", "home")


def data_uri(path: str | None) -> str:
    if not path:
        return ""
    if path.startswith(("http://", "https://", "data:")):
        return path
    relative = path.lstrip("/")
    if relative.startswith("static/"):
        relative = relative[len("static/") :]
    file_path: Path = STATIC_DIR / relative
    if not file_path.exists():
        return ""
    mime = "image/jpeg" if file_path.suffix.lower() in {".jpg", ".jpeg"} else "image/png"
    encoded = base64.b64encode(file_path.read_bytes()).decode("ascii")
    return f"data:{mime};base64,{encoded}"


def error_text(exc: Exception) -> str:
    detail = getattr(exc, "detail", None)
    if isinstance(detail, list):
        return " • ".join(
            str(item.get("msg", item)) if isinstance(item, dict) else str(item)
            for item in detail
        )
    return str(detail or exc)


def clean_link(value: str, prefix: str) -> str:
    value = value.strip()
    if not value:
        return "#"
    return value if value.startswith(("http://", "https://")) else prefix + value.lstrip("+")


def render_announce() -> None:
    st.html(
        """
        <div class="emo-site">
          <div class="announce"><div class="container announce-inner">
            <span>شحن مجاني للطلبات فوق 1,500 ج.م</span><span class="announce-dot"></span>
            <span>الدفع عند الاستلام متاح لكل المحافظات</span><span class="announce-dot"></span>
            <span>استرجاع مجاني خلال 14 يوم</span>
          </div></div>
        </div>
        """
    )


def render_header(config: dict, cart_count: int) -> None:
    page = current_page()
    name = escape(str(config.get("store_name") or "EMO STORE"))
    name_en = escape(str(config.get("store_name_en") or "EMO STORE"))
    nav_items = ["home", "shop", "women", "men", "offers", "about"]
    links = "".join(
        f'<a href="?page={key}" class="{"active" if page == key else ""}">{PAGE_LABELS[key]}</a>'
        for key in nav_items
    )
    auth = "تسجيل الخروج" if st.session_state.get("admin") else "دخول الأدمن"
    st.html(
        f"""
        <div class="emo-site">
          <header class="site-header"><div class="container header-inner">
            <a href="?page=home" class="brand">
              <span class="brand-mark">E</span>
              <span class="brand-text"><strong>{name}</strong><small>{name_en}</small></span>
            </a>
            <nav class="main-nav">{links}</nav>
            <div class="header-actions">
              <a href="?page=shop" class="header-link">بحث</a>
              <a href="?page=orders" class="header-link">تتبع طلبك</a>
              <span class="cart-pill">السلة ({cart_count})</span>
            </div>
          </div></header>
        </div>
        """
    )
    col1, col2 = st.columns([7, 1])
    with col2:
        if st.button(auth, key="auth_button"):
            if st.session_state.get("admin"):
                st.session_state.admin = ""
                st.query_params["page"] = "home"
            else:
                st.query_params["page"] = "settings"
            st.rerun()
    st.markdown("", unsafe_allow_html=True)


def render_hero(config: dict, hero: dict | None) -> None:
    picture = data_uri(hero["image"]) if hero else ""
    float_img = picture
    float_name = escape(hero["name"] if hero else "EMO STORE")
    float_price = escape(str(hero["price"] if hero else config.get("store_currency", "ج.م")))
    st.html(
        f"""
        <div class="emo-site">
          <section class="hero"><div class="container hero-grid">
            <div class="hero-copy">
              <span class="eyebrow">تشكيلة مختارة</span>
              <h1>قطع مختارة بعناية<br>لتفاصيل <em>تستحقها</em></h1>
              <p>{escape(str(config.get('store_tagline') or ''))} ملابس، أحذية، شنط، ساعات وعطور أصلية مع شحن لكل المحافظات والدفع عند الاستلام.</p>
              <div class="hero-meta">
                <div><strong>+19</strong><span>قطعة مختارة</span></div>
                <div><strong>كل المحافظات</strong><span>شحن سريع</span></div>
                <div><strong>14 يوم</strong><span>استرجاع مجاني</span></div>
              </div>
            </div>
            <div class="hero-visual">
              <div class="hero-image">
                {f'<img src="{picture}" alt="{float_name}">' if picture else ''}
                <div class="hero-float-card">
                  {f'<img src="{float_img}" alt="">' if float_img else ''}
                  <div><small>الأكثر مبيعًا</small><strong>{float_name}</strong><span class="fc-price">{float_price}</span></div>
                </div>
                <div class="hero-badge"><strong>جودة عالية</strong><small>بأسعار عادلة</small></div>
              </div>
            </div>
          </div></section>
        </div>
        """
    )


def render_trust() -> None:
    st.html(
        """
        <div class="emo-site"><div class="trust"><div class="container trust-grid">
          <div class="trust-item"><b>شحن لكل المحافظات</b><span>توصيل سريع وآمن</span></div>
          <div class="trust-item"><b>الدفع عند الاستلام</b><span>بدون أي رسوم إضافية</span></div>
          <div class="trust-item"><b>استرجاع خلال 14 يوم</b><span>تسوق براحة بال</span></div>
          <div class="trust-item"><b>منتجات أصلية</b><span>جودة مضمونة</span></div>
        </div></div></div>
        """
    )


def render_section_head(title: str, subtitle: str = "") -> None:
    st.html(
        f"""
        <div class="emo-site"><div class="section-head">
          <div><h2>{escape(title)}</h2>{f'<p>{escape(subtitle)}</p>' if subtitle else ''}</div>
        </div></div>
        """
    )


def product_card_html(product: dict, currency: str) -> str:
    badges = '<span class="badge badge-new">جديد</span>'
    stock = (
        '<span class="out-of-stock">نفد المخزون</span>'
        if product["stock"] <= 0
        else ""
    )
    return f"""
    <div class="emo-site"><article class="product-card">
      <div class="product-media">
        {f'<img src="{product["image"]}" alt="{escape(product["name"])}">' if product["image"] else ''}
        <div class="product-badges">{badges}</div>
      </div>
      <div class="product-info">
        <div class="product-cat">{escape(product['category'])}</div>
        <div class="product-name">{escape(product['name'])}</div>
        <div class="stars">★★★★★ <span class="count">({(product['id'] % 7) + 12})</span></div>
        <div class="price-row"><span class="price">{product['price']} {escape(currency)}</span>{stock}</div>
      </div>
    </article></div>
    """


def render_footer(config: dict) -> None:
    phone = str(config.get("contact_phone") or "")
    email = str(config.get("contact_email") or "")
    whatsapp = str(config.get("whatsapp_number") or "")
    address = str(config.get("store_address") or "القاهرة، مصر")
    hours = str(config.get("working_hours") or "")
    instagram = clean_link(str(config.get("instagram_url") or ""), "https://instagram.com/")
    facebook = clean_link(str(config.get("facebook_url") or ""), "https://facebook.com/")
    wa = clean_link(whatsapp, "https://wa.me/")
    st.html(
        f"""
        <div class="emo-site">
          <footer class="site-footer"><div class="container">
            <div class="footer-grid">
              <div class="footer-brand">
                <a href="?page=home" class="brand brand-light"><span class="brand-mark">E</span>
                  <span class="brand-text"><strong>{escape(str(config.get('store_name') or 'EMO STORE'))}</strong>
                  <small>{escape(str(config.get('store_name_en') or 'EMO STORE'))}</small></span></a>
                <p>قطع مختارة بعناية، بخامات تستحق البقاء. بنصنع تجربة شراء بسيطة وآمنة من قلب مصر.</p>
                <div class="social-row">
                  <a href="{escape(instagram, quote=True)}" aria-label="إنستجرام">IG</a>
                  <a href="{escape(facebook, quote=True)}" aria-label="فيسبوك">FB</a>
                  <a href="{escape(wa, quote=True)}" aria-label="واتساب">WA</a>
                </div>
              </div>
              <div class="footer-col"><h4>تسوق</h4>
                <a href="?page=shop">كل المنتجات</a><a href="?page=women">نسائي</a>
                <a href="?page=men">رجالي</a><a href="?page=offers">أقل من غيرها</a>
              </div>
              <div class="footer-col"><h4>خدمة العملاء</h4>
                <a href="?page=orders">تتبع طلبك</a><a href="?page=about">سياسة الشحن</a>
                <a href="?page=about">الاسترجاع والاستبدال</a><a href="?page=about">تواصل معنا</a>
              </div>
              <div class="footer-col footer-contact"><h4>تواصل معنا</h4>
                <a href="tel:{escape(phone, quote=True)}" dir="ltr">{escape(phone)}</a>
                <a href="mailto:{escape(email, quote=True)}" dir="ltr">{escape(email)}</a>
                <p>{escape(address)}<br>{escape(hours)}</p>
                <div class="pay-badges"><span>الدفع عند الاستلام</span><span>إنستاباي</span><span>محفظة إلكترونية</span></div>
              </div>
            </div>
            <div class="footer-bottom"><span>© 2026 EMO STORE. كل الحقوق محفوظة.</span><span>صُنع بـ <span class="heart">♥</span> في مصر</span></div>
          </div></footer>
        </div>
        """
    )


def admin_gate() -> bool:
    if st.session_state.get("admin"):
        st.success(f"مسجّل كـ **{st.session_state.admin}**")
        return True

    st.html('<div class="emo-site"><div class="panel"><h3>دخول الأدمن</h3></div></div>')
    with st.form("admin_login"):
        username = st.text_input("اسم المستخدم", value="admin")
        password = st.text_input("كلمة المرور", type="password")
        if st.form_submit_button("دخول", key="primary_login"):
            with session_scope() as db:
                admin = (
                    db.query(models.AdminUser)
                    .filter(models.AdminUser.username == username.strip())
                    .first()
                )
                if admin and verify_password(password, admin.password_hash):
                    st.session_state.admin = admin.username
                    st.success("تم تسجيل الدخول")
                    st.rerun()
                else:
                    st.error("اسم المستخدم أو كلمة المرور غير صحيحة")
    return False


def store_page(config: dict, products: list[dict]) -> None:
    render_hero(config, products[0] if products else None)
    render_trust()

    with st.container():
        filter_col1, filter_col2 = st.columns([1, 2])
        with filter_col1:
            categories = sorted({p["category"] for p in products if p["category"]})
            selected = st.selectbox("القسم", ["الكل"] + categories)
        with filter_col2:
            search = st.text_input("ابحث عن منتج")

    shown = [
        p
        for p in products
        if (selected == "الكل" or p["category"] == selected)
        and (not search.strip() or search.strip() in p["name"])
    ]

    render_section_head("المنتجات", f"{len(shown)} قطعة مختارة بعناية")
    if not shown:
        st.info("لا توجد منتجات مطابقة.")
        return

    currency = config["store_currency"]
    for start in range(0, len(shown), 4):
        columns = st.columns(4)
        for column, product in zip(columns, shown[start : start + 4]):
            with column:
                st.html(product_card_html(product, currency))
                if product["stock"] > 0:
                    if st.button("أضف للسلة", key=f"add_{product['id']}"):
                        if "cart" not in st.session_state:
                            st.session_state.cart = {}
                        st.session_state.cart[product["id"]] = min(
                            st.session_state.cart.get(product["id"], 0) + 1,
                            product["stock"],
                        )
                        st.toast("اتضاف للسلة 🛒")


def cart_page(config: dict) -> None:
    render_section_head("سلة التسوق", "راجع اختياراتك وأكمل طلبك بخطوات بسيطة.")
    cart: dict[int, int] = st.session_state.get("cart", {})

    with session_scope() as db:
        currency = config["store_currency"]
        products = {
            row.id: row
            for row in db.query(models.Product)
            .filter(models.Product.id.in_(cart.keys()))
            .all()
        }
        governorates = store_config.public_governorates(db)
        payment_methods = store_config.public_payment_methods(db)

        if not products:
            st.info("السلة فاضية. اختار منتجات من صفحة المتجر.")
            return

        total = 0.0
        for product_id, quantity in list(cart.items()):
            product = products.get(product_id)
            if not product:
                cart.pop(product_id, None)
                continue
            col1, col2, col3 = st.columns([5, 2, 1])
            with col1:
                st.markdown(f"**{product.name}**")
                st.caption(f"{product.price} {currency}")
            with col2:
                qty = st.number_input(
                    "الكمية",
                    min_value=1,
                    max_value=max(1, product.stock),
                    value=min(quantity, max(1, product.stock)),
                    key=f"qty_{product_id}",
                )
                cart[product_id] = qty
                total += product.price * qty
            with col3:
                if st.button("حذف", key=f"ghost_remove_{product_id}"):
                    cart.pop(product_id, None)
                    st.rerun()

        st.subheader(f"الإجمالي: {total:,.2f} {currency}")

        if not governorates:
            st.error("الشحن غير متاح حاليًا.")
            return
        if not payment_methods:
            st.error("لا توجد طرق دفع متاحة حاليًا.")
            return

        with st.form("checkout"):
            customer_name = st.text_input("الاسم")
            phone = st.text_input("رقم الهاتف (01012345678)")
            governorate = st.selectbox("المحافظة", [row["name"] for row in governorates])
            city = st.text_input("المدينة")
            address = st.text_area("العنوان")
            notes = st.text_area("ملاحظات (اختياري)")
            payment = st.selectbox(
                "طريقة الدفع",
                [row["id"] for row in payment_methods],
                format_func=lambda code: next(
                    row["name"] for row in payment_methods if row["id"] == code
                ),
            )
            submit = st.form_submit_button("تأكيد الطلب", key="primary_checkout")

        if submit:
            try:
                payload = schemas.OrderCreate(
                    customer_name=customer_name,
                    customer_phone=phone,
                    governorate=governorate,
                    city=city,
                    address=address,
                    notes=notes or None,
                    payment_method=payment,
                    items=[
                        schemas.OrderItemIn(product_id=product_id, quantity=qty)
                        for product_id, qty in cart.items()
                    ],
                )
                order = create_order(payload, db)
                st.session_state.cart = {}
                st.success(f"تم إنشاء الطلب **{order.order_number}** ✅")
                st.rerun()
            except Exception as exc:
                st.error(error_text(exc))


def orders_page() -> None:
    render_section_head("الطلبات", "تابع الطلبات وغيّر حالتها — الإلغاء يرجّع الكميات للمخزن.")
    if not admin_gate():
        return

    selected = st.selectbox(
        "تصفية حسب الحالة",
        ["الكل"] + STATUSES,
        format_func=lambda value: ORDER_STATUS_LABELS.get(value, value),
    )
    with session_scope() as db:
        query = db.query(models.Order)
        if selected != "الكل":
            query = query.filter(models.Order.status == selected)
        orders = query.order_by(models.Order.created_at.desc()).limit(100).all()

    if not orders:
        st.info("لا توجد طلبات مطابقة.")
        return

    for order in orders:
        label = (
            f"#{order.order_number} — {order.customer_name} — "
            f"{ORDER_STATUS_LABELS.get(order.status, order.status)}"
        )
        with st.expander(label):
            st.write(f"**الهاتف:** {order.customer_phone}")
            st.write(f"**العنوان:** {order.governorate} / {order.city} / {order.address}")
            st.write(f"**الدفع:** {order.payment_method} — {order.payment_status}")
            st.write(f"**الإجمالي:** {order.total}")
            st.markdown("**المنتجات:**")
            for item in order.items:
                st.write(f"- {item.product_name} × {item.quantity} = {item.line_total}")

            new_status = st.selectbox(
                "تغيير الحالة",
                STATUSES,
                index=STATUSES.index(order.status) if order.status in STATUSES else 0,
                format_func=lambda value: ORDER_STATUS_LABELS.get(value, value),
                key=f"status_{order.id}",
            )
            if st.button("حفظ الحالة", key=f"primary_save_{order.id}"):
                with session_scope() as db:
                    update_order_status(
                        order.id,
                        schemas.OrderStatusUpdate(status=new_status),
                        None,
                        db,
                    )
                if new_status == "cancelled":
                    st.success("تم الإلغاء ورجوع الكميات للمخزن ✅")
                else:
                    st.success("تم تحديث الحالة ✅")
                st.rerun()


def settings_page() -> None:
    render_section_head("إعدادات المتجر", "عدّل بيانات المتجر ووسائل التواصل والروابط من مكان واحد.")
    if not admin_gate():
        return

    with session_scope() as db:
        config = store_config.get_config(db)

    fields = [
        ("اسم المتجر", "store_name"),
        ("الاسم بالإنجليزية", "store_name_en"),
        ("الشعار / الوصف", "store_tagline"),
        ("العملة", "store_currency"),
        ("حساب إنستاباي", "instapay_handle"),
        ("رقم المحفظة", "wallet_number"),
        ("رقم الهاتف", "contact_phone"),
        ("البريد الإلكتروني", "contact_email"),
        ("رقم واتساب", "whatsapp_number"),
        ("العنوان", "store_address"),
        ("ساعات العمل", "working_hours"),
        ("رابط إنستجرام", "instagram_url"),
        ("رابط فيسبوك", "facebook_url"),
    ]

    left, right = st.columns(2)
    with st.form("store_settings"):
        values = {}
        for index, (label, key) in enumerate(fields):
            target = left if index % 2 == 0 else right
            with target:
                values[key] = st.text_input(label, value=str(config.get(key) or ""))
        if st.form_submit_button("حفظ الإعدادات", key="primary_settings"):
            with session_scope() as db:
                store_config.update_config(db, values)
            st.success("تم حفظ الإعدادات ✅")
            st.rerun()


def main() -> None:
    init_database()
    if "admin" not in st.session_state:
        st.session_state.admin = ""
    if "cart" not in st.session_state:
        st.session_state.cart = {}

    with session_scope() as db:
        config = store_config.get_config(db)
        rows = (
            db.query(models.Product)
            .filter(models.Product.is_active.is_(True))
            .order_by(models.Product.id.desc())
            .all()
        )
        products = []
        for row in rows:
            products.append(
                {
                    "id": row.id,
                    "name": row.name,
                    "price": row.price,
                    "stock": row.stock,
                    "image": data_uri(row.image_url),
                    "category": row.category.name if row.category else "",
                }
            )

    render_announce()
    render_header(config, len(st.session_state.cart))

    page = current_page()
    if page == "cart":
        cart_page(config)
    elif page == "orders":
        orders_page()
    elif page == "settings":
        settings_page()
    else:
        store_page(config, products)

    render_footer(config)


if __name__ == "__main__":
    main()
