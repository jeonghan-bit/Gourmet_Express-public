import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { pool } from "@/lib/db";
import { invalidatePublicMenu } from "@/lib/publicMenu";
import { MAX_OPTION_ITEMS_PER_REQUEST, UUID_PATTERN } from "@/lib/optionValidation";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { response } = await requireAdmin();
  if (response) return response;

  const { id } = await params;
  const productId = Number(id);

  if (!Number.isInteger(productId) || productId <= 0) {
    return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });
  }

  try {
    const sortOrderColumnResult = await pool.query<{ exists: boolean }>(
      `select exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'product_options'
          and column_name = 'sort_order'
      )`
    );
    const hasSortOrder = sortOrderColumnResult.rows[0]?.exists ?? false;

    const result = await pool.query<{ option_type_id: string }>(
      `select option_type_id::text,
         ${hasSortOrder ? "sort_order" : "0"} as sort_order
       from product_options
       where product_id = $1
       order by sort_order, option_type_id`,
      [productId]
    );

    return NextResponse.json({
      optionTypeIds: result.rows.map((row) => row.option_type_id),
    });
  } catch (error) {
    console.error("Error fetching product options:", error);
    return NextResponse.json(
      { error: "Failed to fetch product options" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { response } = await requireAdmin();
  if (response) return response;

  const { id } = await params;
  const productId = Number(id);

  if (!Number.isInteger(productId) || productId <= 0) {
    return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const optionTypeIds: unknown[] | null = Array.isArray(body.optionTypeIds)
      ? body.optionTypeIds.filter(
          (optionTypeId: unknown, index: number, allOptionTypeIds: unknown[]) =>
            allOptionTypeIds.indexOf(optionTypeId) === index
        )
      : null;

    if (
      !optionTypeIds ||
      optionTypeIds.length > MAX_OPTION_ITEMS_PER_REQUEST ||
      !optionTypeIds.every(
        (optionTypeId: unknown) =>
          typeof optionTypeId === "string" && UUID_PATTERN.test(optionTypeId)
      )
    ) {
      return NextResponse.json(
        { error: "optionTypeIds must contain at most 200 valid option type IDs" },
        { status: 400 }
      );
    }

    const validOptionTypeIds = optionTypeIds as string[];
    const sortOrderColumnResult = await pool.query<{ exists: boolean }>(
      `select exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'product_options'
          and column_name = 'sort_order'
      )`
    );
    const hasSortOrder = sortOrderColumnResult.rows[0]?.exists ?? false;

    const client = await pool.connect();

    try {
      await client.query("begin");
      await client.query("delete from product_options where product_id = $1", [
        productId,
      ]);

      if (validOptionTypeIds.length > 0) {
        await client.query(
          hasSortOrder
            ? `insert into product_options (product_id, option_type_id, sort_order)
           select $1, option_type_id, sort_order::integer
           from unnest($2::uuid[]) with ordinality as ordered_options(option_type_id, sort_order)`
            : `insert into product_options (product_id, option_type_id)
           select $1, unnest($2::uuid[])`,
          [productId, validOptionTypeIds]
        );
      }

      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }

    invalidatePublicMenu();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating product options:", error);
    return NextResponse.json(
      { error: "Failed to update product options" },
      { status: 500 }
    );
  }
}
