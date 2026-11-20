import { createClient } from "@supabase/supabase-js";

const IMAGE_BUCKET = "product-images";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase =
  supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } })
    : null;

/** يرجع مسار الملف داخل bucket الصور فقط، ويتجاهل أي رابط خارجي أو محلي. */
export function imageObjectPath(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (supabaseUrl && parsed.host !== new URL(supabaseUrl).host) return null;
    const prefix = `/storage/v1/object/public/${IMAGE_BUCKET}/`;
    if (!parsed.pathname.startsWith(prefix)) return null;
    const raw = parsed.pathname.slice(prefix.length);
    return raw ? decodeURIComponent(raw) : null;
  } catch {
    return null;
  }
}

/** حذف صور الـ bucket اللي ما بقت مستخدمة في أي مكان تاني. */
export async function deleteImages(urls: string[]): Promise<void> {
  if (!supabase) return;
  const paths = [
    ...new Set(urls.map(imageObjectPath).filter((path): path is string => Boolean(path))),
  ];
  if (!paths.length) return;
  const { error } = await supabase.storage.from(IMAGE_BUCKET).remove(paths);
  if (error) throw new Error(error.message);
}
