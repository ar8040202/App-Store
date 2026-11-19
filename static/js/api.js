const BASE = "";

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function extractMessage(data) {
  if (!data) return "حدث خطأ غير متوقع، حاول مرة أخرى";
  if (typeof data === "string") return data;
  if (Array.isArray(data.detail)) {
    return data.detail.map((item) => item.msg || "").filter(Boolean).join(" • ");
  }
  return data.detail || data.message || "حدث خطأ غير متوقع، حاول مرة أخرى";
}

async function request(path, options = {}) {
  const { method = "GET", body, token, formData, headers = {} } = options;
  const config = { method, headers: { ...headers } };

  if (token) config.headers.Authorization = `Bearer ${token}`;

  if (formData) {
    config.body = formData;
  } else if (body !== undefined) {
    config.headers["Content-Type"] = "application/json";
    config.body = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(BASE + path, config);
  } catch {
    throw new ApiError("تعذر الاتصال بالخادم، تأكد من تشغيل المتجر", 0);
  }

  const contentType = response.headers.get("content-type") || "";
  let data = null;
  try {
    data = contentType.includes("application/json")
      ? await response.json()
      : await response.text();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new ApiError(extractMessage(data), response.status);
  }

  return data;
}

export const http = {
  get: (path, options) => request(path, options),
  post: (path, body, options) => request(path, { ...options, method: "POST", body }),
  put: (path, body, options) => request(path, { ...options, method: "PUT", body }),
  patch: (path, body, options) => request(path, { ...options, method: "PATCH", body }),
  del: (path, options) => request(path, { ...options, method: "DELETE" }),
  upload: (path, formData, options) =>
    request(path, { ...options, method: "POST", formData }),
};
