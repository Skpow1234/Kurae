export const MAX_PRODUCT_IMAGE_BYTES = 5 * 1024 * 1024;

const ALLOWED_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export type PresignResponse = {
  uploadUrl: string;
  publicUrl: string;
  key: string;
};

let s3UploadsAvailable: boolean | null = null;

function resolveContentType(file: File): string {
  if (file.type && ALLOWED_CONTENT_TYPES.has(file.type)) {
    return file.type;
  }

  const ext = file.name.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    default:
      return file.type;
  }
}

export function validateProductImageFile(file: File): void {
  const contentType = resolveContentType(file);

  if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
    throw new Error("Only JPEG, PNG, and WebP images are allowed.");
  }

  if (file.size > MAX_PRODUCT_IMAGE_BYTES) {
    throw new Error("Image must be 5 MB or smaller.");
  }
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("Could not read image file."));
    };
    reader.onerror = () => reject(new Error("Could not read image file."));
    reader.readAsDataURL(file);
  });
}

async function requestPresign(
  filename: string,
  contentType: string,
): Promise<PresignResponse | null> {
  const res = await fetch("/api/uploads/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename, contentType }),
  });

  if (res.status === 503) {
    s3UploadsAvailable = false;
    return null;
  }

  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "Could not prepare image upload.");
  }

  s3UploadsAvailable = true;
  return res.json() as Promise<PresignResponse>;
}

async function uploadToPresignedUrl(
  uploadUrl: string,
  file: File,
  contentType: string,
): Promise<void> {
  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: file,
  });

  if (!res.ok) {
    throw new Error("Upload to storage failed. Try again.");
  }
}

/** Upload via S3 presign when configured; otherwise embed as a data URL (local dev). */
export async function uploadProductImage(file: File): Promise<string> {
  validateProductImageFile(file);

  const contentType = resolveContentType(file);

  if (s3UploadsAvailable === false) {
    return readFileAsDataUrl(file);
  }

  const presign = await requestPresign(file.name || "image", contentType);
  if (!presign) {
    return readFileAsDataUrl(file);
  }

  await uploadToPresignedUrl(presign.uploadUrl, file, contentType);
  return presign.publicUrl;
}

export function usesLocalImageEmbed(): boolean {
  return s3UploadsAvailable === false;
}
