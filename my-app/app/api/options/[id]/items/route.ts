import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { pool } from "@/lib/db";
import { invalidatePublicMenu } from "@/lib/publicMenu";
import {
  parseOptionItemInput,
  UUID_PATTERN,
} from "@/lib/optionValidation";

export async function POST(
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
      hasSortOrder
        ? `insert into option_items (label, additional_price, option_type, sort_order)
           values (
             $1,
             $2::numeric,
             $3::uuid,
             coalesce(
               (select max(sort_order) + 1 from option_items where option_type = $3::uuid),
               1
             )
           )
           returning id::text, label, additional_price::text as "additionalPrice", sort_order as "sortOrder"`
        : `insert into option_items (label, additional_price, option_type)
           values ($1, $2::numeric, $3::uuid)
           returning id::text, label, additional_price::text as "additionalPrice", 0 as "sortOrder"`,
      [label, additionalPrice, optionTypeId]
    );

    invalidatePublicMenu();
    return NextResponse.json({ item: result.rows[0] });
  } catch (error) {
    console.error("Error creating option item:", error);
    return NextResponse.json(
      { error: "Failed to create option item" },
      { status: 500 }
    );
  }
}
