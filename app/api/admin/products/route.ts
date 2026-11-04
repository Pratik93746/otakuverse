import { NextRequest, NextResponse } from 'next/server';
import { authenticateAdmin } from '@/lib/admin-auth';
import {
  getAllProductsAdmin,
  createProduct,
  updateProduct,
  updateProductStock,
  adjustProductStock,
  deleteProduct,
} from '@/lib/db/products';
import { recordAudit } from '@/lib/db/audit';
import { parsePrice, parseStock, sanitizeProductPatch } from '@/lib/validation/product';
import { getCollection } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

const forbidden = () => NextResponse.json({ error: 'Unauthorized: Admin privileges required' }, { status: 403 });
const serverError = (label: string, err: unknown) => {
  console.error(`Admin products ${label} error:`, err);
  return NextResponse.json({ error: 'Something went wrong on our side. Nothing was changed — please try again.' }, { status: 500 });
};
const slugify = (v: string) => v.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

/** Admin lookup that also finds hidden products. */
async function findAnyProduct(idOrSlug: string): Promise<any | null> {
  const col = await getCollection<any>('products');
  const or: any[] = [{ slug: idOrSlug }];
  if (ObjectId.isValid(idOrSlug) && idOrSlug.length === 24) or.push({ _id: new ObjectId(idOrSlug) });
  return await col.findOne({ $or: or });
}

export async function GET(request: NextRequest) {
  try {
    if (!(await authenticateAdmin(request))) return forbidden();
    const products = await getAllProductsAdmin();
    return NextResponse.json({ customProducts: products, totalCatalog: products.length });
  } catch (err) {
    return serverError('GET', err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await authenticateAdmin(request);
    if (!actor) return forbidden();

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

    const name = typeof body.name === 'string' ? body.name.trim().slice(0, 200) : '';
    if (!name) return NextResponse.json({ error: 'Please enter the product name.' }, { status: 400 });

    const price = parsePrice(body.price, 'Price');
    if ('error' in price) return NextResponse.json({ error: price.error, field: 'price' }, { status: 400 });

    const stock = parseStock(body.stock === undefined ? 10 : body.stock, 'Stock');
    if ('error' in stock) return NextResponse.json({ error: stock.error, field: 'stock' }, { status: 400 });

    let compareAt: number | null = null;
    if (body.compareAtPrice) {
      const c = parsePrice(body.compareAtPrice, 'Original price');
      if ('error' in c) return NextResponse.json({ error: c.error, field: 'compareAtPrice' }, { status: 400 });
      compareAt = c.value > price.value ? c.value : null;
    }

    const text = (v: unknown, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
    const animeName = text(body.animeName) || 'Anime';
    const categoryName = text(body.categoryName) || 'Figures';
    const badge = typeof body.badge === 'string' ? body.badge : 'new';
    const image = text(body.image, 1000);
    const images = Array.isArray(body.images)
      ? body.images.filter((i: unknown): i is string => typeof i === 'string').slice(0, 12).map((i: string) => i.trim().slice(0, 1000))
      : image ? [image] : [];

    const created = await createProduct({
      name,
      slug: slugify(name),
      price: price.value,
      compareAtPrice: compareAt,
      discount: compareAt ? Math.round(((compareAt - price.value) / compareAt) * 100) : 0,
      image: image || '/catalog/dragon-ball/item-001.png',
      images,
      characterName: text(body.characterName),
      animeName,
      animeSlug: slugify(animeName) || 'anime',
      brandName: text(body.brandName) || 'BAKA Exclusive',
      categoryName,
      categorySlug: slugify(categoryName) || 'figures',
      stock: stock.value,
      isSoldOut: stock.value <= 0,
      isPublished: body.isPublished !== false,
      isNewArrival: badge === 'new',
      isBestSeller: badge === 'bestseller',
      isLimitedEdition: badge === 'limited',
      isPreOrder: badge === 'preorder',
      isFeatured: badge === 'featured',
      description: text(body.description, 5000) || `Premium ${name} official figure from BAKA.`,
    });

    await recordAudit({ actor: actor.email, action: 'product.create', target: created.slug, detail: { price: price.value, stock: stock.value } });
    return NextResponse.json({ success: true, product: created }, { status: 201 });
  } catch (err) {
    return serverError('POST', err);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const actor = await authenticateAdmin(request);
    if (!actor) return forbidden();

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

    const id = typeof body.id === 'string' ? body.id : '';
    if (!id) return NextResponse.json({ error: 'Product ID or slug is required' }, { status: 400 });

    const before = await findAnyProduct(id);
    if (!before) return NextResponse.json({ error: 'That product no longer exists. Please refresh the page.' }, { status: 404 });

    // "+1 / -1" buttons: applied atomically so a sale in between is never overwritten.
    if (body.stockDelta !== undefined) {
      if (!Number.isInteger(body.stockDelta) || Math.abs(body.stockDelta) > 1000) {
        return NextResponse.json({ error: 'Stock change must be a whole number' }, { status: 400 });
      }
      const newStock = await adjustProductStock(id, body.stockDelta);
      if (newStock === null) {
        return NextResponse.json({ error: 'Stock cannot go below zero. Please refresh to see the current stock.' }, { status: 409 });
      }
      await recordAudit({ actor: actor.email, action: 'product.stock_adjust', target: before.slug, detail: { delta: body.stockDelta, newStock } });
      return NextResponse.json({ success: true, stock: newStock });
    }

    const { patch, issues } = sanitizeProductPatch(body);
    if (issues.length) {
      return NextResponse.json({ error: issues.map((i) => i.message).join('. '), field: issues[0].field }, { status: 400 });
    }
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'Nothing to change' }, { status: 400 });
    }

    let updated;
    if (Object.keys(patch).length === 1 && typeof patch.stock === 'number') {
      await updateProductStock(id, patch.stock as number);
      updated = await findAnyProduct(id);
    } else {
      updated = await updateProduct(id, patch as any);
    }

    const changed: Record<string, { from: unknown; to: unknown }> = {};
    for (const k of Object.keys(patch)) {
      if (k === 'description' || k === 'images' || k === 'image') continue;
      changed[k] = { from: before[k], to: patch[k] };
    }
    await recordAudit({ actor: actor.email, action: 'product.update', target: before.slug, detail: changed });
    return NextResponse.json({ success: true, product: updated });
  } catch (err) {
    return serverError('PATCH', err);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const actor = await authenticateAdmin(request);
    if (!actor) return forbidden();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id') || searchParams.get('slug');
    if (!id) return NextResponse.json({ error: 'Product ID or slug is required' }, { status: 400 });

    const before = await findAnyProduct(id);
    const deleted = await deleteProduct(id);
    if (deleted) await recordAudit({ actor: actor.email, action: 'product.delete', target: before?.slug || id, detail: { name: before?.name, price: before?.price } });
    return NextResponse.json({ success: deleted });
  } catch (err) {
    return serverError('DELETE', err);
  }
}
