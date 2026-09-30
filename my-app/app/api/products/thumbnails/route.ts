import { NextRequest, NextResponse } from "next/server";
import { and, asc, gt, isNotNull } from "drizzle-orm";
import sharp from "sharp";
import { requireAdmin } from "@/lib/adminAuth";
import { db, products } from "@/lib/db";
import {
  getProductImagePath,
  getProductThumbnailPath,
} from "@/lib/productImages";
import { supabase } from "@/supabaseClient";

export const runtime = "nodejs";
export const maxDuration = 60;

const BATCH_SIZE = 10;
const THUMBNAIL_SIZE = 192;
const MAX_INPUT_PIXELS = 40_000_000;
const MAX_DOWNLOAD_BYTES = 10 * 1024 * 1024;
const DOWNLOAD_TIMEOUT_MS = 10_000;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/avif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function validateProductImageUrl(imageUrl: string) {
  const configuredSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!configuredSupabaseUrl) return null;

  try {
    const allowedOrigin = new URL(configuredSupabaseUrl).origin;
    const url = new URL(imageUrl);
    const expectedPathPrefix = "/storage/v1/object/public/products/";

    if (
      url.protocol !== "https:" ||
      url.origin !== allowedOrigin ||
      !url.pathname.startsWith(expectedPathPrefix) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    ) {
      return null;
    }

    return url;
  } catch {
    return null;
  }
}

async function readResponseWithLimit(response: Response) {
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_DOWNLOAD_BYTES) {
    throw new Error("Image exceeds the 10 MB download limit.");
  }

  if (!response.body) throw new Error("Image response had no body.");

  const reader = response.body.getReader();
  const chunks: Buffer[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    totalBytes += value.byteLength;
    if (totalBytes > MAX_DOWNLOAD_BYTES) {
      await reader.cancel();
      throw new Error("Image exceeds the 10 MB download limit.");
    }
    chunks.push(Buffer.from(value));
  }

  return Buffer.concat(chunks, totalBytes);
}

async function thumbnailExists(thumbnailPath: string) {
  const lastSlash = thumbnailPath.lastIndexOf("/");
  const directory = thumbnailPath.slice(0, lastSlash);
  const fileName = thumbnailPath.slice(lastSlash + 1);
  const { data, error } = await supabase.storage.from("products").list(directory, {
    limit: 1,
    search: fileName,
  });

  return !error && data?.some((file) => file.name === fileName);
}

export async function POST(req: NextRequest) {
  const { response } = await requireAdmin();
  if (response) return response;

  const requestOrigin = req.headers.get("origin");
  if (requestOrigin && requestOrigin !== req.nextUrl.origin) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const cursor = Math.max(0, Number(body.cursor) || 0);

    const rows = await db
      .select({ id: products.id, imageUrl: products.image_url })
      .from(products)
      .where(
        and(gt(products.id, cursor), isNotNull(products.image_url))
      )
      .orderBy(asc(products.id))
      .limit(BATCH_SIZE);

    const results = await Promise.all(
      rows.map(async ({ id, imageUrl }) => {
        if (!imageUrl) return { id, status: "skipped" as const };

        const validatedUrl = validateProductImageUrl(imageUrl);
        if (!validatedUrl) return { id, status: "skipped" as const };

        const imagePath = getProductImagePath(validatedUrl.toString());
        if (!imagePath) return { id, status: "skipped" as const };

        try {
          const thumbnailPath = getProductThumbnailPath(imagePath);
          if (await thumbnailExists(thumbnailPath)) {
            return { id, status: "skipped" as const };
          }

          const imageResponse = await fetch(validatedUrl, {
            redirect: "manual",
            signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
            headers: { Accept: "image/avif,image/webp,image/png,image/jpeg" },
          });
          if (imageResponse.status >= 300 && imageResponse.status < 400) {
            throw new Error("Image redirects are not allowed.");
          }
          if (!imageResponse.ok) throw new Error(`HTTP ${imageResponse.status}`);

          const contentType = imageResponse.headers
            .get("content-type")
            ?.split(";", 1)[0]
            .trim()
            .toLowerCase();
          if (!contentType || !ALLOWED_IMAGE_TYPES.has(contentType)) {
            throw new Error("Unsupported image content type.");
          }

          const input = await readResponseWithLimit(imageResponse);
          const thumbnail = await sharp(input, {
            failOn: "error",
            limitInputPixels: MAX_INPUT_PIXELS,
          })
            .rotate()
            .resize({
              width: THUMBNAIL_SIZE,
              height: THUMBNAIL_SIZE,
              fit: "cover",
              position: "centre",
            })
            .webp({
              quality: 76,
              alphaQuality: 85,
              effort: 6,
              smartSubsample: true,
            })
            .toBuffer();

          const { error } = await supabase.storage
            .from("products")
            .upload(thumbnailPath, thumbnail, {
              contentType: "image/webp",
              cacheControl: "31536000",
              upsert: false,
            });

          if (error) throw error;
          return { id, status: "created" as const };
        } catch (error) {
          console.error(`Thumbnail backfill failed for product ${id}:`, error);
          return { id, status: "failed" as const };
        }
      })
    );

    const lastId = rows.at(-1)?.id ?? cursor;
    return NextResponse.json({
      processed: results.filter((result) => result.status === "created").length,
      failed: results.filter((result) => result.status === "failed").length,
      skipped: results.filter((result) => result.status === "skipped").length,
      nextCursor: rows.length === BATCH_SIZE ? lastId : null,
    });
  } catch (error) {
    console.error("Product thumbnail backfill failed:", error);
    return NextResponse.json(
      { error: "Unable to generate product thumbnails." },
      { status: 500 }
    );
  }
}
