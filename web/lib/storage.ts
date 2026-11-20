import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

export const IMAGE_BUCKET = "product-images";
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // حد Vercel على حجم الطلب

const ALLOWED: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase =
  supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } })
    : null;

export async function uploadImage(file: File): Promise<string> {
  const extension = ALLOWED[file.type];
  if (!extension) {
    throw new Error("الصيغة غير مدعومة. استخدم JPG أو PNG أو WebP أو GIF أو AVIF");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("حجم الصورة يجب ألا يتجاوز 4 ميجابايت");
  }
  if (file.size === 0) {
    throw new Error("الملف فارغ");
  }

  const bytes = new Uint8Array(await file.arrayBuffer());

  if (supabase) {
    const path = `${Date.now()}-${randomUUID()}.${extension}`;
    const { error } = await supabase.storage
      .from(IMAGE_BUCKET)
      .upload(path, bytes, { contentType: file.type, upsert: false });
    if (error) throw new Error(error.message);
    const { data } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path);
    return data.publicUrl;
  }

  // وضع المعاينة المحلي без Supabase: نخزّن الصورة كـ data URL في الذاكرة.
  return `data:${file.type};base64,${Buffer.from(bytes).toString("base64")}`;
}
