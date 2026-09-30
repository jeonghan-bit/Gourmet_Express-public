import { NextRequest, NextResponse } from "next/server";
import { db, products } from "@/lib/db";
import { updateProductSchema } from "@/lib/schemas";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/adminAuth";
import { invalidatePublicMenu } from "@/lib/publicMenu";

export async function PUT(req: NextRequest) {
  const { response } = await requireAdmin();
  if (response) return response;

  try {
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("id");
    
    if (!productId) {
      return NextResponse.json(
        { error: "Missing product ID in URL parameters" },
        { status: 400 }
      );
    }

    const id = parseInt(productId);
    if (isNaN(id)) {
      return NextResponse.json(
        { error: "Invalid product ID" },
        { status: 400 }
      );
    }

    const data = await req.json();
    
    // Validate the update data
    const validationResult = updateProductSchema.safeParse(data);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.message },
        { status: 400 }
      );
    }
    const parsedData = validationResult.data;

    // Build updates object
    const updates: Partial<typeof products.$inferInsert> = {};
    if (parsedData.name !== undefined) updates.name = parsedData.name;
    if (parsedData.price !== undefined) updates.price = parsedData.price;
    if (parsedData.image_url !== undefined) updates.image_url = parsedData.image_url;
    if (parsedData.description !== undefined) updates.description = parsedData.description;
    if (parsedData.status !== undefined) updates.status = parsedData.status;
    if (parsedData.collection_id !== undefined) updates.collection_id = parsedData.collection_id;

    // Update the product
    await db.update(products)
      .set(updates)
      .where(eq(products.id, id));

    invalidatePublicMenu();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating product:", error);
    return NextResponse.json(
      { error: "Failed to update product" },
      { status: 500 }
    );
  }
}
