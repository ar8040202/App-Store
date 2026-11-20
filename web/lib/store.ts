import { createClient } from "@supabase/supabase-js";
import seed from "@/data/seed.json";
import { deleteImages } from "@/lib/image-cleanup";
import type {
  Catalog,
  Category,
  CreateOrderInput,
  Governorate,
  Order,
  PaymentMethod,
  Product,
  Settings,
} from "@/lib/types";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase =
  supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } })
    : null;

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export const ADMIN_PASSWORD_HASH_KEY = "admin_password_hash";

/** لا نرسل الهاش أبداً للصفحات العامة أو لعميل الإعدادات. */
function stripSecret(values: Settings): Settings {
  return Object.fromEntries(
    Object.entries(values).filter(([key]) => key !== ADMIN_PASSWORD_HASH_KEY),
  );
}

/** القيم القادمة من قاعدة البيانات القديمة مخزّنة كنصوص JSON (مثال: "\"EMO STORE\""). */
export function decodeSetting(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value !== "string") return String(value);
  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === "object") return JSON.stringify(parsed);
    return String(parsed);
  } catch {
    return value;
  }
}

function decodeSettings(values: Record<string, unknown>): Settings {
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, decodeSetting(value)]),
  );
}

type MemoryStore = {
  products: Product[];
  categories: Category[];
  settings: Settings;
  governorates: Governorate[];
  paymentMethods: PaymentMethod[];
  orders: Order[];
};

const memory: MemoryStore = {
  products: clone(seed.products as Product[]),
  categories: clone(seed.categories as Category[]),
  settings: decodeSettings(seed.settings as Record<string, unknown>),
  governorates: clone(seed.governorates as Governorate[]),
  paymentMethods: clone(seed.paymentMethods as PaymentMethod[]),
  orders: [],
};

export function imageSrc(url: string | null | undefined): string {
  if (!url) return "/images/placeholder.svg";
  if (url.startsWith("http") || url.startsWith("data:")) return url;
  if (url.startsWith("/images/")) return url;
  const file = url.split("/").pop();
  return file ? `/images/${file}` : "/images/placeholder.svg";
}

export function money(value: number, currency = "ج.م"): string {
  return `${Number(value).toLocaleString("en-US", {
    maximumFractionDigits: 2,
  })} ${currency}`;
}

export function categoryName(id: number | null): string {
  return memory.categories.find((c) => c.id === id)?.name ?? "عام";
}

export async function getCatalog(): Promise<Catalog> {
  if (supabase) {
    const [products, categories, settings, governorates, paymentMethods] =
      await Promise.all([
        supabase.from("products").select("*").eq("is_active", true).order("id"),
        supabase
          .from("categories")
          .select("*")
          .eq("is_active", true)
          .order("sort_order"),
        supabase.from("settings").select("key,value"),
        supabase
          .from("shipping_governorates")
          .select("*")
          .eq("is_active", true)
          .order("sort_order"),
        supabase
          .from("payment_methods")
          .select("*")
          .eq("is_active", true)
          .order("sort_order"),
      ]);

    return {
      products: (products.data ?? []) as Product[],
      categories: (categories.data ?? []) as Category[],
      settings: stripSecret(
        decodeSettings(
          Object.fromEntries(
            (settings.data ?? []).map((row: { key: string; value: string }) => [
              row.key,
              row.value,
            ]),
          ),
        ),
      ),
      governorates: (governorates.data ?? []) as Governorate[],
      paymentMethods: (paymentMethods.data ?? []) as PaymentMethod[],
    };
  }

  return {
    products: clone(memory.products).filter((p) => p.is_active),
    categories: clone(memory.categories).filter((c) => c.is_active),
    settings: stripSecret(clone(memory.settings)),
    governorates: clone(memory.governorates).filter((g) => g.is_active),
    paymentMethods: clone(memory.paymentMethods).filter((p) => p.is_active),
  };
}

export async function getSettings(): Promise<Settings> {
  const catalog = await getCatalog();
  return catalog.settings;
}

export async function updateSettings(values: Settings): Promise<Settings> {
  if (supabase) {
    const rows = Object.entries(values).map(([key, value]) => ({ key, value }));
    const { error } = await supabase.from("settings").upsert(rows, {
      onConflict: "key",
    });
    if (error) throw new Error(error.message);
  } else {
    memory.settings = { ...memory.settings, ...values };
  }
  return values;
}

export async function createOrder(input: CreateOrderInput): Promise<Order> {
  const catalog = await getCatalog();
  const items: Order["items"] = [];
  let subtotal = 0;

  for (const line of input.items) {
    if (!Number.isInteger(line.quantity) || line.quantity < 1) {
      throw new Error("كمية غير صحيحة");
    }
    const product = catalog.products.find((p) => p.id === line.product_id);
    if (!product) throw new Error("أحد المنتجات غير موجود");
    if (product.stock < line.quantity) {
      throw new Error(`الكمية غير متوفرة من ${product.name}`);
    }
    const lineTotal = product.price * line.quantity;
    subtotal += lineTotal;
    items.push({
      product_id: product.id,
      product_name: product.name,
      image_url: product.image_url,
      unit_price: product.price,
      quantity: line.quantity,
      line_total: lineTotal,
    });
  }

  const fee = catalog.governorates.find((g) => g.name === input.governorate)?.fee ?? 0;
  const now = Date.now();
  const order: Order = {
    id: now,
    order_number: `EMO-${now.toString(36).toUpperCase()}`,
    customer_name: input.customer_name,
    customer_phone: input.customer_phone,
    governorate: input.governorate,
    city: input.city,
    address: input.address,
    notes: input.notes || null,
    payment_method: input.payment_method,
    payment_status: "pending",
    subtotal,
    shipping_fee: fee,
    total: subtotal + fee,
    status: "pending",
    stock_restored: false,
    created_at: new Date().toISOString(),
    items,
  };

  if (supabase) {
    const { data, error } = await supabase
      .from("orders")
      .insert({
        order_number: order.order_number,
        customer_name: order.customer_name,
        customer_phone: order.customer_phone,
        governorate: order.governorate,
        city: order.city,
        address: order.address,
        notes: order.notes,
        payment_method: order.payment_method,
        payment_status: order.payment_status,
        subtotal: order.subtotal,
        shipping_fee: order.shipping_fee,
        total: order.total,
        status: order.status,
        stock_restored: false,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    order.id = data.id;

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(items.map((item) => ({ ...item, order_id: order.id })));
    if (itemsError) throw new Error(itemsError.message);

    for (const line of input.items) {
      const product = catalog.products.find((p) => p.id === line.product_id)!;
      const { error: stockError } = await supabase
        .from("products")
        .update({ stock: Math.max(0, product.stock - line.quantity) })
        .eq("id", product.id);
      if (stockError) throw new Error(stockError.message);
    }
  } else {
    memory.orders.unshift(clone(order));
    for (const line of input.items) {
      const product = memory.products.find((p) => p.id === line.product_id);
      if (product) product.stock = Math.max(0, product.stock - line.quantity);
    }
  }

  return order;
}

export async function findOrder(number: string, phone: string): Promise<Order | null> {
  if (supabase) {
    const { data } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .ilike("order_number", number.trim())
      .eq("customer_phone", phone.trim())
      .maybeSingle();
    return (data as Order) ?? null;
  }
  return (
    memory.orders.find(
      (o) =>
        o.order_number.toLowerCase() === number.trim().toLowerCase() &&
        o.customer_phone.replace(/\s+/g, "") === phone.replace(/\s+/g, ""),
    ) ?? null
  );
}

export async function listOrders(): Promise<Order[]> {
  if (supabase) {
    const { data } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .order("created_at", { ascending: false });
    return (data ?? []) as Order[];
  }
  return clone(memory.orders);
}

export async function updateOrderStatus(id: number, status: string): Promise<void> {
  if (supabase) {
    const { data: order } = await supabase
      .from("orders")
      .select("*")
      .eq("id", id)
      .single();
    if (!order) throw new Error("الطلب غير موجود");

    if (status === "cancelled" && !order.stock_restored) {
      const { data: items } = await supabase
        .from("order_items")
        .select("*")
        .eq("order_id", id);
      for (const item of items ?? []) {
        const { data: product } = await supabase
          .from("products")
          .select("stock")
          .eq("id", item.product_id)
          .single();
        const { error: restoreError } = await supabase
          .from("products")
          .update({ stock: (product?.stock ?? 0) + item.quantity })
          .eq("id", item.product_id);
        if (restoreError) throw new Error(restoreError.message);
      }
      await supabase.from("orders").update({ stock_restored: true }).eq("id", id);
    }

    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) throw new Error(error.message);
    return;
  }

  const order = memory.orders.find((o) => o.id === id);
  if (!order) throw new Error("الطلب غير موجود");
  if (status === "cancelled" && !order.stock_restored) {
    for (const item of order.items ?? []) {
      const product = memory.products.find((p) => p.id === item.product_id);
      if (product) product.stock += item.quantity;
    }
    order.stock_restored = true;
  }
  order.status = status;
}

export async function getAdminPasswordHash(): Promise<string> {
  if (supabase) {
    const { data } = await supabase
      .from("settings")
      .select("value")
      .eq("key", ADMIN_PASSWORD_HASH_KEY)
      .maybeSingle();
    return data ? decodeSetting(data.value) : "";
  }
  return memory.settings[ADMIN_PASSWORD_HASH_KEY] ?? "";
}

export async function setAdminPasswordHash(value: string): Promise<void> {
  if (supabase) {
    const { error } = await supabase.from("settings").upsert(
      { key: ADMIN_PASSWORD_HASH_KEY, value },
      { onConflict: "key" },
    );
    if (error) throw new Error(error.message);
  } else {
    memory.settings[ADMIN_PASSWORD_HASH_KEY] = value;
  }
}

/* ------------------------------------------------------------------ */
/* Catalog management (admin)                                          */
/* ------------------------------------------------------------------ */

function normalizeSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06ff]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function nextId(table: "categories" | "products"): Promise<number> {
  if (supabase) {
    const { data } = await supabase
      .from(table)
      .select("id")
      .order("id", { ascending: false })
      .limit(1);
    return Number(data?.[0]?.id ?? 0) + 1;
  }
  const rows = table === "categories" ? memory.categories : memory.products;
  return Math.max(0, ...rows.map((row) => row.id)) + 1;
}

const galleryUrls = (value: string | null | undefined): string[] =>
  (value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

async function currentCategory(id: number): Promise<Category | null> {
  if (supabase) {
    const { data } = await supabase
      .from("categories")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    return (data as Category) ?? null;
  }
  return memory.categories.find((item) => item.id === id) ?? null;
}

async function currentProduct(id: number): Promise<Product | null> {
  if (supabase) {
    const { data } = await supabase
      .from("products")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    return (data as Product) ?? null;
  }
  return memory.products.find((item) => item.id === id) ?? null;
}

/**
 * تمسح صور الـ bucket اللي ما بقت مستخدمة في أي منتج أو قسم.
 * بنفحص كل الجداول قبل الحذف عشان صورة مشتركة بين أكتر من منتج ما تتمسحش.
 */
async function cleanupUnusedImages(candidates: string[]): Promise<void> {
  const urls = [...new Set(candidates.filter(Boolean))];
  if (!urls.length) return;

  try {
    const referenced = new Set<string>();
    if (supabase) {
      const [{ data: products }, { data: categories }] = await Promise.all([
        supabase.from("products").select("image_url,gallery"),
        supabase.from("categories").select("image_url"),
      ]);
      for (const product of products ?? []) {
        if (product.image_url) referenced.add(product.image_url);
        for (const url of galleryUrls(product.gallery)) referenced.add(url);
      }
      for (const category of categories ?? []) {
        if (category.image_url) referenced.add(category.image_url);
      }
    } else {
      for (const product of memory.products) {
        if (product.image_url) referenced.add(product.image_url);
        for (const url of galleryUrls(product.gallery)) referenced.add(url);
      }
      for (const category of memory.categories) {
        if (category.image_url) referenced.add(category.image_url);
      }
    }

    const unused = urls.filter((url) => !referenced.has(url));
    if (unused.length) await deleteImages(unused);
  } catch {
    // تعذّر حذف صورة قديمة مش لازم يفشل حفظ المنتج أو القسم.
  }
}

export type CategoryInput = {
  id?: number;
  name: string;
  slug?: string;
  description?: string | null;
  image_url?: string | null;
  sort_order?: number;
  is_active?: boolean;
};

export async function listAdminCategories(): Promise<Category[]> {
  if (supabase) {
    const { data } = await supabase
      .from("categories")
      .select("*")
      .order("sort_order")
      .order("id");
    return (data ?? []) as Category[];
  }
  return clone(memory.categories).sort(
    (a, b) => Number(a.sort_order) - Number(b.sort_order) || a.id - b.id,
  );
}

export async function saveCategory(input: CategoryInput): Promise<Category> {
  const name = (input.name || "").trim();
  if (!name) throw new Error("اسم القسم مطلوب");
  const id = Number(input.id) || (await nextId("categories"));
  const previous = await currentCategory(id);
  const row: Category = {
    id,
    name,
    slug: normalizeSlug(input.slug || name) || `category-${id}`,
    description: input.description?.trim() || null,
    image_url: input.image_url?.trim() || null,
    sort_order: Number(input.sort_order ?? 0),
    is_active: input.is_active !== false,
  };

  if (supabase) {
    const { data, error } = await supabase
      .from("categories")
      .upsert(row, { onConflict: "id" })
      .select()
      .single();
    if (error) throw new Error(error.message);
    await cleanupUnusedImages([previous?.image_url || ""]);
    return data as Category;
  }

  const index = memory.categories.findIndex((item) => item.id === id);
  if (index >= 0) memory.categories[index] = row;
  else memory.categories.push(row);
  await cleanupUnusedImages([previous?.image_url || ""]);
  return clone(row);
}

export async function deleteCategory(id: number): Promise<void> {
  const previous = await currentCategory(id);
  if (supabase) {
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) throw new Error(error.message);
  } else {
    memory.categories = memory.categories.filter((item) => item.id !== id);
    for (const product of memory.products) {
      if (product.category_id === id) product.category_id = null;
    }
  }
  await cleanupUnusedImages([previous?.image_url || ""]);
}

export type ProductInput = {
  id?: number;
  name: string;
  slug?: string;
  description?: string | null;
  details?: string | null;
  price: number;
  compare_at_price?: number | null;
  stock: number;
  image_url?: string | null;
  gallery?: string | null;
  sizes?: string | null;
  colors?: string | null;
  category_id?: number | null;
  is_active?: boolean;
  is_featured?: boolean;
  rating?: number | null;
  reviews_count?: number | null;
};

export async function listAdminProducts(): Promise<Product[]> {
  if (supabase) {
    const { data } = await supabase.from("products").select("*").order("id");
    return (data ?? []) as Product[];
  }
  return clone(memory.products).sort((a, b) => a.id - b.id);
}

export async function saveProduct(input: ProductInput): Promise<Product> {
  const name = (input.name || "").trim();
  const price = Number(input.price);
  const stock = Number(input.stock);
  if (!name) throw new Error("اسم المنتج مطلوب");
  if (!Number.isFinite(price) || price < 0) throw new Error("السعر غير صحيح");
  if (!Number.isInteger(stock) || stock < 0) {
    throw new Error("الكمية يجب أن تكون رقماً صحيحاً");
  }

  const id = Number(input.id) || (await nextId("products"));
  const previous = await currentProduct(id);
  const row: Product = {
    id,
    name,
    slug: normalizeSlug(input.slug || name) || `product-${id}`,
    description: input.description?.trim() || null,
    details: input.details?.trim() || null,
    price,
    compare_at_price: input.compare_at_price ? Number(input.compare_at_price) : null,
    stock,
    image_url: input.image_url?.trim() || null,
    gallery: input.gallery?.trim() || null,
    sizes: input.sizes?.trim() || null,
    colors: input.colors?.trim() || null,
    category_id: input.category_id ? Number(input.category_id) : null,
    is_active: input.is_active !== false,
    is_featured: input.is_featured === true,
    rating: input.rating == null ? null : Number(input.rating),
    reviews_count: input.reviews_count == null ? null : Number(input.reviews_count),
  };

  if (supabase) {
    const { data, error } = await supabase
      .from("products")
      .upsert(row, { onConflict: "id" })
      .select()
      .single();
    if (error) throw new Error(error.message);
    await cleanupUnusedImages([
      previous?.image_url || "",
      ...galleryUrls(previous?.gallery),
    ]);
    return data as Product;
  }

  const index = memory.products.findIndex((item) => item.id === id);
  if (index >= 0) memory.products[index] = row;
  else memory.products.push(row);
  await cleanupUnusedImages([
    previous?.image_url || "",
    ...galleryUrls(previous?.gallery),
  ]);
  return clone(row);
}

export async function deleteProduct(id: number): Promise<void> {
  const previous = await currentProduct(id);
  if (supabase) {
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) throw new Error(error.message);
  } else {
    memory.products = memory.products.filter((item) => item.id !== id);
  }
  await cleanupUnusedImages([
    previous?.image_url || "",
    ...galleryUrls(previous?.gallery),
  ]);
}
