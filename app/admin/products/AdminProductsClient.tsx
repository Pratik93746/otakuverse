'use client';

import { useState, useMemo, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Plus,
  Search,
  Trash2,
  Upload,
  Camera,
  X,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import toast from 'react-hot-toast';

export interface AdminProductItem {
  id: string;
  name: string;
  slug: string;
  price: number;
  compareAtPrice?: number | null;
  discount?: number | null;
  image: string;
  characterName?: string | null;
  animeName?: string | null;
  animeSlug?: string | null;
  brandName?: string | null;
  categoryName?: string | null;
  stock: number;
  isNewArrival?: boolean;
  isBestSeller?: boolean;
  isLimitedEdition?: boolean;
  isPreOrder?: boolean;
  isCustom?: boolean;
  sku?: string | null;
}

const EXISTING_ANIME = [
  'Dragon Ball',
  'Naruto Shippuden',
  'One Piece',
  'Jujutsu Kaisen',
  'Demon Slayer',
  'Attack on Titan',
  'Bleach',
  'Chainsaw Man',
  'My Hero Academia',
  'Solo Leveling',
  'Spy x Family',
  'Tokyo Ghoul',
  'Death Note',
  'Genshin Impact',
];

const EXISTING_CATEGORIES = [
  'Scale Figures (1/7 & 1/8)',
  'Nendoroids & Chibis',
  'Pop Up Parade',
  'Action Statues & Dioramas',
  'Limited Edition Resins',
  'Art Figures',
];

export function AdminProductsClient({ initialProducts }: { initialProducts: AdminProductItem[] }) {
  const [products, setProducts] = useState<AdminProductItem[]>(initialProducts);
  const [search, setSearch] = useState('');
  const [selectedFranchise, setSelectedFranchise] = useState('ALL');
  const [selectedBadge, setSelectedBadge] = useState<'ALL' | 'NEW' | 'BESTSELLER' | 'LIMITED' | 'PREORDER'>('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form State
  const [formName, setFormName] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formCompareAt, setFormCompareAt] = useState('');
  const [formStock, setFormStock] = useState('10');
  const [formAnime, setFormAnime] = useState('Naruto Shippuden');
  const [formCustomAnime, setFormCustomAnime] = useState('');
  const [formCharacter, setFormCharacter] = useState('');
  const [formCategory, setFormCategory] = useState('Scale Figures (1/7 & 1/8)');
  const [formBadge, setFormBadge] = useState<'standard' | 'new' | 'bestseller' | 'limited' | 'preorder'>('new');
  const [formDescription, setFormDescription] = useState('');
  const [formImage, setFormImage] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Calculate live discount percentage
  const calculatedDiscount = useMemo(() => {
    const p = parseFloat(formPrice);
    const c = parseFloat(formCompareAt);
    if (!isNaN(p) && !isNaN(c) && c > p) {
      return Math.round(((c - p) / c) * 100);
    }
    return 0;
  }, [formPrice, formCompareAt]);

  // Handle Photo Upload (file or camera)
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setImagePreview(result);
      setFormImage(result);
      toast.success('Photo attached! 📸');
    };
    reader.readAsDataURL(file);
  };

  // Handle Submit New Product
  const handleSubmitNewProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formPrice) {
      toast.error('Please enter product name and price');
      return;
    }

    const finalAnime = formAnime === 'OTHER' ? formCustomAnime.trim() : formAnime;
    if (!finalAnime) {
      toast.error('Please specify an anime franchise');
      return;
    }

    const finalImage = formImage.trim() || imagePreview || '/catalog/dragon-ball/item-001.png';

    setSaving(true);
    try {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName.trim(),
          price: parseFloat(formPrice),
          compareAtPrice: formCompareAt ? parseFloat(formCompareAt) : null,
          stock: parseInt(formStock, 10) || 10,
          animeName: finalAnime,
          characterName: formCharacter.trim(),
          categoryName: formCategory,
          badge: formBadge,
          image: finalImage,
          description: formDescription.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create figure');

      const created: AdminProductItem = {
        id: data.product.id,
        name: data.product.name,
        slug: data.product.slug,
        price: data.product.price,
        compareAtPrice: data.product.compareAtPrice,
        discount: data.product.discount,
        image: data.product.image,
        characterName: data.product.characterName,
        animeName: data.product.animeName,
        animeSlug: data.product.animeSlug,
        brandName: data.product.brandName,
        categoryName: data.product.categoryName,
        stock: data.product.stock,
        isNewArrival: data.product.isNewArrival,
        isBestSeller: data.product.isBestSeller,
        isLimitedEdition: data.product.isLimitedEdition,
        isPreOrder: data.product.isPreOrder,
        isCustom: true,
        sku: data.product.id,
      };

      setProducts([created, ...products]);
      toast.success('Figure Added to OTAKUVERSE Store & Catalog! 🎌');

      // Reset form
      setFormName('');
      setFormPrice('');
      setFormCompareAt('');
      setFormStock('10');
      setFormCharacter('');
      setFormDescription('');
      setFormImage('');
      setImagePreview(null);
      setModalOpen(false);
    } catch (err: any) {
      toast.error(err?.message || 'Could not add figure');
    } finally {
      setSaving(false);
    }
  };

  // Handle Delete (any product)
  const handleDeleteProduct = async (prod: AdminProductItem) => {
    if (!confirm(`Are you sure you want to remove "${prod.name}" from the store catalog?`)) return;

    try {
      const res = await fetch(`/api/admin/products?id=${encodeURIComponent(prod.id)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to remove');
      setProducts(products.filter((p) => p.id !== prod.id && p.slug !== prod.slug));
      toast.success(`Removed "${prod.name}" from store catalog! 🗑️`);
    } catch {
      toast.error('Failed to remove figure');
    }
  };

  // Handle Stock Quantity Update (+ / -)
  const handleUpdateStock = async (prod: AdminProductItem, delta: number) => {
    const newStock = Math.max(0, prod.stock + delta);
    setProducts((prev) =>
      prev.map((p) => (p.id === prod.id ? { ...p, stock: newStock } : p))
    );

    try {
      const res = await fetch('/api/admin/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: prod.id, stock: newStock }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Stock updated: ${newStock} units`);
    } catch {
      toast.error('Failed to update stock quantity');
    }
  };

  // Handle Setting Stock Quantity Directly
  const handleSetStockDirectly = async (prod: AdminProductItem, targetStock: number) => {
    const newStock = Math.max(0, targetStock);
    setProducts((prev) =>
      prev.map((p) => (p.id === prod.id ? { ...p, stock: newStock } : p))
    );

    try {
      const res = await fetch('/api/admin/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: prod.id, stock: newStock }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Stock quantity set to ${newStock} units`);
    } catch {
      toast.error('Failed to update stock quantity');
    }
  };

  // Filtering
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Search
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.characterName || '').toLowerCase().includes(q) ||
        (p.animeName || '').toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q);

      // Franchise
      const matchFranchise =
        selectedFranchise === 'ALL' ||
        (p.animeName || '').toLowerCase() === selectedFranchise.toLowerCase();

      // Badge
      let matchBadge = true;
      if (selectedBadge === 'NEW') matchBadge = !!p.isNewArrival;
      else if (selectedBadge === 'BESTSELLER') matchBadge = !!p.isBestSeller;
      else if (selectedBadge === 'LIMITED') matchBadge = !!p.isLimitedEdition;
      else if (selectedBadge === 'PREORDER') matchBadge = !!p.isPreOrder;

      return matchSearch && matchFranchise && matchBadge;
    });
  }, [products, search, selectedFranchise, selectedBadge]);

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="container-wide">
        {/* Header Navigation */}
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-6">
          <Link href="/admin" className="hover:text-brand-red flex items-center gap-1">
            ← Back to Dashboard
          </Link>
          <span>/</span>
          <span className="text-gray-900 font-semibold">Products Catalog & Figure Management</span>
        </div>

        {/* Title Bar with Add Button */}
        <div className="bg-white border border-gray-200 p-6 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-purple-600 text-white text-[10px] font-bold px-2 py-0.5 uppercase tracking-wider">
                Admin Catalog
              </span>
              <span className="text-xs text-gray-500">Live Figure Management</span>
            </div>
            <h1 className="font-heading text-3xl tracking-wide uppercase">
              FIGURES & INVENTORY ({products.length})
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Add new figures, take/upload photos, configure pricing, badges (New Arrival, Bestseller), and stock
            </p>
          </div>

          <button
            onClick={() => setModalOpen(true)}
            className="btn-primary text-xs py-3 px-5 flex items-center gap-2 self-start cursor-pointer shadow-md hover:scale-[1.02] transition-transform"
          >
            <Plus className="w-4 h-4" /> Add New Figure
          </button>
        </div>

        {/* Filter Controls Bar */}
        <div className="bg-white border border-gray-200 p-4 mb-6 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search figure by name, character, anime or slug..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-sm focus:bg-white focus:border-brand-red outline-none"
              />
            </div>

            {/* Franchise Dropdown */}
            <select
              value={selectedFranchise}
              onChange={(e) => setSelectedFranchise(e.target.value)}
              className="py-2 px-3 text-xs bg-gray-50 border border-gray-200 rounded-sm focus:border-brand-red outline-none"
            >
              <option value="ALL">All Anime Franchises ({products.length})</option>
              {EXISTING_ANIME.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>

            {/* Badge Filter */}
            <div className="flex items-center gap-1 overflow-x-auto">
              {(['ALL', 'NEW', 'BESTSELLER', 'LIMITED', 'PREORDER'] as const).map((b) => (
                <button
                  key={b}
                  onClick={() => setSelectedBadge(b)}
                  className={`px-2.5 py-1.5 text-[10px] font-bold uppercase rounded-sm transition-colors cursor-pointer ${
                    selectedBadge === b
                      ? 'bg-black text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {b === 'ALL' ? 'All' : b}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Figures Table */}
        <div className="bg-white border border-gray-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider border-b">
                <tr>
                  <th className="py-3.5 px-4">Figure & Specifications</th>
                  <th className="py-3.5 px-4">Franchise & Character</th>
                  <th className="py-3.5 px-4">Price & Discount</th>
                  <th className="py-3.5 px-4">Stock</th>
                  <th className="py-3.5 px-4">Store Badge</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-400">
                      No figures match your filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((product) => (
                    <tr key={product.id} className="hover:bg-gray-50/80 transition-colors">
                      {/* Figure Thumbnail & Title */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <Link
                            href={`/product/${product.slug}`}
                            target="_blank"
                            className="w-12 h-14 bg-gray-50 border border-gray-200 relative overflow-hidden flex-shrink-0 group rounded-xs"
                          >
                            {product.image ? (
                              <Image
                                src={product.image}
                                alt={product.name}
                                fill
                                className="object-cover group-hover:scale-105 transition-transform"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-300 font-bold">
                                OTV
                              </div>
                            )}
                          </Link>
                          <div className="min-w-0 max-w-sm">
                            <p className="font-semibold text-gray-900 leading-snug truncate">
                              {product.name}
                            </p>
                            <p className="text-[10px] text-gray-400 font-mono">
                              SKU: {product.sku || product.id}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Franchise & Character */}
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-gray-800">{product.animeName || '—'}</p>
                        {product.characterName && (
                          <p className="text-[10px] text-purple-700 font-semibold">{product.characterName}</p>
                        )}
                      </td>

                      {/* Price & Discount */}
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-gray-900">{formatPrice(product.price)}</span>
                        {product.compareAtPrice && product.compareAtPrice > product.price && (
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] text-gray-400 line-through">
                              {formatPrice(product.compareAtPrice)}
                            </span>
                            {product.discount ? (
                              <span className="text-[9px] font-bold text-green-700 bg-green-50 px-1 rounded">
                                {product.discount}% OFF
                              </span>
                            ) : null}
                          </div>
                        )}
                      </td>

                      {/* Stock Quantity Controls */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleUpdateStock(product, -1)}
                            disabled={product.stock <= 0}
                            className="w-6 h-6 flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-700 rounded font-bold transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                            title="Decrease Quantity (-1)"
                          >
                            -
                          </button>
                          <span
                            className={`min-w-[42px] text-center font-bold px-1.5 py-0.5 rounded text-xs ${
                              product.stock <= 0
                                ? 'bg-red-100 text-red-700'
                                : product.stock <= 5
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {product.stock}
                          </span>
                          <button
                            onClick={() => handleUpdateStock(product, +1)}
                            className="w-6 h-6 flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-700 rounded font-bold transition-colors cursor-pointer"
                            title="Add Quantity (+1)"
                          >
                            +
                          </button>
                          <button
                            onClick={() => {
                              const input = prompt(`Enter new stock quantity for "${product.name}":`, String(product.stock));
                              if (input !== null && !isNaN(Number(input))) {
                                handleSetStockDirectly(product, parseInt(input, 10));
                              }
                            }}
                            className="text-[10px] text-gray-400 hover:text-brand-red ml-1 underline cursor-pointer"
                            title="Set custom stock quantity"
                          >
                            edit
                          </button>
                        </div>
                        <p className="text-[9px] text-gray-400 mt-0.5">
                          {product.stock <= 0 ? 'Out of stock' : product.stock <= 5 ? 'Low stock' : 'In stock'}
                        </p>
                      </td>

                      {/* Badges */}
                      <td className="py-3.5 px-4">
                        {product.isNewArrival && (
                          <span className="px-2 py-0.5 text-[9px] font-bold uppercase rounded-xs bg-red-100 text-brand-red border border-red-200">
                            NEW ARRIVAL
                          </span>
                        )}
                        {product.isBestSeller && (
                          <span className="px-2 py-0.5 text-[9px] font-bold uppercase rounded-xs bg-yellow-100 text-yellow-800 border border-yellow-200 ml-1">
                            BEST SELLER
                          </span>
                        )}
                        {product.isLimitedEdition && (
                          <span className="px-2 py-0.5 text-[9px] font-bold uppercase rounded-xs bg-purple-100 text-purple-800 border border-purple-200 ml-1">
                            LIMITED
                          </span>
                        )}
                        {product.isPreOrder && (
                          <span className="px-2 py-0.5 text-[9px] font-bold uppercase rounded-xs bg-blue-100 text-blue-800 border border-blue-200 ml-1">
                            PRE-ORDER
                          </span>
                        )}
                        {!product.isNewArrival &&
                          !product.isBestSeller &&
                          !product.isLimitedEdition &&
                          !product.isPreOrder && (
                            <span className="text-[10px] text-gray-400">Standard Catalog</span>
                          )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/product/${product.slug}`}
                            target="_blank"
                            className="p-1.5 text-gray-400 hover:text-brand-red border border-gray-200 rounded-sm hover:border-brand-red transition-colors"
                            title="View Figure on Live Store"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                          <button
                            onClick={() => handleDeleteProduct(product)}
                            className="p-1.5 text-gray-400 hover:text-red-600 border border-gray-200 rounded-sm hover:border-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            title="Remove Product from Store Catalog"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ──────────────────────────────────────────────
          ADD NEW FIGURE MODAL
          ────────────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white rounded-lg shadow-2xl border border-gray-200 p-6 sm:p-8 my-8 text-gray-900 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-brand-red/10 text-brand-red flex items-center justify-center">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-heading text-xl font-bold uppercase tracking-wider text-gray-900">
                    Add New Anime Figure
                  </h2>
                  <p className="text-xs text-gray-500">
                    Upload/snap photo, set anime category, pricing, badges and stock
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-gray-400 hover:text-gray-700 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitNewProduct} className="space-y-5 text-xs">
              {/* Photo Upload & Camera Snapshot */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-800 mb-2">
                  1. Figure Photo / Image <span className="text-brand-red">*</span>
                </label>
                <div className="flex flex-col sm:flex-row gap-4 items-center">
                  {/* Photo Preview Box */}
                  <div className="w-32 h-36 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg relative overflow-hidden flex items-center justify-center flex-shrink-0">
                    {imagePreview || formImage ? (
                      <>
                        <img
                          src={imagePreview || formImage}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setImagePreview(null);
                            setFormImage('');
                          }}
                          className="absolute top-1 right-1 bg-black/70 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </>
                    ) : (
                      <div className="text-center p-2 text-gray-400">
                        <Camera className="w-6 h-6 mx-auto mb-1 text-gray-400" />
                        <span className="text-[10px]">No Photo</span>
                      </div>
                    )}
                  </div>

                  {/* Upload Actions */}
                  <div className="flex-1 space-y-2 w-full">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="btn-dark text-xs py-2 px-3.5 flex items-center gap-1.5 cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" /> Choose / Click Photo
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handlePhotoSelect}
                        className="hidden"
                      />
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Or paste direct image URL (e.g. https://... or /custom/...)"
                        value={formImage.startsWith('data:') ? '' : formImage}
                        onChange={(e) => {
                          setFormImage(e.target.value);
                          setImagePreview(e.target.value);
                        }}
                        className="w-full py-2 px-3 bg-gray-50 border border-gray-200 rounded text-xs focus:bg-white focus:border-brand-red outline-none"
                      />
                    </div>
                    <p className="text-[10px] text-gray-400">
                      Supports JPG, PNG, WEBP from your camera roll or direct web link.
                    </p>
                  </div>
                </div>
              </div>

              {/* Figure Title */}
              <div>
                <label className="block font-bold uppercase tracking-wider text-gray-800 mb-1">
                  2. Figure Name / Title <span className="text-brand-red">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sasuke Uchiha Rinnegan & Chidori 1/7 Scale Statue"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full py-2.5 px-3 bg-gray-50 border border-gray-200 rounded text-xs text-gray-900 focus:bg-white focus:border-brand-red outline-none font-medium"
                />
              </div>

              {/* Franchise & Character */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold uppercase tracking-wider text-gray-800 mb-1">
                    3. Anime Franchise <span className="text-brand-red">*</span>
                  </label>
                  <select
                    value={formAnime}
                    onChange={(e) => setFormAnime(e.target.value)}
                    className="w-full py-2 px-3 bg-gray-50 border border-gray-200 rounded text-xs focus:border-brand-red outline-none"
                  >
                    {EXISTING_ANIME.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                    <option value="OTHER">+ Add Custom Franchise...</option>
                  </select>
                  {formAnime === 'OTHER' && (
                    <input
                      type="text"
                      placeholder="Enter custom anime series..."
                      value={formCustomAnime}
                      onChange={(e) => setFormCustomAnime(e.target.value)}
                      className="w-full mt-2 py-1.5 px-3 bg-white border border-brand-red rounded text-xs outline-none"
                    />
                  )}
                </div>

                <div>
                  <label className="block font-bold uppercase tracking-wider text-gray-800 mb-1">
                    Character Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Sasuke Uchiha, Goku, Zoro"
                    value={formCharacter}
                    onChange={(e) => setFormCharacter(e.target.value)}
                    className="w-full py-2 px-3 bg-gray-50 border border-gray-200 rounded text-xs focus:border-brand-red outline-none"
                  />
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block font-bold uppercase tracking-wider text-gray-800 mb-1">
                  4. Figure Category
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full py-2 px-3 bg-gray-50 border border-gray-200 rounded text-xs focus:border-brand-red outline-none"
                >
                  {EXISTING_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Store Status / Badges Selection */}
              <div>
                <label className="block font-bold uppercase tracking-wider text-gray-800 mb-1.5">
                  5. Store Listing Status & Badges
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'standard', label: 'Already in Website', desc: 'Standard catalog listing' },
                    { id: 'new', label: 'New Arrival', desc: 'Featured in New Arrivals tab' },
                    { id: 'bestseller', label: 'Best Seller', desc: 'Top trending figures badge' },
                    { id: 'limited', label: 'Limited Edition', desc: 'Numbered collector edition' },
                    { id: 'preorder', label: 'Pre-Order', desc: 'Advance reservations badge' },
                  ].map((b) => (
                    <label
                      key={b.id}
                      className={`p-2.5 rounded border flex flex-col justify-between cursor-pointer transition-all ${
                        formBadge === b.id
                          ? 'border-brand-red bg-red-50 text-brand-red shadow-xs ring-1 ring-brand-red/30'
                          : 'border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-[11px]">{b.label}</span>
                        <input
                          type="radio"
                          name="badge"
                          checked={formBadge === b.id}
                          onChange={() => setFormBadge(b.id as any)}
                          className="accent-brand-red"
                        />
                      </div>
                      <span className="text-[10px] text-gray-500 leading-tight">{b.desc}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Pricing, Compare-at & Stock */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-gray-100">
                <div>
                  <label className="block font-bold uppercase tracking-wider text-gray-800 mb-1">
                    Selling Price (₹) <span className="text-brand-red">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="3499"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    className="w-full py-2 px-3 bg-gray-50 border border-gray-200 rounded text-xs font-bold text-gray-900 focus:bg-white focus:border-brand-red outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold uppercase tracking-wider text-gray-800 mb-1">
                    Compare At / MRP (₹)
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="4999"
                    value={formCompareAt}
                    onChange={(e) => setFormCompareAt(e.target.value)}
                    className="w-full py-2 px-3 bg-gray-50 border border-gray-200 rounded text-xs text-gray-600 focus:bg-white focus:border-brand-red outline-none"
                  />
                  {calculatedDiscount > 0 && (
                    <span className="text-[10px] text-green-600 font-bold mt-1 inline-block">
                      🔥 {calculatedDiscount}% OFF
                    </span>
                  )}
                </div>

                <div>
                  <label className="block font-bold uppercase tracking-wider text-gray-800 mb-1">
                    Initial Stock Units
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formStock}
                    onChange={(e) => setFormStock(e.target.value)}
                    className="w-full py-2 px-3 bg-gray-50 border border-gray-200 rounded text-xs text-gray-900 focus:bg-white focus:border-brand-red outline-none"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block font-bold uppercase tracking-wider text-gray-800 mb-1">
                  Product Description / Specifications
                </label>
                <textarea
                  rows={3}
                  placeholder="Official authentic collectible figure. High-grade PVC material, vivid paint finishing..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full py-2 px-3 bg-gray-50 border border-gray-200 rounded text-xs focus:bg-white focus:border-brand-red outline-none"
                />
              </div>

              {/* Form Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded border border-gray-200 text-gray-600 hover:bg-gray-50 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary py-2.5 px-6 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Saving Figure...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" /> Publish Figure to Catalog
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
