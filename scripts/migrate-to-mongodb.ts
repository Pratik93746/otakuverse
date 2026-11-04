import fs from 'fs';
import path from 'path';

// Load .env.local for standalone execution
const envLocalPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  const content = fs.readFileSync(envLocalPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.substring(0, idx).trim();
      let val = trimmed.substring(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

import { MOCK_PRODUCTS } from '../lib/mockProducts';
import { DbProduct, DbOrder, DbUser } from '../lib/db/types';

async function runMigration() {
  const isDryRun = process.argv.includes('--dry-run');
  const isForceProd = process.argv.includes('--force-production-migration');

  if (process.env.NODE_ENV === 'production' && !isForceProd && !isDryRun) {
    console.error('⛔ [Migration Guard] Refusing to run live migration on production database without --force-production-migration or --dry-run.');
    process.exit(1);
  }

  console.log(`🚀 [Migration] Starting MongoDB data migration...${isDryRun ? ' (DRY-RUN MODE)' : ''}\n`);

  const { getDatabase, ensureIndexes, getMongoClient } = await import('../lib/mongodb');
  await ensureIndexes();
  const db = await getDatabase();

  const report = {
    usersMigrated: 0,
    productsMigrated: 0,
    ordersMigrated: 0,
    warnings: [] as string[],
  };

  // ============================================================
  // 1. MIGRATE USERS (NEVER auto-promote to ADMIN)
  // ============================================================
  console.log('📦 [1/3] Migrating Users...');
  const usersPath = path.join(process.cwd(), 'lib', 'custom-users.json');
  if (fs.existsSync(usersPath)) {
    try {
      const rawUsers = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
      const usersCol = db.collection<DbUser>('users');

      for (const u of rawUsers) {
        const cleanEmail = (u.email || '').toLowerCase().trim();
        const firebaseUid = u.uid || `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

        const userDoc: DbUser = {
          firebaseUid,
          name: u.name || cleanEmail.split('@')[0],
          email: cleanEmail,
          phone: u.phone || '',
          role: 'USER', // Security: Migrations must NEVER mint administrators
          createdAt: u.createdAt ? new Date(u.createdAt) : new Date(),
          updatedAt: u.updatedAt ? new Date(u.updatedAt) : new Date(),
        };

        if (!isDryRun) {
          await usersCol.updateOne(
            { $or: [{ firebaseUid }, { email: cleanEmail }] },
            { $setOnInsert: userDoc },
            { upsert: true }
          );
        }
        report.usersMigrated++;
      }
      console.log(`✅ Migrated ${report.usersMigrated} users.`);
    } catch (err: any) {
      report.warnings.push(`User migration warning: ${err.message}`);
    }
  }

  // ============================================================
  // 2. MIGRATE PRODUCTS
  // ============================================================
  console.log('\n📦 [2/3] Migrating Products Catalog & Custom Products...');
  try {
    const productsCol = db.collection<DbProduct>('products');

    // Read overrides and removed list
    let overrides: Record<string, { stock: number }> = {};
    const overridesPath = path.join(process.cwd(), 'lib', 'product-overrides.json');
    if (fs.existsSync(overridesPath)) {
      try {
        overrides = JSON.parse(fs.readFileSync(overridesPath, 'utf8'));
      } catch {}
    }

    let removedIds: string[] = [];
    const removedPath = path.join(process.cwd(), 'lib', 'removed-products.json');
    if (fs.existsSync(removedPath)) {
      try {
        removedIds = JSON.parse(fs.readFileSync(removedPath, 'utf8'));
      } catch {}
    }

    // Read any custom products
    let customProducts: any[] = [];
    const customProdsPath = path.join(process.cwd(), 'lib', 'custom-products.json');
    if (fs.existsSync(customProdsPath)) {
      try {
        customProducts = JSON.parse(fs.readFileSync(customProdsPath, 'utf8'));
      } catch {}
    }

    const allCatalog = [...customProducts, ...MOCK_PRODUCTS].filter(
      (p) => !removedIds.includes(p.id) && !removedIds.includes(p.slug)
    );

    for (const p of allCatalog) {
      const stock = overrides[p.id]?.stock ?? overrides[p.slug]?.stock ?? p.stock ?? 10;
      const slug = p.slug || p.id;
      const now = new Date();

      const productDoc: DbProduct = {
        name: p.name,
        slug,
        price: Number(p.price) || 0,
        compareAtPrice: p.compareAtPrice ? Number(p.compareAtPrice) : null,
        discount: p.discount ? Number(p.discount) : null,
        image: p.image || '/catalog/dragon-ball/item-001.png',
        images: p.images || (p.image ? [p.image] : []),
        characterName: p.characterName || '',
        animeName: p.animeName || 'Anime',
        animeSlug: p.animeSlug || 'anime',
        brandName: p.brandName || 'BAKA Exclusive',
        categoryName: p.categoryName || 'Figures',
        categorySlug: p.categorySlug || 'figures',
        stock: Number(stock),
        isSoldOut: Number(stock) <= 0,
        isNewArrival: !!p.isNewArrival,
        isBestSeller: !!p.isBestSeller,
        isLimitedEdition: !!p.isLimitedEdition,
        isPreOrder: !!p.isPreOrder,
        isFeatured: !!p.isFeatured,
        description: p.description || `Official ${p.name} collectible.`,
        createdAt: p.createdAt ? new Date(p.createdAt) : now,
        updatedAt: now,
      };

      if (!isDryRun) {
        await productsCol.updateOne(
          { slug },
          { $setOnInsert: productDoc },
          { upsert: true }
        );
      }
      report.productsMigrated++;
    }
    console.log(`✅ Migrated ${report.productsMigrated} products.`);
  } catch (err: any) {
    report.warnings.push(`Product migration warning: ${err.message}`);
  }

  // ============================================================
  // 3. MIGRATE ORDERS
  // ============================================================
  console.log('\n📦 [3/3] Migrating Orders...');
  const ordersPath = path.join(process.cwd(), 'lib', 'custom-orders.json');
  if (fs.existsSync(ordersPath)) {
    try {
      const rawOrders = JSON.parse(fs.readFileSync(ordersPath, 'utf8'));
      const ordersCol = db.collection<DbOrder>('orders');

      for (const o of rawOrders) {
        const orderNumber = o.orderNumber || o.id;
        const firebaseUid = o.userId || o.customer?.uid || 'legacy-customer';

        const orderDoc: DbOrder = {
          orderNumber,
          firebaseUid,
          customer: {
            name: o.customer?.name || 'Valued Collector',
            email: o.customer?.email || 'customer@baka.style',
            phone: o.customer?.phone || '',
          },
          shippingAddress: {
            fullName: o.shippingAddress?.fullName || 'Collector',
            phone: o.shippingAddress?.phone || '',
            addressLine1: o.shippingAddress?.addressLine1 || '',
            addressLine2: o.shippingAddress?.addressLine2 || '',
            city: o.shippingAddress?.city || '',
            state: o.shippingAddress?.state || '',
            pinCode: o.shippingAddress?.pinCode || '',
            country: o.shippingAddress?.country || 'India',
          },
          items: (o.items || []).map((i: any) => ({
            productId: i.productId || i.slug || 'prod',
            name: i.name,
            slug: i.slug,
            image: i.image,
            characterName: i.characterName,
            animeName: i.animeName,
            brandName: i.brandName,
            sku: i.sku,
            purchasePrice: Number(i.price ?? i.purchasePrice) || 0,
            quantity: Number(i.quantity) || 1,
            subtotal: Number(i.subtotal ?? ((i.price || 0) * (i.quantity || 1))) || 0,
          })),
          subtotal: Number(o.subtotal) || 0,
          shipping: Number(o.shipping) || 0,
          tax: Number(o.tax) || 0,
          discount: Number(o.discount) || 0,
          total: Number(o.total) || 0,
          couponCode: o.couponCode || null,
          deliveryMethod: o.deliveryMethod || 'standard',
          orderStatus: o.orderStatus || 'CONFIRMED',
          payment: {
            paymentStatus: o.payment?.paymentStatus || 'PENDING',
            paymentId: o.payment?.paymentId || null,
            razorpayOrderId: o.payment?.razorpayOrderId || null,
            razorpaySignature: o.payment?.razorpaySignature || null,
            paymentMethod: o.payment?.paymentMethod || 'COD',
            amount: Number(o.payment?.amount ?? o.total) || 0,
            currency: o.payment?.currency || 'INR',
            createdAt: o.payment?.createdAt ? new Date(o.payment.createdAt) : new Date(),
          },
          createdAt: o.createdAt ? new Date(o.createdAt) : new Date(),
          updatedAt: o.updatedAt ? new Date(o.updatedAt) : new Date(),
        };

        if (!isDryRun) {
          await ordersCol.updateOne(
            { orderNumber },
            { $setOnInsert: orderDoc },
            { upsert: true }
          );
        }
        report.ordersMigrated++;
      }
      console.log(`✅ Migrated ${report.ordersMigrated} orders.`);
    } catch (err: any) {
      report.warnings.push(`Order migration warning: ${err.message}`);
    }
  }

  console.log('\n============================================================');
  console.log('🎉 [Migration Complete] Final Report:');
  console.log(`- Users Migrated:    ${report.usersMigrated}`);
  console.log(`- Products Migrated: ${report.productsMigrated}`);
  console.log(`- Orders Migrated:   ${report.ordersMigrated}`);
  if (report.warnings.length) {
    console.log(`- Warnings (${report.warnings.length}):`);
    report.warnings.forEach((w) => console.log(`  * ${w}`));
  }
  console.log('============================================================\n');

  const client = await getMongoClient();
  await client.close();
}

runMigration().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
