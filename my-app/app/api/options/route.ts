import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { pool } from "@/lib/db";
import { invalidatePublicMenu } from "@/lib/publicMenu";
import { MAX_OPTION_NAME_LENGTH } from "@/lib/optionValidation";

type OptionItemRow = {
  id: string;
  label: string;
  additional_price: string | null;
  option_type: string;
  sort_order?: number | null;
};

type OptionTypeRow = {
  id: string;
  name: string;
  required: boolean;
};

export async function GET() {
  const { response } = await requireAdmin();
  if (response) return response;

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
    const hasSortOrder = sortOrderColumnResult.rows[0]?.exists ?? false;

    const [optionTypesResult, optionItemsResult] = await Promise.all([
      pool.query<OptionTypeRow>(
        "select id::text, name, required from option_types order by name asc"
      ),
      pool.query<OptionItemRow>(
        `select id::text, label, additional_price::text, option_type::text,
           ${hasSortOrder ? "sort_order" : "0"} as sort_order
         from option_items
         order by option_type, sort_order, lower(label), id`
      ),
    ]);

    const itemsByOptionType = optionItemsResult.rows.reduce<
      Record<
        string,
        {
          id: string;
          label: string;
          additionalPrice: string;
          sortOrder: number;
        }[]
      >
    >((itemsByType, item) => {
      itemsByType[item.option_type] ??= [];
      itemsByType[item.option_type].push({
        id: item.id,
        label: item.label,
        additionalPrice: item.additional_price ?? "0",
        sortOrder: item.sort_order ?? 0,
      });
      return itemsByType;
    }, {});

    const optionTypes = optionTypesResult.rows.map((optionType) => ({
      id: optionType.id,
      name: optionType.name,
      required: optionType.required,
      items: itemsByOptionType[optionType.id] ?? [],
    }));

    return NextResponse.json({ optionTypes });
  } catch (error) {
    console.error("Error fetching options:", error);
    return NextResponse.json(
      { error: "Failed to fetch options" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const { response } = await requireAdmin();
  if (response) return response;

  try {
    const body = await req.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const required =
      typeof body.required === "boolean" ? body.required : true;

    if (!name || name.length > MAX_OPTION_NAME_LENGTH) {
      return NextResponse.json(
        { error: "Name is required and must not exceed 200 characters" },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `insert into option_types (name, required)
       values ($1, $2)
       returning id::text, name, required`,
      [name, required]
    );

    invalidatePublicMenu();
    return NextResponse.json({ optionType: { ...result.rows[0], items: [] } });
  } catch (error) {
    console.error("Error creating option type:", error);
    return NextResponse.json(
      { error: "Failed to create option type" },
      { status: 500 }
    );
  }
}
