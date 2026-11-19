-- EMO STORE — seed data exported from ecommerce.db.
-- Run schema.sql first, then this file.

-- categories: 6 rows
insert into categories (id, name, slug, description, image_url, sort_order, is_active, created_at) values (1, 'رجالي', 'men', 'قطع أساسية وأنيقة لدولاب الرجل العصري.', '/static/img/cat-men.jpg', 1, true, '2026-11-11 21:27:12.048246');
insert into categories (id, name, slug, description, image_url, sort_order, is_active, created_at) values (2, 'نسائي', 'women', 'فساتين وبلوزات بتفاصيل ناعمة تناسب كل مناسبة.', '/static/img/cat-women.jpg', 2, true, '2026-11-11 21:27:12.048253');
insert into categories (id, name, slug, description, image_url, sort_order, is_active, created_at) values (3, 'ميكاب', 'ميكاب', 'راحة وأناقة في كل خطوة.', '/static/uploads/ee725283e0e84c3bbb558c3932f7884f.jpg', 3, true, '2026-11-11 21:27:12.048255');
insert into categories (id, name, slug, description, image_url, sort_order, is_active, created_at) values (4, 'شنط وإكسسوارات', 'bags', 'تفاصيل صغيرة تكمل الإطلالة.', '/static/img/cat-bags.jpg', 4, true, '2026-11-11 21:27:12.048256');
insert into categories (id, name, slug, description, image_url, sort_order, is_active, created_at) values (5, 'ساعات', 'watches', 'ساعات بتصميمات خالدة ودقة عالية.', '/static/img/cat-watches.jpg', 5, true, '2026-11-11 21:27:12.048258');
insert into categories (id, name, slug, description, image_url, sort_order, is_active, created_at) values (6, 'عطور', 'perfumes', 'روائح شرقية وزهريه تدوم معاك.', '/static/img/cat-perfumes.jpg', 6, true, '2026-11-11 21:27:12.048259');

-- products: 19 rows
insert into products (id, name, slug, description, details, price, compare_at_price, stock, image_url, gallery, sizes, colors, category_id, is_active, is_featured, rating, reviews_count, created_at, updated_at) values (1, 'قميص كتان كلاسيك', 'linen-shirt', 'قميص من الكتان الطبيعي بقصة مريحة، خفيف على الجسم ومثالي لأيام الصيف الطويلة. تفاصيل خياطة نظيفة وأزرار صدفية تمنحه لمسة راقية.', 'الخامة: 100% كتان طبيعي
القصة: Regular fit
العناية: غسيل بارد على 30°
بلد التصنيع: مصر', 749.0, 899.0, 24, '/static/img/linen-shirt.jpg', '[]', '["S", "M", "L", "XL", "XXL"]', '[{"name": "\u0623\u0628\u064a\u0636", "hex": "#F4F1EA"}, {"name": "\u0628\u064a\u062c", "hex": "#D9C7B2"}, {"name": "\u0623\u0632\u0631\u0642", "hex": "#3E5C76"}]', 1, true, true, 4.9, 128, '2026-11-11 21:27:12.062551', '2026-11-11 21:27:12.062557');
insert into products (id, name, slug, description, details, price, compare_at_price, stock, image_url, gallery, sizes, colors, category_id, is_active, is_featured, rating, reviews_count, created_at, updated_at) values (2, 'تيشيرت قطن أساسي', 'essential-tee', 'تيشيرت من القطن المصري عالي الجودة، بقصة أوفرسايز عصرية وحافة رقبة مقواة تدوم مع الغسيل. قطعة أساسية في كل دولاب.', 'الخامة: 100% قطن مصري
الوزن: 220 جرام
القصة: Oversized
العناية: غسيل بارد', 349.0, NULL, 60, '/static/img/essential-tee.jpg', '[]', '["S", "M", "L", "XL", "XXL"]', '[{"name": "\u0623\u0628\u064a\u0636", "hex": "#F4F1EA"}, {"name": "\u0623\u0633\u0648\u062f", "hex": "#1B1B1B"}, {"name": "\u0631\u0645\u0627\u062f\u064a", "hex": "#8C8C8C"}]', 1, true, true, 4.8, 246, '2026-11-11 21:27:12.062559', '2026-11-11 21:27:12.062561');
insert into products (id, name, slug, description, details, price, compare_at_price, stock, image_url, gallery, sizes, colors, category_id, is_active, is_featured, rating, reviews_count, created_at, updated_at) values (3, 'هودي قطن ثقيل', 'heavy-hoodie', 'هودي بقماش قطن مبطن ثقيل يحافظ على الدفء، بجيب أمامي كبير وقبعة مزدوجة. مناسب للشتا واللوك الكاجوال.', 'الخامة: قطن مبطن 380 جرام
القصة: Relaxed fit
يحتوي على جيب أمامي
العناية: غسيل على 30°', 899.0, 1099.0, 18, '/static/img/heavy-hoodie.jpg', '[]', '["M", "L", "XL", "XXL"]', '[{"name": "\u0628\u064a\u062c", "hex": "#D9C7B2"}, {"name": "\u0623\u0633\u0648\u062f", "hex": "#1B1B1B"}]', 1, true, true, 4.7, 84, '2026-11-11 21:27:12.062562', '2026-11-11 21:27:12.062564');
insert into products (id, name, slug, description, details, price, compare_at_price, stock, image_url, gallery, sizes, colors, category_id, is_active, is_featured, rating, reviews_count, created_at, updated_at) values (4, 'قميص أوكسفورد', 'oxford-shirt', 'قميص أوكسفورد بقماش منسوج بإحكام، مناسب للعمل والمناسبات. قصة مستقيمة ولون ثابت لا يبهت.', 'الخامة: 100% قطن أوكسفورد
القصة: Slim fit
أزرار كلاسيكية
قابل للكي', 799.0, NULL, 29, '/static/img/oxford-shirt.jpg', '[]', '["M", "L", "XL"]', '[{"name": "\u0623\u0632\u0631\u0642", "hex": "#3E5C76"}, {"name": "\u0623\u0628\u064a\u0636", "hex": "#F4F1EA"}]', 1, true, false, 4.8, 61, '2026-11-11 21:27:12.062565', '2026-11-12 08:41:03.237736');
insert into products (id, name, slug, description, details, price, compare_at_price, stock, image_url, gallery, sizes, colors, category_id, is_active, is_featured, rating, reviews_count, created_at, updated_at) values (5, 'فستان ساتان طويل', 'satin-dress', 'فستان ساتان بلمعة ناعمة وقصة انسيابية تبرز القوام بأناقة. مثالي للسهرات والمناسبات الخاصة.', 'الخامة: ساتان عالي الجودة
القصة: ميدي/طويل
سحاب خلفي مخفي
العناية: غسيل يدوي أو تنظيف جاف', 1290.0, 1490.0, 12, '/static/img/satin-dress.jpg', '[]', '["S", "M", "L"]', '[{"name": "\u0634\u0627\u0645\u0628\u0627\u0646\u064a\u0627", "hex": "#E4CBB8"}, {"name": "\u0623\u0633\u0648\u062f", "hex": "#1B1B1B"}]', 2, true, true, 4.9, 97, '2026-11-11 21:27:12.062568', '2026-11-11 21:27:12.062569');
insert into products (id, name, slug, description, details, price, compare_at_price, stock, image_url, gallery, sizes, colors, category_id, is_active, is_featured, rating, reviews_count, created_at, updated_at) values (6, 'فستان صيفي مطبوع', 'summer-dress', 'فستان خفيف بطبعات مستوحاة من الطبيعة، بقصة واسعة مريحة وأكمام قصيرة. قطعة منعشة لأيام المصيف.', 'الخامة: فيسكوز ناعم
القصة: A-line
أكمام قصيرة
مبطن من الداخل', 950.0, NULL, 20, '/static/img/summer-dress.jpg', '[]', '["S", "M", "L", "XL"]', '[{"name": "\u0645\u062a\u0639\u062f\u062f", "hex": "#C98B6B"}, {"name": "\u0623\u0632\u0631\u0642", "hex": "#3E5C76"}]', 2, true, false, 4.6, 53, '2026-11-11 21:27:12.062570', '2026-11-11 21:27:12.062571');
insert into products (id, name, slug, description, details, price, compare_at_price, stock, image_url, gallery, sizes, colors, category_id, is_active, is_featured, rating, reviews_count, created_at, updated_at) values (7, 'بلوزة حرير ناعمة', 'silk-blouse', 'بلوزة من الحرير الصناعي الناعم بلمعة خفيفة، بتفاصيل أكمام أنيقة وسهولة في التنسيق مع البنطلون أو الجيبة.', 'الخامة: حرير صناعي
القصة: Relaxed
أكمام طويلة
العناية: غسيل بارد', 680.0, 820.0, 25, '/static/img/silk-blouse.jpg', '[]', '["S", "M", "L"]', '[{"name": "\u0623\u0648\u0641 \u0648\u0627\u064a\u062a", "hex": "#EFEAE0"}, {"name": "\u0648\u0631\u062f\u064a", "hex": "#D8A7A7"}]', 2, true, true, 4.7, 72, '2026-11-11 21:27:12.062573', '2026-11-11 21:27:12.062574');
insert into products (id, name, slug, description, details, price, compare_at_price, stock, image_url, gallery, sizes, colors, category_id, is_active, is_featured, rating, reviews_count, created_at, updated_at) values (8, 'فستان كلاسيك', 'classic-dress', 'فستان بقصة كلاسيكية خالدة ولون محايد يناسب كل المناسبات، مصنوع من قماش مريح يحافظ على شكله.', 'الخامة: بوليستر مخلوط
القصة: Straight
طول: تحت الركبة
سحاب جانبي', 1150.0, NULL, 15, '/static/img/classic-dress.jpg', '[]', '["S", "M", "L"]', '[{"name": "\u0623\u0633\u0648\u062f", "hex": "#1B1B1B"}, {"name": "\u0643\u062d\u0644\u064a", "hex": "#2A3A55"}]', 2, true, false, 4.8, 44, '2026-11-11 21:27:12.062575', '2026-11-11 21:27:12.062576');
insert into products (id, name, slug, description, details, price, compare_at_price, stock, image_url, gallery, sizes, colors, category_id, is_active, is_featured, rating, reviews_count, created_at, updated_at) values (9, 'سنيكرز جلد أبيض', 'leather-sneakers', 'سنيكرز من الجلد الطبيعي بتصميم مينيمال ونعل مرن مريح للاستخدام اليومي. يناسب اللوك الكاجوال والرسمي الخفيف.', 'الخامة: جلد طبيعي
النعل: مطاطي مرن
البطانة: قماش تنفسي
صناعة: مصر', 1490.0, 1790.0, 16, '/static/img/leather-sneakers.jpg', '[]', '["39", "40", "41", "42", "43", "44", "45"]', '[{"name": "\u0623\u0628\u064a\u0636", "hex": "#F4F1EA"}, {"name": "\u0628\u064a\u062c", "hex": "#D9C7B2"}]', 3, true, true, 4.9, 156, '2026-11-11 21:27:12.062577', '2026-11-11 21:27:12.062578');
insert into products (id, name, slug, description, details, price, compare_at_price, stock, image_url, gallery, sizes, colors, category_id, is_active, is_featured, rating, reviews_count, created_at, updated_at) values (10, 'روج', 'روج', NULL, NULL, 50.0, NULL, 0, '/static/uploads/267f8df0166f4fe28507d15b038aecd4.jpg', '[]', '[]', '[]', 3, true, false, 4.7, 88, '2026-11-11 21:27:12.062579', '2026-11-15 13:51:41.520519');
insert into products (id, name, slug, description, details, price, compare_at_price, stock, image_url, gallery, sizes, colors, category_id, is_active, is_featured, rating, reviews_count, created_at, updated_at) values (11, 'سنيكرز يومي', 'daily-sneakers', 'سنيكرز عملي بتصميم بسيط وألوان سهلة التنسيق، مع بطانة مريحة ونعل مقاوم للانزلاق.', 'الخامة: جلد صناعي + قماش
النعل: مطاطي
بطانة إسفنجية
وزن خفيف', 990.0, 1190.0, 28, '/static/img/daily-sneakers.jpg', '[]', '["39", "40", "41", "42", "43", "44", "45"]', '[{"name": "\u0623\u0628\u064a\u0636", "hex": "#F4F1EA"}, {"name": "\u0643\u062d\u0644\u064a", "hex": "#2A3A55"}]', 3, true, true, 4.6, 112, '2026-11-11 21:27:12.062582', '2026-11-11 21:27:12.062583');
insert into products (id, name, slug, description, details, price, compare_at_price, stock, image_url, gallery, sizes, colors, category_id, is_active, is_featured, rating, reviews_count, created_at, updated_at) values (12, 'شنطة يد جلد طبيعي', 'leather-handbag', 'شنطة يد من الجلد الطبيعي بتشطيب يدوي وحجم عملي يتسع لكل أساسياتك. تصميم كلاسيكي يعيش معاك سنين.', 'الخامة: جلد طبيعي
بطانة قماشية
جيب داخلي بسحاب
حزام كتف قابل للفك', 1350.0, NULL, 8, '/static/img/leather-handbag.jpg', '[]', '[]', '[{"name": "\u0628\u0646\u064a", "hex": "#7A5230"}, {"name": "\u0623\u0633\u0648\u062f", "hex": "#1B1B1B"}]', 4, true, true, 4.9, 64, '2026-11-11 21:27:12.062584', '2026-11-12 08:41:03.237190');
insert into products (id, name, slug, description, details, price, compare_at_price, stock, image_url, gallery, sizes, colors, category_id, is_active, is_featured, rating, reviews_count, created_at, updated_at) values (13, 'شنطة كتف أنيقة', 'shoulder-bag', 'شنطة كتف بحجم مثالي للخروجات، حزام قابل للتعديل وجيوب داخلية منظمة.', 'الخامة: جلد صناعي فاخر
حزام قابل للتعديل
سحاب علوي
جيوب داخلية', 890.0, 1050.0, 14, '/static/img/shoulder-bag.jpg', '[]', '[]', '[{"name": "\u0628\u064a\u062c", "hex": "#D9C7B2"}, {"name": "\u0623\u0633\u0648\u062f", "hex": "#1B1B1B"}]', 4, true, false, 4.7, 39, '2026-11-11 21:27:12.062586', '2026-11-11 21:27:12.062587');
insert into products (id, name, slug, description, details, price, compare_at_price, stock, image_url, gallery, sizes, colors, category_id, is_active, is_featured, rating, reviews_count, created_at, updated_at) values (14, 'حقيبة ظهر عملية', 'city-backpack', 'حقيبة ظهر بمساحة ذكية للابتوب والأغراض اليومية، خامة مقاومة للماء وسحابات متينة.', 'تتسع للابتوب حتى 15 بوصة
خامة مقاومة للماء
جيب خلفي سري
حمالات مبطنة', 750.0, NULL, 26, '/static/img/city-backpack.jpg', '[]', '[]', '[{"name": "\u0631\u0645\u0627\u062f\u064a", "hex": "#8C8C8C"}, {"name": "\u0623\u0633\u0648\u062f", "hex": "#1B1B1B"}]', 4, true, false, 4.8, 77, '2026-11-11 21:27:12.062588', '2026-11-11 21:27:12.062589');
insert into products (id, name, slug, description, details, price, compare_at_price, stock, image_url, gallery, sizes, colors, category_id, is_active, is_featured, rating, reviews_count, created_at, updated_at) values (15, 'ساعة كلاسيك جلد', 'classic-watch', 'ساعة كلاسيكية بحركة كوارتز دقيقة وسوار جلد طبيعي، تصميم خالد يناسب كل الإطلالات.', 'حركة كوارتز يابانية
سوار جلد طبيعي
مقاومة للماء 3ATM
ضمان سنة', 1850.0, 2200.0, 8, '/static/img/classic-watch.jpg', '[]', '[]', '[{"name": "\u0628\u0646\u064a", "hex": "#7A5230"}, {"name": "\u0623\u0633\u0648\u062f", "hex": "#1B1B1B"}]', 5, true, true, 4.9, 58, '2026-11-11 21:27:12.062591', '2026-11-11 21:27:12.062592');
insert into products (id, name, slug, description, details, price, compare_at_price, stock, image_url, gallery, sizes, colors, category_id, is_active, is_featured, rating, reviews_count, created_at, updated_at) values (16, 'ساعة مينيمال', 'minimal-watch', 'ساعة بتصميم مينيمال وميناء نظيف، خفيفة على المعصم ومناسبة للاستخدام اليومي.', 'ميناء 38 مم
حركة كوارتز
سوار ستانلس ستيل
مقاومة للماء 3ATM', 1450.0, NULL, 12, '/static/img/minimal-watch.jpg', '[]', '[]', '[{"name": "\u0641\u0636\u064a", "hex": "#B9BCC0"}, {"name": "\u0630\u0647\u0628\u064a", "hex": "#C9A24B"}]', 5, true, false, 4.7, 41, '2026-11-11 21:27:12.062593', '2026-11-11 21:27:12.062594');
insert into products (id, name, slug, description, details, price, compare_at_price, stock, image_url, gallery, sizes, colors, category_id, is_active, is_featured, rating, reviews_count, created_at, updated_at) values (17, 'عطر عود ملكي', 'royal-oud', 'عطر شرقي فخم بمزيج من العود والعنبر والمسك، ثبات طويل وقاعدة دافئة تترك أثرًا لا يُنسى.', 'الحجم: 100 مل
العائلة العطرية: شرقي خشبي
الثبات: 8-10 ساعات
الاستخدام: مسائي', 1650.0, NULL, 18, '/static/img/royal-oud.jpg', '[]', '[]', '[]', 6, true, true, 4.9, 132, '2026-11-11 21:27:12.062595', '2026-11-11 21:34:59.832825');
insert into products (id, name, slug, description, details, price, compare_at_price, stock, image_url, gallery, sizes, colors, category_id, is_active, is_featured, rating, reviews_count, created_at, updated_at) values (18, 'عطر مسك أبيض', 'white-musk', 'عطر مسك أبيض ناعم ونظيف، مناسب للاستخدام اليومي وللأجواء الصيفية.', 'الحجم: 100 مل
العائلة العطرية: مسك أبيض
الثبات: 6-8 ساعات
الاستخدام: نهاري', 980.0, 1150.0, 30, '/static/img/white-musk.jpg', '[]', '[]', '[]', 6, true, false, 4.8, 89, '2026-11-11 21:27:12.062598', '2026-11-11 21:27:12.062599');
insert into products (id, name, slug, description, details, price, compare_at_price, stock, image_url, gallery, sizes, colors, category_id, is_active, is_featured, rating, reviews_count, created_at, updated_at) values (19, 'عطر زهري فاخر', 'floral-perfume', 'عطر زهري أنثوي بقلب من الياسمين والورد، خفيف ومنعش مع ثبات يدوم طوال اليوم.', 'الحجم: 100 مل
العائلة العطرية: زهري
الثبات: 6-8 ساعات
الاستخدام: يومي', 1250.0, NULL, 18, '/static/img/floral-perfume.jpg', '[]', '[]', '[]', 6, true, false, 4.7, 66, '2026-11-11 21:27:12.062600', '2026-11-12 09:20:24.206266');

-- settings: 18 rows
insert into settings (key, value) values ('store_name', 'EMO STORE');
insert into settings (key, value) values ('store_name_en', 'EMO STORE');
insert into settings (key, value) values ('store_tagline', 'قطع مختارة بعناية، لتفاصيل تستحقها');
insert into settings (key, value) values ('store_currency', 'ج.م');
insert into settings (key, value) values ('free_shipping_enabled', 'true');
insert into settings (key, value) values ('free_shipping_threshold', '1500.0');
insert into settings (key, value) values ('default_shipping_fee', '60.0');
insert into settings (key, value) values ('instapay_handle', 'emo.store@instapay');
insert into settings (key, value) values ('wallet_number', '0100 000 0000');
insert into settings (key, value) values ('shipping_initialized', 'true');
insert into settings (key, value) values ('payments_initialized', 'true');
insert into settings (key, value) values ('contact_email', 'hello@emo.store');
insert into settings (key, value) values ('instagram_url', 'https://instagram.com/emostore');
insert into settings (key, value) values ('contact_phone', '+20 100 000 0000');
insert into settings (key, value) values ('store_address', 'القاهرة، مصر');
insert into settings (key, value) values ('working_hours', 'السبت – الخميس: 10 ص – 8 م');
insert into settings (key, value) values ('facebook_url', 'https://facebook.com/emostore');
insert into settings (key, value) values ('whatsapp_number', '+20 100 000 0000');

-- shipping_governorates: 27 rows
insert into shipping_governorates (id, name, fee, is_active, sort_order) values (1, 'القاهرة', 50.0, true, 1);
insert into shipping_governorates (id, name, fee, is_active, sort_order) values (2, 'الجيزة', 50.0, true, 2);
insert into shipping_governorates (id, name, fee, is_active, sort_order) values (3, 'القليوبية', 60.0, true, 3);
insert into shipping_governorates (id, name, fee, is_active, sort_order) values (4, 'الإسكندرية', 60.0, true, 4);
insert into shipping_governorates (id, name, fee, is_active, sort_order) values (5, 'الدقهلية', 65.0, true, 5);
insert into shipping_governorates (id, name, fee, is_active, sort_order) values (6, 'الشرقية', 65.0, true, 6);
insert into shipping_governorates (id, name, fee, is_active, sort_order) values (7, 'الغربية', 65.0, true, 7);
insert into shipping_governorates (id, name, fee, is_active, sort_order) values (8, 'المنوفية', 65.0, true, 8);
insert into shipping_governorates (id, name, fee, is_active, sort_order) values (9, 'البحيرة', 65.0, true, 9);
insert into shipping_governorates (id, name, fee, is_active, sort_order) values (10, 'كفر الشيخ', 70.0, true, 10);
insert into shipping_governorates (id, name, fee, is_active, sort_order) values (11, 'دمياط', 70.0, true, 11);
insert into shipping_governorates (id, name, fee, is_active, sort_order) values (12, 'بورسعيد', 70.0, true, 12);
insert into shipping_governorates (id, name, fee, is_active, sort_order) values (13, 'الإسماعيلية', 70.0, true, 13);
insert into shipping_governorates (id, name, fee, is_active, sort_order) values (14, 'السويس', 70.0, true, 14);
insert into shipping_governorates (id, name, fee, is_active, sort_order) values (15, 'الفيوم', 75.0, true, 15);
insert into shipping_governorates (id, name, fee, is_active, sort_order) values (16, 'بني سويف', 75.0, true, 16);
insert into shipping_governorates (id, name, fee, is_active, sort_order) values (17, 'المنيا', 80.0, true, 17);
insert into shipping_governorates (id, name, fee, is_active, sort_order) values (18, 'أسيوط', 80.0, true, 18);
insert into shipping_governorates (id, name, fee, is_active, sort_order) values (19, 'سوهاج', 85.0, true, 19);
insert into shipping_governorates (id, name, fee, is_active, sort_order) values (20, 'قنا', 90.0, true, 20);
insert into shipping_governorates (id, name, fee, is_active, sort_order) values (21, 'الأقصر', 90.0, true, 21);
insert into shipping_governorates (id, name, fee, is_active, sort_order) values (22, 'أسوان', 100.0, true, 22);
insert into shipping_governorates (id, name, fee, is_active, sort_order) values (23, 'البحر الأحمر', 100.0, true, 23);
insert into shipping_governorates (id, name, fee, is_active, sort_order) values (24, 'مطروح', 100.0, true, 24);
insert into shipping_governorates (id, name, fee, is_active, sort_order) values (25, 'شمال سيناء', 110.0, true, 25);
insert into shipping_governorates (id, name, fee, is_active, sort_order) values (26, 'جنوب سيناء', 110.0, true, 26);
insert into shipping_governorates (id, name, fee, is_active, sort_order) values (27, 'الوادي الجديد', 110.0, true, 27);

-- payment_methods: 3 rows
insert into payment_methods (id, code, name, description, icon, is_active, sort_order, created_at) values (1, 'cod', 'الدفع عند الاستلام', 'ادفع نقدًا لمندوب الشحن عند وصول الطلب.', 'cash', true, 1, '2026-11-12 09:16:19.253236');
insert into payment_methods (id, code, name, description, icon, is_active, sort_order, created_at) values (2, 'instapay', 'إنستاباي', 'حوّل المبلغ على حساب المتجر ثم أرسل صورة التحويل.', 'creditCard', true, 2, '2026-11-12 09:16:19.253241');
insert into payment_methods (id, code, name, description, icon, is_active, sort_order, created_at) values (3, 'wallet', 'محفظة إلكترونية', 'فودافون كاش أو غيرها من المحافظ الإلكترونية.', 'wallet', true, 3, '2026-11-12 09:16:19.253243');

select setval(pg_get_serial_sequence('orders', 'id'), 1, false);
select setval(pg_get_serial_sequence('order_items', 'id'), 1, false);
