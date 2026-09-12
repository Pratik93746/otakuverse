import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createFirestoreProduct, getFirestoreProducts, deleteFirestoreProduct } from '@/lib/firestore';
import {
  saveStoredCustomProduct,
  getStoredCustomProducts,
} from '@/lib/customProductsStore';
import { MOCK_PRODUCTS } from '@/lib/mockProducts';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const localProducts = getStoredCustomProducts();
    let fsProducts: any[] = [];
    try {
      fsProducts = await getFirestoreProducts();
    } catch {
      // ignore
    }

    // Merge & deduplicate by id/slug
    const customMap = new Map();
    [...localProducts, ...fsProducts].forEach((p) => {
      customMap.set(p.id || p.slug, p);
    });
    const combinedCustom = Array.from(customMap.values());

    return NextResponse.json({
      customProducts: combinedCustom,
      totalCatalog: combinedCustom.length + MOCK_PRODUCTS.length,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to fetch products' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      price,
      compareAtPrice,
      image,
      images,
      animeName,
      characterName,
      brandName,
      categoryName,
      stock = 10,
      badge = 'new', // 'standard' | 'new' | 'bestseller' | 'limited' | 'preorder'
      description,
    } = body;

    if (!name || !price) {
      return NextResponse.json({ error: 'Product name and price are required' }, { status: 400 });
    }

    const numPrice = Number(price);
    const numCompare = compareAtPrice ? Number(compareAtPrice) : null;
    const discount = numCompare && numCompare > numPrice ? Math.round(((numCompare - numPrice) / numCompare) * 100) : 0;

    const baseSlug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const uniqueSlug = `${baseSlug}-${Math.random().toString(36).substring(2, 6)}`;

    const animeSlug = animeName ? animeName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') : 'anime';
    const categorySlug = categoryName ? categoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') : 'figures';

    const now = new Date().toISOString();
    const productPayload: any = {
      id: uniqueSlug,
      name,
      slug: uniqueSlug,
      price: numPrice,
      compareAtPrice: numCompare,
      discount,
      image: image || '/catalog/dragon-ball/item-001.png',
      images: images || (image ? [image] : []),
      characterName: characterName || '',
      animeName: animeName || 'Anime',
      animeSlug,
      brandName: brandName || 'OTAKUVERSE Exclusive',
      categoryName: categoryName || 'Figures',
      categorySlug,
      stock: Number(stock) || 10,
      isSoldOut: Number(stock) <= 0,
      isNewArrival: badge === 'new',
      isBestSeller: badge === 'bestseller',
      isLimitedEdition: badge === 'limited',
      isPreOrder: badge === 'preorder',
      isFeatured: true,
      description: description || `Official authentic ${name} anime collectible sculpted with premium grade PVC details.`,
      createdAt: now,
      updatedAt: now,
    };

    // 1. Always save to persistent store (guarantees immediate availability and durability)
    const saved = saveStoredCustomProduct(productPayload);

    // 2. Sync to Firestore (non-blocking so permission rules or network drops don't fail the operation)
    try {
      await createFirestoreProduct(productPayload);
    } catch (fsErr: any) {
      console.warn('⚠️ [Firestore Sync Notice]:', fsErr?.message || fsErr);
    }

    // 3. Try saving to Prisma if DB is available (non-blocking)
    try {
      await prisma.product.create({
        data: {
          name,
          slug: uniqueSlug,
          price: numPrice,
          compareAtPrice: numCompare,
          discount,
          stock: Number(stock) || 10,
          description: productPayload.description,
          isNewArrival: badge === 'new',
          isBestSeller: badge === 'bestseller',
          isLimitedEdition: badge === 'limited',
          isPreOrder: badge === 'preorder',
          isPublished: true,
        },
      });
    } catch {
      // Prisma offline, persistent custom store is active
    }

    return NextResponse.json({ success: true, product: saved });
  } catch (error: any) {
    console.error('Error creating product:', error);
    return NextResponse.json({ error: error?.message || 'Failed to create product' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const body = await request.json();
    const { id, stock } = body;

    if (!id || stock === undefined || stock === null) {
      return NextResponse.json({ error: 'Product ID and stock are required' }, { status: 400 });
    }

    const numStock = Math.max(0, parseInt(stock, 10) || 0);

    // 1. Update in local storage & overrides
    const { setProductStockOverride } = await import('@/lib/customProductsStore');
    setProductStockOverride(id, numStock);

    // 2. Try Firestore non-blocking
    try {
      const { doc, updateDoc } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase');
      if (db) {
        await updateDoc(doc(db, 'products', id), {
          stock: numStock,
          isSoldOut: numStock <= 0,
          updatedAt: new Date().toISOString(),
        });
      }
    } catch {
      // non-blocking
    }

    // 3. Try Prisma non-blocking
    try {
      await prisma.product.update({
        where: { id },
        data: { stock: numStock },
      });
    } catch {
      // non-blocking
    }

    return NextResponse.json({ success: true, stock: numStock });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to update stock' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Product ID required' }, { status: 400 });
    }

    const { addRemovedProduct } = await import('@/lib/customProductsStore');
    addRemovedProduct(id);

    try {
      await deleteFirestoreProduct(id);
    } catch {
      // ignore
    }

    try {
      await prisma.product.delete({ where: { id } });
    } catch {
      // ignore
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to delete product' }, { status: 500 });
  }
}
