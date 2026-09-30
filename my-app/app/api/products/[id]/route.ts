import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireAdmin } from "@/lib/adminAuth";
import { invalidatePublicMenu } from "@/lib/publicMenu";
import { normalizeProductDisplayName } from "@/lib/utils";

type ProductOptionItemRow = {
  id: string;
  label: string;
  additionalPrice: string;
  optionType: string;
  sortOrder: number;
};

type ProductWithCollectionRow = {
  id: number;
  collection_id: number;
  description: string | null;
  image_url: string | null;
  name: string;
  status: string;
  price: string;
  collectionStatus: string | null;
};

type ProductOptionRow = {
  id: string;
  name: string;
  required: boolean;
  itemId: string | null;
  label: string | null;
  additionalPrice: string | null;
  optionType: string | null;
  itemSortOrder: number | null;
};

type SchemaColumnRow = {
  table_name: string;
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const isAdmin = session?.user?.role === "admin";
    const { id } = await params;
    const productId = parseInt(id);
    
    if (isNaN(productId)) {
      return NextResponse.json(
        { error: "Invalid product ID" },
        { status: 400 }
      );
    }

    const client = await pool.connect();

    try {
      const productResult = await client.query<ProductWithCollectionRow>(
        `select
           p.product_id as id,
           p.collection_id,
           p.description,
           p.image_url,
           p.name,
           p.status,
           p.price::text,
           c.status as "collectionStatus"
         from product p
         left join collection c on c.collection_id = p.collection_id
         where p.product_id = $1`,
        [productId]
      );

      if (productResult.rows.length === 0) {
        return NextResponse.json(
          { error: "Product not found" },
          { status: 404 }
        );
      }

      const product = {
        ...productResult.rows[0],
        name: normalizeProductDisplayName(productResult.rows[0].name),
      };
      if (
        !isAdmin &&
        (product.status !== "active" || product.collectionStatus !== "active")
      ) {
        return NextResponse.json(
          { error: "Product not found" },
          { status: 404 }
        );
      }

      const sortColumnResult = await client.query<SchemaColumnRow>(
        `select table_name
         from information_schema.columns
         where table_schema = 'public'
           and column_name = 'sort_order'
           and table_name in ('product_options', 'option_items')`
      );

      const sortTables = new Set(
        sortColumnResult.rows.map((row) => row.table_name)
      );
      const hasProductOptionSort = sortTables.has("product_options");
      const hasOptionItemSort = sortTables.has("option_items");

      const optionRowsResult = await client.query<ProductOptionRow>(
        `select
           ot.id::text,
           ot.name,
           ot.required,
           oi.id::text as "itemId",
           oi.label,
           oi.additional_price::text as "additionalPrice",
           oi.option_type::text as "optionType",
           ${hasOptionItemSort ? "oi.sort_order" : "0"} as "itemSortOrder"
         from product_options po
         join option_types ot on ot.id = po.option_type_id
         left join option_items oi on oi.option_type = ot.id
         where po.product_id = $1
         order by ${
           hasProductOptionSort ? "po.sort_order" : "0"
         }, ot.name, "itemSortOrder", lower(oi.label), oi.id`,
        [productId]
      );

      const optionTypesWithItems = Array.from(
        optionRowsResult.rows
          .reduce<
            Map<
              string,
              {
                id: string;
                name: string;
                required: boolean;
                items: ProductOptionItemRow[];
              }
            >
          >((optionTypesById, row) => {
            if (!optionTypesById.has(row.id)) {
              optionTypesById.set(row.id, {
                id: row.id,
                name: row.name,
                required: row.required,
                items: [],
              });
            }

            if (row.itemId && row.label && row.additionalPrice) {
              optionTypesById.get(row.id)?.items.push({
                id: row.itemId,
                label: row.label,
                additionalPrice: row.additionalPrice,
                optionType: row.optionType ?? row.id,
                sortOrder: row.itemSortOrder ?? 0,
              });
            }

            return optionTypesById;
          }, new Map())
          .values()
      );

      const { collectionStatus, ...productResponse } = product;

      return NextResponse.json({
        product: productResponse,
        optionTypes: optionTypesWithItems,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error fetching product with options:", error);
    return NextResponse.json(
      { error: "Failed to fetch product" },
      { status: 500 }
    );
  }
} 

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { response } = await requireAdmin();
  if (response) return response;

  const { id } = await params;
  const productId = Number(id);

  if (!Number.isInteger(productId) || productId <= 0) {
    return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });
  }

  const client = await pool.connect();

  try {
    await client.query("begin");
    await client.query("delete from product_options where product_id = $1", [
      productId,
    ]);
    const result = await client.query(
      "delete from product where product_id = $1",
      [productId]
    );

    if (result.rowCount === 0) {
      await client.query("rollback");
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    await client.query("commit");
    invalidatePublicMenu();
    return NextResponse.json({ success: true });
  } catch (error) {
    await client.query("rollback");
    console.error("Error deleting product:", error);
    return NextResponse.json(
      { error: "Failed to delete product" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
