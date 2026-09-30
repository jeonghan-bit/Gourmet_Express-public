import { NextRequest, NextResponse } from "next/server";
import { randomInt } from "node:crypto";
import sharp from "sharp";
import { requireAdmin } from "@/lib/adminAuth";
import { getProductThumbnailPath } from "@/lib/productImages";
import { supabase } from "@/supabaseClient";

export const runtime = "nodejs";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 1600;
const MAX_INPUT_PIXELS = 40_000_000;
const MAX_PASSTHROUGH_WEBP_BYTES = 2 * 1024 * 1024;
const WEBP_QUALITY = 82;
const THUMBNAIL_SIZE = 192;
const THUMBNAIL_QUALITY = 76;

function getWebpFileName(fileName: string) {
  const baseName = fileName.replace(/\.[^/.]+$/, "");
  const safeName = baseName.replace(/[^a-zA-Z0-9-_]/g, "-") || "product";
  const randomNumber = randomInt(100_000_000, 1_000_000_000);
  return `${safeName}_${randomNumber}.webp`;
}

export async function POST(req: NextRequest) {
  const { response } = await requireAdmin();
  if (response) return response;

  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No image was provided." }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "The selected file is not an image." },
        { status: 400 }
      );
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: "Images must be 10 MB or smaller." },
        { status: 400 }
      );
    }

    const input = Buffer.from(await file.arrayBuffer());
    const imageOptions = {
      failOn: "error",
      limitInputPixels: MAX_INPUT_PIXELS,
    } as const;
    const image = sharp(input, imageOptions);
    const metadata = await image.metadata();
    const canPreserveExistingWebp =
      metadata.format === "webp" &&
      !!metadata.width &&
      !!metadata.height &&
      metadata.width <= MAX_IMAGE_DIMENSION &&
      metadata.height <= MAX_IMAGE_DIMENSION &&
      input.byteLength <= MAX_PASSTHROUGH_WEBP_BYTES;

    const webp = canPreserveExistingWebp
      ? input
      : await image
          .rotate()
          .resize({
            width: MAX_IMAGE_DIMENSION,
            height: MAX_IMAGE_DIMENSION,
            fit: "inside",
            withoutEnlargement: true,
          })
          .webp({
            quality: WEBP_QUALITY,
            alphaQuality: 90,
            effort: 6,
            smartSubsample: true,
          })
          .toBuffer();

    const thumbnail = await sharp(input, imageOptions)
      .rotate()
      .resize({
        width: THUMBNAIL_SIZE,
        height: THUMBNAIL_SIZE,
        fit: "cover",
        position: "centre",
      })
      .webp({
        quality: THUMBNAIL_QUALITY,
        alphaQuality: 85,
        effort: 6,
        smartSubsample: true,
      })
      .toBuffer();

    const filePath = getWebpFileName(file.name);
    const thumbnailPath = getProductThumbnailPath(filePath);
    const { error } = await supabase.storage.from("products").upload(filePath, webp, {
      contentType: "image/webp",
      cacheControl: "31536000",
    });

    if (error) {
      console.error("Supabase product image upload failed:", error);
      return NextResponse.json({ error: "Failed to store image." }, { status: 500 });
    }

    const { error: thumbnailError } = await supabase.storage
      .from("products")
      .upload(thumbnailPath, thumbnail, {
        contentType: "image/webp",
        cacheControl: "31536000",
      });

    if (thumbnailError) {
      console.error("Supabase product thumbnail upload failed:", thumbnailError);
      await supabase.storage.from("products").remove([filePath]);
      return NextResponse.json(
        { error: "Failed to store the image thumbnail." },
        { status: 500 }
      );
    }

    const { data } = supabase.storage.from("products").getPublicUrl(filePath);
    const { data: thumbnailData } = supabase.storage
      .from("products")
      .getPublicUrl(thumbnailPath);

    return NextResponse.json({
      publicUrl: data.publicUrl,
      thumbnailUrl: thumbnailData.publicUrl,
    });
  } catch (error) {
    console.error("Product image processing failed:", error);
    return NextResponse.json(
      { error: "The image could not be processed." },
      { status: 400 }
    );
  }
}
