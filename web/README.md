# EMO STORE — Next.js + Vercel

متجر كامل بصفحات مستقلة لكل حاجة، بواجهة عربية RTL وتصميم جديد من الصفر.

**الرابط الحي:** https://emo-store-henna.vercel.app/ (نسخة Streamlit القديمة اوقفت).

## الصفحات

| الصفحة | الرابط |
| --- | --- |
| الرئيسية | `/` |
| المتجر (بحث + فلترة) | `/shop` |
| السلة والدفع | `/cart` |
| تتبع الطلب | `/track` |
| دخول الأدمن | `/admin/login` |
| الطلبات | `/admin/orders` |
| المنتجات والمخزون | `/admin/products` |
| الأقسام | `/admin/categories` |
| إعدادات المتجر | `/admin/settings` |
| تغيير كلمة المرور | `/admin/password` |

> دخول الأدمن **مش موجود في أي صفحة عامة** — لينكه الخاص بس `/admin/login`.

## التشغيل محليًا

```bash
cd web
npm install
npm run dev
```

افتح `http://localhost:3000`.

لو مفيش متغيرات Supabase، التطبيق بيشتغل تلقائيًا ببيانات تجريبية من `data/seed.json` (ذاكرة مؤقتة — الطلبات بتختفي بعد إعادة التشغيل). ده كافي لمعاينة الشكل والتجربة.

## النشر على Vercel + Supabase

1. **اعمل مشروع Supabase** (Free plan كافي).
2. افتح **SQL Editor** وشغّل بالترتيب:
   - `web/supabase/schema.sql`
   - `web/supabase/seed.sql` (بينقل 19 منتج + 6 أقسام + المحافظات + طرق الدفع + الإعدادات)
3. من **Project Settings → API** خد:
   - `Project URL` → `SUPABASE_URL`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`
4. ارفع المجلد `web/` على Vercel كـ **New Project** → Framework: Next.js (بيكتشفه تلقائيًا).
5. في **Environment Variables** ضيف:
   ```
   SUPABASE_URL=...
   SUPABASE_SERVICE_ROLE_KEY=...
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=ضع-كلمة-قوية
   ADMIN_SESSION_SECRET=نص-عشوائي-طويل
   ```
6. Deploy. كل الصفحات هتشتغل على الرابط الحالي: https://emo-store-henna.vercel.app/ — وكل صفحة ليها رابط مستقل.

## ملاحظات مهمة

- الـ `service_role` key موجود في متغيرات بيئة السيرفر فقط — **ما تحطهوش في `NEXT_PUBLIC_`**.
- جلسة الأدمن عبارة عن Cookie موقّع HMAC (HttpOnly) — مفيش Supabase Auth مطلوب.
- تغيير كلمة المرور من `/admin/password` بيحفظ هاش `scrypt` بملح عشوائي في جدول `settings` بمفتاح `admin_password_hash`. الهاش ده بياخد الأولوية على `ADMIN_PASSWORD` في متغيرات البيئة، ومش بيتبعت لأي صفحة عامة. لازم كلمة المرور الحالية عشان التغيير، والجديدة 8 أحرف على الأقل.
- إلغاء أي طلب من لوحة الأدمن بيرجّع الكميات للمخزون تلقائيًا (`stock_restored` بيمنع الترجيع مرتين).
- من `/admin/products` تقدر تضيف/تعدّل/تحذف المنتجات وتغيّر الكمية مباشرة من عمود «الكمية». ومن `/admin/categories` تدير الأقسام (الاسم، الترتيب، الصورة، الظهور). كل العمليات محمية بجلسة الأدمن ومتاحة فقط بعد الدخول.
- الصور منسوخة في `public/images/` ومش محتاجة أي إعداد إضافي.
- البيانات في وضع الـ fallback محفوظة في ذاكرة السيرفر، فالطلبات الجديدة بتختفي عند إعادة النشر — لازم Supabase للبيانات الحقيقية.
