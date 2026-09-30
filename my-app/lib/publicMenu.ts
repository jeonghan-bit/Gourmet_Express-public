import { unstable_cache, revalidatePath, revalidateTag } from "next/cache";
import { and, asc, eq } from "drizzle-orm";
import { collections, db, products } from "@/lib/db";
import {
  dedupeProductsByCanonicalCode,
  naturalSort,
  normalizeProductDisplayName,
} from "@/lib/utils";

export const PUBLIC_MENU_CACHE_TAG = "public-menu";

async function loadPublicMenu() {
  const [activeCollections, activeProducts] = await Promise.all([
    db
      .select()
      .from(collections)
      .where(eq(collections.status, "active"))
      .orderBy(asc(collections.order)),
    db
      .select({
        id: products.id,
        collection_id: products.collection_id,
        description: products.description,
        image_url: products.image_url,
        name: products.name,
        status: products.status,
        price: products.price,
        collection: {
          id: collections.id,
          name: collections.name,
          order: collections.order,
          status: collections.status,
        },
      })
      .from(products)
      .innerJoin(collections, eq(products.collection_id, collections.id))
      .where(
        and(
          eq(products.status, "active"),
          eq(collections.status, "active")
        )
      ),
  ]);

  return {
    collections: activeCollections,
    products: dedupeProductsByCanonicalCode(activeProducts)
      .map((product) => ({
        ...product,
        name: normalizeProductDisplayName(product.name),
      }))
      .sort((a, b) => naturalSort(a.name, b.name)),
  };
}

export const getPublicMenu = unstable_cache(
  loadPublicMenu,
  [PUBLIC_MENU_CACHE_TAG],
  {
    tags: [PUBLIC_MENU_CACHE_TAG],
    revalidate: 60 * 60,
  }
);

export function invalidatePublicMenu() {
  revalidateTag(PUBLIC_MENU_CACHE_TAG);
  revalidatePath("/");
  revalidatePath("/api/menu");
}
