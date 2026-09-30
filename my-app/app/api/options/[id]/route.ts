import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { pool } from "@/lib/db";
import { invalidatePublicMenu } from "@/lib/publicMenu";
import { MAX_OPTION_NAME_LENGTH, UUID_PATTERN } from "@/lib/optionValidation";

export async function PATCH(
  req: Request,
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
    const updates: string[] = [];
    const values: unknown[] = [];

    if (body.name !== undefined) {
      const name = typeof body.name === "string" ? body.name.trim() : "";
      if (!name || name.length > MAX_OPTION_NAME_LENGTH) {
        return NextResponse.json(
          { error: "name must be non-empty and no longer than 200 characters" },
          { status: 400 }
        );
      }

      values.push(name);
      updates.push(`name = $${values.length}`);
    }

    if (body.required !== undefined) {
      if (typeof body.required !== "boolean") {
        return NextResponse.json(
          { error: "required must be a boolean" },
          { status: 400 }
        );
      }

      values.push(body.required);
      updates.push(`required = $${values.length}`);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: "No option type updates provided" },
        { status: 400 }
      );
    }

    values.push(optionTypeId);
    const result = await pool.query(
      `update option_types
       set ${updates.join(", ")}
       where id = $${values.length}::uuid
       returning id::text, name, required`,
      values
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: "Option type not found" },
        { status: 404 }
      );
    }

    invalidatePublicMenu();
    return NextResponse.json({ optionType: result.rows[0] });
  } catch (error) {
    console.error("Error updating option type:", error);
    return NextResponse.json(
      { error: "Failed to update option type" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { response } = await requireAdmin();
  if (response) return response;

  const { id: optionTypeId } = await params;
  if (!UUID_PATTERN.test(optionTypeId)) {
    return NextResponse.json({ error: "Invalid option type ID" }, { status: 400 });
  }
  const client = await pool.connect();

  try {
    await client.query("begin");
    await client.query("delete from product_options where option_type_id = $1::uuid", [
      optionTypeId,
    ]);
    await client.query("delete from option_items where option_type = $1::uuid", [
      optionTypeId,
    ]);
    const result = await client.query(
      "delete from option_types where id = $1::uuid",
      [optionTypeId]
    );

    if (result.rowCount === 0) {
      await client.query("rollback");
      return NextResponse.json(
        { error: "Option type not found" },
        { status: 404 }
      );
    }

    await client.query("commit");
    invalidatePublicMenu();
    return NextResponse.json({ success: true });
  } catch (error) {
    await client.query("rollback");
    console.error("Error deleting option type:", error);
    return NextResponse.json(
      { error: "Failed to delete option type" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
