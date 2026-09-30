import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { pool } from "@/lib/db";
import { invalidatePublicMenu } from "@/lib/publicMenu";
import { MAX_OPTION_ITEMS_PER_REQUEST, UUID_PATTERN } from "@/lib/optionValidation";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { response } = await requireAdmin();
  if (response) return response;

  const { id: optionTypeId } = await params;
  if (!UUID_PATTERN.test(optionTypeId)) {
    return NextResponse.json({ error: "Invalid option type ID" }, { status: 400 });
  }

  try {
    const sortOrderColumnResult = await pool.query<{ exists: boolean }>(
      `select exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'option_items'
          and column_name = 'sort_order'
      )`
    );

    if (!sortOrderColumnResult.rows[0]?.exists) {
      return NextResponse.json(
        { error: "option_items.sort_order has not been added yet" },
        { status: 400 }
      );
    }

    const body: Array<{ id: string; order: number }> = await req.json();
    if (
      !Array.isArray(body) ||
      body.length === 0 ||
      body.length > MAX_OPTION_ITEMS_PER_REQUEST
    ) {
      return NextResponse.json(
        { error: "Expected 1 to 200 {id, order} items." },
        { status: 400 }
      );
    }

    for (const item of body) {
      if (
        typeof item.id !== "string" ||
        !UUID_PATTERN.test(item.id) ||
        !Number.isInteger(item.order) ||
        item.order < 0
      ) {
        return NextResponse.json(
          { error: "Each item must include string id and numeric order." },
          { status: 400 }
        );
      }
    }

    if (new Set(body.map((item) => item.id)).size !== body.length) {
      return NextResponse.json(
        { error: "Option item IDs must be unique." },
        { status: 400 }
      );
    }

    const client = await pool.connect();

    try {
      await client.query("begin");
      for (const { id, order } of body) {
        await client.query(
          `update option_items
           set sort_order = $1
           where id = $2::uuid and option_type = $3::uuid`,
          [-order, id, optionTypeId]
        );
      }

      for (const { id, order } of body) {
        await client.query(
          `update option_items
           set sort_order = $1
           where id = $2::uuid and option_type = $3::uuid`,
          [order, id, optionTypeId]
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
    console.error("Error reordering option items:", error);
    return NextResponse.json(
      { error: "Failed to reorder option items" },
      { status: 500 }
    );
  }
}
