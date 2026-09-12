'use client';

import React, { useState, useTransition } from 'react';
import { createCustomerOrderAction } from '@/app/dashboard/actions';
import { useRouter } from 'next/navigation';

export interface CustomerMenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  available: boolean;
  imageUrl?: string | null;
}

export interface CustomerMenuCategory {
  id: string;
  name: string;
  description: string | null;
  items: CustomerMenuItem[];
}

interface CartItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
}

interface CustomerMenuBrowserProps {
  categories: CustomerMenuCategory[];
  restaurantId: string;
  restaurantSlug: string;
  queueEntryId?: string | null;
  tableId?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  currency?: string;
}

export function CustomerMenuBrowser({
  categories,
  restaurantId,
  restaurantSlug,
  queueEntryId,
  tableId,
  customerName,
  customerPhone,
  currency = 'INR',
}: CustomerMenuBrowserProps) {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>(
    categories[0]?.id || ''
  );
  const [search, setSearch] = useState('');
  const [idempotencyKey] = useState<string>(
    () => `idemp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  );

  const locale = currency === 'INR' ? 'en-IN' : 'en-US';
  const formatPrice = (amount: number) => {
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency || 'INR',
        maximumFractionDigits: 2,
      }).format(amount);
    } catch {
      return `₹${amount.toFixed(2)}`;
    }
  };

  const handleAddToCart = (item: CustomerMenuItem) => {
    if (!item.available) return;
    setCart((prev) => {
      const existing = prev.find((i) => i.menuItemId === item.id);
      if (existing) {
        return prev.map((i) =>
          i.menuItemId === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          menuItemId: item.id,
          name: item.name,
          price: item.price,
          quantity: 1,
        },
      ];
    });
  };

  const handleUpdateQuantity = (menuItemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.menuItemId === menuItemId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter((item): item is CartItem => item !== null)
    );
  };

  const totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartSubtotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const handlePlaceOrder = () => {
    if (cart.length === 0 || isPending) return;
    setErrorMessage(null);

    startTransition(async () => {
      try {
        const result = await createCustomerOrderAction({
          restaurantId,
          customerName: customerName || 'Guest Customer',
          customerPhone,
          queueEntryId,
          tableId,
          idempotencyKey,
          items: cart.map((i) => ({
            menuItemId: i.menuItemId,
            quantity: i.quantity,
            notes: i.notes || null,
          })),
        });

        if (result && result.rawToken) {
          router.push(`/q/${restaurantSlug}/order/${result.rawToken}`);
        } else {
          setErrorMessage('Could not place order. Please try again.');
        }
      } catch (err: unknown) {
        setErrorMessage(
          err instanceof Error ? err.message : 'Failed to place order.'
        );
      }
    });
  };

  if (!categories || categories.length === 0) {
    return (
      <div className="bg-slate-900/60 border border-white/5 rounded-3xl p-12 text-center space-y-3 backdrop-blur-md">
        <div className="text-4xl">🍽️</div>
        <p className="text-sm font-bold text-slate-300">
          Menu is currently unavailable
        </p>
        <p className="text-xs text-slate-500">
          Please ask your server or check back later.
        </p>
      </div>
    );
  }

  const q = search.trim().toLowerCase();
  const filteredCategories = categories
    .filter((cat) => !activeCategory || cat.id === activeCategory)
    .map((cat) => ({
      ...cat,
      items: q ? cat.items.filter((it) => it.name.toLowerCase().includes(q) || (it.description && it.description.toLowerCase().includes(q))) : cat.items,
    }))
    .filter((cat) => cat.items.length > 0);

  return (
    <div className="space-y-5 pb-28">
      {/* Search + Category Tabs */}
      <div className="space-y-3">
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-[18px]">search</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search dishes..."
            className="w-full h-11 pl-10 pr-4 rounded-2xl bg-slate-900 border border-white/10 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30"
          />
          {q && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 hide-scrollbar">
          <button
            type="button"
            onClick={() => setActiveCategory('')}
            className={`px-4 h-9 rounded-full text-xs font-black whitespace-nowrap transition-all uppercase tracking-wider shrink-0 border ${!activeCategory ? 'bg-white text-slate-900 border-white shadow-md' : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'}`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 h-9 rounded-full text-xs font-black whitespace-nowrap transition-all uppercase tracking-wider shrink-0 border ${
                activeCategory === cat.id
                  ? 'bg-emerald-500 text-slate-950 border-emerald-500 shadow-md'
                  : 'bg-white/5 text-slate-400 border-white/10 hover:border-white/20 hover:bg-white/10'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Category Items List - polished cards with image */}
      {filteredCategories.length === 0 ? (
        <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-10 text-center">
          <span className="material-symbols-outlined text-[32px] text-slate-500">search_off</span>
          <p className="text-sm font-bold text-white mt-2">No dishes found</p>
          <p className="text-xs text-slate-500 mt-1">Try another keyword or category</p>
          {q && <button onClick={()=>{setSearch(''); setActiveCategory('');}} className="mt-3 text-xs font-bold text-emerald-400 hover:text-emerald-300">Clear filters</button>}
        </div>
      ) : filteredCategories.map((cat) => (
          <div key={cat.id} className="space-y-3">
            <div className="flex items-center gap-2 border-b border-white/5 pb-2">
              <h3 className="text-[11px] font-black text-emerald-400 uppercase tracking-widest">
                {cat.name}
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-400 font-bold">{cat.items.length}</span>
            </div>

            <div className="space-y-3">
              {cat.items.map((item) => {
                const inCart = cart.find((i) => i.menuItemId === item.id);

                return (
                    <div
                      key={item.id}
                      className={`bg-slate-900 border rounded-2xl p-3 sm:p-4 flex gap-3 transition-all ${
                        item.available
                          ? 'border-white/10 hover:border-white/15 hover:shadow-md'
                          : 'border-white/5 opacity-60'
                      }`}
                    >
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-slate-800 border border-white/5 shrink-0 flex items-center justify-center">
                        {item.imageUrl ? (<img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" loading="lazy" />) : (<span className="material-symbols-outlined text-slate-600 text-[28px]">lunch_dining</span>)}
                      </div>
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-bold text-white text-[14px] leading-tight line-clamp-1 flex-1">
                            {item.name}
                          </h4>
                          {!item.available && (
                            <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 border border-amber-500/30 text-amber-400 uppercase tracking-wider">
                              Sold Out
                            </span>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                            {item.description}
                          </p>
                        )}
                        <div className="text-[13px] font-black text-white pt-1">
                          {formatPrice(item.price)}
                        </div>
                      </div>

                    <div>
                      {!item.available ? (
                        <button
                          disabled
                          className="px-4 py-2 rounded-xl bg-slate-800 text-slate-500 text-xs font-bold cursor-not-allowed uppercase tracking-wider"
                        >
                          Out of Stock
                        </button>
                      ) : inCart ? (
                        <div className="flex items-center gap-3 bg-black/40 border border-white/10 rounded-xl p-1 shadow-inner">
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateQuantity(item.id, -1)
                            }
                            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm flex items-center justify-center transition-colors"
                          >
                            -
                          </button>
                          <span className="text-sm font-mono font-bold text-white px-1">
                            {inCart.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateQuantity(item.id, 1)
                            }
                            className="w-8 h-8 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm flex items-center justify-center transition-colors shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleAddToCart(item)}
                          className="px-5 py-2.5 rounded-xl bg-primary/90 hover:bg-primary text-white text-xs font-bold shadow-[0_0_15px_rgba(37,99,235,0.3)] hover:shadow-[0_0_20px_rgba(37,99,235,0.5)] transition-all uppercase tracking-wider"
                        >
                          + Add
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

      {/* Floating Cart Sticky Bottom Bar */}
      {totalItemsCount > 0 && (
        <div className="fixed bottom-4 left-4 right-4 max-w-md mx-auto z-40">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-500 text-slate-950 rounded-2xl p-4 shadow-[0_10px_40px_rgba(16,185,129,0.3)] flex items-center justify-between gap-4 border border-emerald-400/40 animate-in slide-in-from-bottom-4">
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-950/70">
                {totalItemsCount} {totalItemsCount === 1 ? 'Item' : 'Items'} selected
              </div>
              <div className="text-xl font-black font-mono">
                {formatPrice(cartSubtotal)}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="px-6 py-3 bg-slate-950 hover:bg-slate-900 text-emerald-400 text-xs font-bold rounded-xl shadow-lg transition-all flex items-center gap-2"
            >
              <span>View Cart & Order</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          </div>
        </div>
      )}

      {/* Cart Drawer Slide-over Modal */}
      {isCartOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex justify-end animate-in fade-in">
          <div className="bg-slate-900 border-l border-white/10 w-full max-w-md h-full flex flex-col justify-between p-6 space-y-6 shadow-2xl overflow-y-auto animate-in slide-in-from-right">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                    <span className="material-symbols-outlined text-[20px]">shopping_cart</span>
                  </div>
                  <h3 className="text-xl font-bold text-white tracking-tight">Your Order</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCartOpen(false)}
                  className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center font-bold text-sm transition-colors border border-white/5"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              {errorMessage && (
                <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold p-4 rounded-2xl flex items-center gap-3">
                  <span className="material-symbols-outlined text-[18px]">error</span>
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Items List */}
              <div className="space-y-3">
                {cart.map((item) => (
                  <div
                    key={item.menuItemId}
                    className="bg-black/20 border border-white/5 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-inner"
                  >
                    <div className="space-y-1.5 flex-1">
                      <h4 className="font-bold text-white text-sm">
                        {item.name}
                      </h4>
                      <div className="text-xs font-mono text-emerald-400 font-bold">
                        {formatPrice(item.price)} × {item.quantity} ={' '}
                        {formatPrice(item.price * item.quantity)}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 bg-black/40 border border-white/10 rounded-xl p-1">
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateQuantity(item.menuItemId, -1)
                        }
                        className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm flex items-center justify-center transition-colors"
                      >
                        -
                      </button>
                      <span className="text-sm font-mono font-bold text-white px-1">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateQuantity(item.menuItemId, 1)
                        }
                        className="w-8 h-8 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm flex items-center justify-center transition-colors shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Cart Footer */}
            <div className="border-t border-white/5 pt-6 space-y-6 mt-auto">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal</span>
                  <span className="font-mono text-white">
                    {formatPrice(cartSubtotal)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Taxes & Fees</span>
                  <span className="font-mono text-white">{formatPrice(0)}</span>
                </div>
                <div className="flex justify-between font-black text-white pt-3 border-t border-white/5">
                  <span>Total Amount</span>
                  <span className="font-mono text-emerald-400 text-xl">
                    {formatPrice(cartSubtotal)}
                  </span>
                </div>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex gap-3">
                <span className="material-symbols-outlined text-[20px] text-amber-400 shrink-0">info</span>
                <span className="text-[11px] text-amber-300/80 leading-relaxed font-medium">
                  <strong>Optional Order</strong>: Placing an order will send your food request to the kitchen. You remain in your current queue position!
                </span>
              </div>

              <button
                type="button"
                onClick={handlePlaceOrder}
                disabled={isPending || cart.length === 0}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 disabled:opacity-50 text-slate-950 font-black text-sm shadow-[0_10px_30px_rgba(16,185,129,0.3)] transition-all flex items-center justify-center gap-2 uppercase tracking-wider"
              >
                {isPending ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    Placing Order...
                  </span>
                ) : (
                  <>
                    <span>Confirm & Place Order</span>
                    <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
