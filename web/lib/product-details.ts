/** أدوات قراءة بيانات المنتج بأشكالها القديمة والجديدة (JSON أو نص مفصول بفواصل). */

function parseArray(value: string | null | undefined): unknown[] {
  const raw = (value || "").trim();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    /* نص عادي */
  }
  return raw.split(/[,،\n]/).map((part) => part.trim()).filter(Boolean);
}

function itemName(item: unknown): string {
  if (typeof item === "string") return item.trim();
  if (item && typeof item === "object") {
    const record = item as Record<string, unknown>;
    for (const key of ["name", "label", "title", "url", "value"]) {
      if (typeof record[key] === "string" && record[key].trim()) return String(record[key]).trim();
    }
  }
  return "";
}

export function parseStringList(value: string | null | undefined): string[] {
  return parseArray(value).map(itemName).filter(Boolean);
}

export type ProductColor = { name: string; hex: string };

export function parseColors(value: string | null | undefined): ProductColor[] {
  const raw = (value || "").trim();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => {
          if (typeof item === "string") return { name: item.trim(), hex: "" };
          if (item && typeof item === "object") {
            const record = item as Record<string, unknown>;
            const name = itemName(item);
            const hex = typeof record.hex === "string" ? record.hex : "";
            return name ? { name, hex } : null;
          }
          return null;
        })
        .filter((item): item is ProductColor => item !== null && Boolean(item.name));
    }
  } catch {
    /* نص عادي */
  }
  return parseStringList(value).map((name) => ({ name, hex: "" }));
}

export function parseGallery(value: string | null | undefined): string[] {
  return parseStringList(value).filter((url) => /^(https?:|\/|data:)/.test(url));
}
