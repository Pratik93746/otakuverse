import fs from 'fs';
import path from 'path';
import { FirestoreProduct } from './firestore';

const STORAGE_FILE = path.join(process.cwd(), 'lib', 'custom-products.json');
const OVERRIDES_FILE = path.join(process.cwd(), 'lib', 'product-overrides.json');
const REMOVED_FILE = path.join(process.cwd(), 'lib', 'removed-products.json');

function ensureFileExists() {
  try {
    if (!fs.existsSync(STORAGE_FILE)) {
      fs.writeFileSync(STORAGE_FILE, JSON.stringify([]), 'utf-8');
    }
  } catch (err) {
    console.warn('⚠️ [customProductsStore] Could not initialize storage file:', err);
  }
}

export function getStoredCustomProducts(): FirestoreProduct[] {
  try {
    ensureFileExists();
    if (!fs.existsSync(STORAGE_FILE)) return [];
    const content = fs.readFileSync(STORAGE_FILE, 'utf-8');
    return JSON.parse(content || '[]') as FirestoreProduct[];
  } catch (err) {
    console.warn('⚠️ [customProductsStore] Error reading custom products:', err);
    return [];
  }
}

export function saveStoredCustomProduct(product: FirestoreProduct): FirestoreProduct {
  try {
    ensureFileExists();
    const existing = getStoredCustomProducts();
    const index = existing.findIndex((p) => p.id === product.id || p.slug === product.slug);
    if (index >= 0) {
      existing[index] = product;
    } else {
      existing.unshift(product);
    }
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(existing, null, 2), 'utf-8');
    return product;
  } catch (err) {
    console.warn('⚠️ [customProductsStore] Error saving custom product:', err);
    return product;
  }
}

export function deleteStoredCustomProduct(id: string): boolean {
  try {
    ensureFileExists();
    const existing = getStoredCustomProducts();
    const filtered = existing.filter((p) => p.id !== id && p.slug !== id);
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(filtered, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.warn('⚠️ [customProductsStore] Error deleting custom product:', err);
    return false;
  }
}

export function getProductOverrides(): Record<string, { stock?: number }> {
  try {
    if (!fs.existsSync(OVERRIDES_FILE)) return {};
    const content = fs.readFileSync(OVERRIDES_FILE, 'utf-8');
    return JSON.parse(content || '{}');
  } catch {
    return {};
  }
}

export function setProductStockOverride(idOrSlug: string, stock: number): void {
  try {
    const overrides = getProductOverrides();
    overrides[idOrSlug] = { ...(overrides[idOrSlug] || {}), stock };
    fs.writeFileSync(OVERRIDES_FILE, JSON.stringify(overrides, null, 2), 'utf-8');

    // Also update custom-products.json if it exists there
    const custom = getStoredCustomProducts();
    const idx = custom.findIndex((p) => p.id === idOrSlug || p.slug === idOrSlug);
    if (idx >= 0) {
      custom[idx].stock = stock;
      custom[idx].isSoldOut = stock <= 0;
      fs.writeFileSync(STORAGE_FILE, JSON.stringify(custom, null, 2), 'utf-8');
    }
  } catch (err) {
    console.warn('⚠️ [customProductsStore] Error updating stock:', err);
  }
}

export function getRemovedProductIds(): string[] {
  try {
    if (!fs.existsSync(REMOVED_FILE)) return [];
    const content = fs.readFileSync(REMOVED_FILE, 'utf-8');
    return JSON.parse(content || '[]');
  } catch {
    return [];
  }
}

export function addRemovedProduct(idOrSlug: string): void {
  try {
    const removed = getRemovedProductIds();
    if (!removed.includes(idOrSlug)) {
      removed.push(idOrSlug);
      fs.writeFileSync(REMOVED_FILE, JSON.stringify(removed, null, 2), 'utf-8');
    }
    deleteStoredCustomProduct(idOrSlug);
  } catch (err) {
    console.warn('⚠️ [customProductsStore] Error recording removed product:', err);
  }
}

export async function getAllCustomProductsAsync(): Promise<FirestoreProduct[]> {
  const local = getStoredCustomProducts();
  const removed = getRemovedProductIds();
  const overrides = getProductOverrides();

  let fsProducts: FirestoreProduct[] = [];
  try {
    const { getFirestoreProducts } = await import('./firestore');
    fsProducts = await getFirestoreProducts();
  } catch {
    // ignore
  }

  const customMap = new Map<string, FirestoreProduct>();
  [...local, ...fsProducts].forEach((p) => {
    const key = p.id || p.slug;
    if (key && !removed.includes(p.id) && !removed.includes(p.slug)) {
      const stock = overrides[p.id]?.stock ?? overrides[p.slug]?.stock ?? p.stock;
      customMap.set(key, {
        ...p,
        stock,
        isSoldOut: stock <= 0,
      });
    }
  });

  return Array.from(customMap.values());
}
