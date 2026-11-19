# EMO STORE — Next.js + Vercel

متجر كامل بصفحات مستقلة لكل حاجة، بواجهة عربية RTL وتصميم جديد من الصفر.

## الصفحات

| الصفحة | الرابط |
| --- | --- |
| الرئيسية | `/` |
| المتجر (بحث + فلترة) | `/shop` |
| السلة والدفع | `/cart` |
| تتبع الطلب | `/track` |
| دخول الأدمن | `/admin/login` |
| الطلبات | `/admin/orders` |
| إعدادات المتجر | `/admin/settings` |

> دخول الأدمن **مش موجود في الصفحة الرئيسية** — لينكه الخاص بس `/admin/login` (ورابط بسيط في الفوتر).

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
6. Deploy. كل الصفحات هتشتغل على الرابط اللي Vercel يديك (`emo-store.vercel.app` مثلًا)، وكل صفحة ليها رابط مستقل.

## ملاحظات مهمة

- الـ `service_role` key موجود في متغيرات بيئة السيرفر فقط — **ما تحطهوش في `NEXT_PUBLIC_`**.
- جلسة الأدمن عبارة عن Cookie موقّع HMAC (HttpOnly) — مفيش Supabase Auth مطلوب.
- إلغاء أي طلب من لوحة الأدمن بيرجّع الكميات للمخزون تلقائيًا (`stock_restored` بيمنع الترجيع مرتين).
- الصور منسوخة في `public/images/` ومش محتاجة أي إعداد إضافي.
- البيانات في وضع الـ fallback محفوظة في ذاكرة السيرفر، فالطلبات الجديدة بتختفي عند إعادة النشر — لازم Supabase للبيانات الحقيقية.
