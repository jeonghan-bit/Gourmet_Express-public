const PRODUCT_PUBLIC_PATH = "/storage/v1/object/public/products/";
const THUMBNAIL_DIRECTORY = "thumbnails/";

export function getProductThumbnailPath(filePath: string) {
  return `${THUMBNAIL_DIRECTORY}${filePath}`;
}

export function getProductImagePath(imageUrl: string) {
  const url = new URL(imageUrl);
  const markerIndex = url.pathname.indexOf(PRODUCT_PUBLIC_PATH);
  if (markerIndex === -1) return null;

  const path = url.pathname.slice(markerIndex + PRODUCT_PUBLIC_PATH.length);
  if (!path || path.startsWith(THUMBNAIL_DIRECTORY)) return null;

  return decodeURIComponent(path);
}

export function getProductThumbnailUrl(imageUrl: string) {
  const markerIndex = imageUrl.indexOf(PRODUCT_PUBLIC_PATH);

  if (markerIndex === -1) return imageUrl;

  const pathStart = markerIndex + PRODUCT_PUBLIC_PATH.length;
  if (imageUrl.slice(pathStart).startsWith(THUMBNAIL_DIRECTORY)) {
    return imageUrl;
  }

  return `${imageUrl.slice(0, pathStart)}${THUMBNAIL_DIRECTORY}${imageUrl.slice(pathStart)}`;
}
