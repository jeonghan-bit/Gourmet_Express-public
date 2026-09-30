import { NextRequest, NextResponse } from "next/server";
import { db, products, collections, productOptions, pool } from "@/lib/db";
import { eq, and, inArray, sql } from "drizzle-orm";
import {
  dedupeProductsByCanonicalCode,
  matchesProductSearch,
  naturalSort,
  normalizeProductDisplayName,
} from "@/lib/utils";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPublicMenu } from "@/lib/publicMenu";
import { UUID_PATTERN } from "@/lib/optionValidation";

const NO_STORE_HEADERS = { "Cache-Control": "private, no-store" };

type ProductOptionRow = {
  productId: number;
  id: string;
  name: string;
  required: boolean;
  itemId: string | null;
  label: string | null;
  additionalPrice: string | null;
  optionType: string | null;
  itemSortOrder: number | null;
};

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const isAdmin = session?.user?.role === "admin";
    const { searchParams } = new URL(request.url);
    const collectionId = searchParams.get("collection_id");
    const collectionName = searchParams.get("collection");
    const optionType = searchParams.get("option_type");
    const status = searchParams.get("status");
    const search = searchParams.get("q");
    const includeOptions = searchParams.get("include_options") === "true";
    const offset = Math.max(0, parseInt(searchParams.get("offset") || "0") || 0);
    const limit = Math.min(
      1000,
      Math.max(1, parseInt(searchParams.get("limit") || "15") || 15)
    );

    if (
      (collectionId &&
        (!Number.isInteger(Number(collectionId)) || Number(collectionId) <= 0)) ||
      (optionType && optionType !== "All" && !UUID_PATTERN.test(optionType)) ||
      (search && search.length > 100) ||
      (collectionName && collectionName.length > 200)
    ) {
      return NextResponse.json(
        { error: "Invalid product query parameters" },
        { status: 400 }
      );
    }

    // The storefront intentionally loads the complete, small active menu. Reuse
    // one shared database result for that common request while keeping all
    // existing query parameters and the response contract intact.
    if (
      !isAdmin &&
      !collectionId &&
      !collectionName &&
      !optionType &&
      !search &&
      !includeOptions
    ) {
      const publicMenu = await getPublicMenu();
      return NextResponse.json({
        products: publicMenu.products.slice(offset, offset + limit),
        totalProducts: publicMenu.products.length,
        offset,
        limit,
      });
    }

    const conditions = [];

    if (collectionId) {
      conditions.push(eq(products.collection_id, parseInt(collectionId)));
    }

    if (collectionName && collectionName !== "All") {
      // Join with collections to filter by collection name
      const collectionQuery = db
        .select({ id: collections.id })
        .from(collections)
        .where(eq(collections.name, collectionName));
      const collectionResult = await collectionQuery;
      if (collectionResult.length > 0) {
        conditions.push(eq(products.collection_id, collectionResult[0].id));
      }
    }

    if (!isAdmin) {
      conditions.push(eq(products.status, "active"));
      conditions.push(eq(collections.status, "active"));
    } else if (status && status !== "all") {
      conditions.push(eq(products.status, status as "active" | "inactive"));
    }

    if (optionType && optionType !== "All") {
      conditions.push(sql`exists (
        select 1
        from ${productOptions}
        where ${productOptions.productId} = ${products.id}
          and ${productOptions.optionId} = ${optionType}::uuid
      )`);
    }

    // Preserve the exact existing JavaScript natural sort while avoiding
    // loading descriptions and image URLs for every matching admin row.
    const candidateQuery = db
      .select({ id: products.id, name: products.name })
      .from(products)
      .leftJoin(collections, eq(products.collection_id, collections.id));

    if (conditions.length > 0) {
      candidateQuery.where(and(...conditions));
    }

    const candidates = dedupeProductsByCanonicalCode(
      (await candidateQuery).filter(
        (product) => !search || matchesProductSearch(product.name, search)
      )
    );
    const totalProducts = candidates.length;
    const paginatedProductIds = candidates
      .sort((a, b) =>
        naturalSort(
          normalizeProductDisplayName(a.name),
          normalizeProductDisplayName(b.name)
        )
      )
      .slice(offset, offset + limit)
      .map((product) => product.id);

    const query = db
      .select({
        id: products.id,
        name: products.name,
        description: products.description,
        price: products.price,
        status: products.status,
        image_url: products.image_url,
        collection: {
          id: collections.id,
          name: collections.name,
          order: collections.order,
          status: collections.status,
        },
      })
      .from(products)
      .leftJoin(collections, eq(products.collection_id, collections.id))
      .where(
        paginatedProductIds.length > 0
          ? inArray(products.id, paginatedProductIds)
          : sql`false`
      );

    const pageProducts = (await query).map((product) => ({
      ...product,
      name: normalizeProductDisplayName(product.name),
    }));
    const productById = new Map(
      pageProducts.map((product) => [product.id, product])
    );
    const paginatedProducts = paginatedProductIds.flatMap((id) => {
      const product = productById.get(id);
      return product ? [product] : [];
    });
    const optionTypesByProductId = new Map<
      number,
      Map<
        string,
        {
          id: string;
          name: string;
          required: boolean;
          items: {
            id: string;
            label: string;
            additionalPrice: string;
            optionType: string;
            sortOrder: number;
          }[];
        }
      >
    >();

    if (includeOptions && paginatedProductIds.length > 0) {
      const optionRowsResult = await pool.query<ProductOptionRow>(
        `select
           po.product_id as "productId",
           ot.id::text,
           ot.name,
           ot.required,
           oi.id::text as "itemId",
           oi.label,
           oi.additional_price::text as "additionalPrice",
           oi.option_type::text as "optionType",
           coalesce(oi.sort_order, 0) as "itemSortOrder"
         from product_options po
         join option_types ot on ot.id = po.option_type_id
         left join option_items oi on oi.option_type = ot.id
         where po.product_id = any($1::int[])
         order by po.product_id, coalesce(po.sort_order, 0), ot.name,
           coalesce(oi.sort_order, 0), lower(oi.label), oi.id`,
        [paginatedProductIds]
      );

      optionRowsResult.rows.forEach((row) => {
        if (!optionTypesByProductId.has(row.productId)) {
          optionTypesByProductId.set(row.productId, new Map());
        }

        const productOptionTypes = optionTypesByProductId.get(row.productId)!;

        if (!productOptionTypes.has(row.id)) {
          productOptionTypes.set(row.id, {
            id: row.id,
            name: row.name,
            required: row.required,
            items: [],
          });
        }

        if (row.itemId && row.label && row.additionalPrice) {
          productOptionTypes.get(row.id)?.items.push({
            id: row.itemId,
            label: row.label,
            additionalPrice: row.additionalPrice,
            optionType: row.optionType ?? row.id,
            sortOrder: row.itemSortOrder ?? 0,
          });
        }
      });
    }

    const productsWithOptions = includeOptions
      ? paginatedProducts.map((product) => ({
          ...product,
          optionTypes: Array.from(
            optionTypesByProductId.get(product.id)?.values() ?? []
          ),
        }))
      : paginatedProducts;

    return NextResponse.json(
      {
        products: productsWithOptions,
        totalProducts,
        offset,
        limit,
      },
      { headers: isAdmin ? NO_STORE_HEADERS : undefined }
    );
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}
