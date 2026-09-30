import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { pool } from "@/lib/db";
import { invalidatePublicMenu } from "@/lib/publicMenu";
import {
  parseOptionItemInput,
  UUID_PATTERN,
} from "@/lib/optionValidation";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const { response } = await requireAdmin();
  if (response) return response;

  const { id: optionTypeId, itemId } = await params;
  if (!UUID_PATTERN.test(optionTypeId) || !UUID_PATTERN.test(itemId)) {
    return NextResponse.json({ error: "Invalid option item ID" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const input = parseOptionItemInput(body);
    if ("error" in input) {
      return NextResponse.json({ error: input.error }, { status: 400 });
    }
    const { label, additionalPrice } = input;

    const sortOrderColumnResult = await pool.query<{ exists: boolean }>(
      `select exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'option_items'
          and column_name = 'sort_order'
      )`
    );
    const hasSortOrder = sortOrderColumnResult.rows[0]?.exists ?? false;

    const result = await pool.query(
      `update option_items
       set label = $1, additional_price = $2::numeric
       where id = $3::uuid and option_type = $4::uuid
       returning id::text, label, additional_price::text as "additionalPrice",
         ${hasSortOrder ? "sort_order" : "0"} as "sortOrder"`,
      [label, additionalPrice, itemId, optionTypeId]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: "Option item not found" },
        { status: 404 }
      );
    }

    invalidatePublicMenu();
    return NextResponse.json({ item: result.rows[0] });
  } catch (error) {
    console.error("Error updating option item:", error);
    return NextResponse.json(
      { error: "Failed to update option item" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const { response } = await requireAdmin();
  if (response) return response;

  const { id: optionTypeId, itemId } = await params;
  if (!UUID_PATTERN.test(optionTypeId) || !UUID_PATTERN.test(itemId)) {
    return NextResponse.json({ error: "Invalid option item ID" }, { status: 400 });
  }

  try {
    const result = await pool.query(
      "delete from option_items where id = $1::uuid and option_type = $2::uuid",
      [itemId, optionTypeId]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: "Option item not found" },
        { status: 404 }
      );
    }

    invalidatePublicMenu();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting option item:", error);
    return NextResponse.json(
      { error: "Failed to delete option item" },
      { status: 500 }
    );
  }
}
