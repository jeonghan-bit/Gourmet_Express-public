import { NextRequest, NextResponse } from 'next/server';
import { db, products } from '@/lib/db';
import { insertProductSchema } from '@/lib/schemas';
import { requireAdmin } from '@/lib/adminAuth';
import { invalidatePublicMenu } from '@/lib/publicMenu';

export async function POST(req: NextRequest) {
  const { response } = await requireAdmin();
  if (response) return response;

  try {
    const data = await req.json();
    const validationResult = insertProductSchema.safeParse(data);
    if (!validationResult.success) {
      return NextResponse.json({ error: validationResult.error.message }, { status: 400 });
    }
    const inserted = await db
      .insert(products)
      .values({
        ...validationResult.data,
        price: String(validationResult.data.price),
      })
      .returning();
    invalidatePublicMenu();
    return NextResponse.json({ success: true, product: inserted[0] });
  } catch (error) {
    if (error instanceof Error) {
      console.error('Insert error details:', error.message, error.stack);
    } else {
      console.error('Insert error:', error);
    }
    return NextResponse.json({ error: 'Failed to insert product' }, { status: 500 });
  }
}
