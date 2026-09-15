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
  /** Validated queue bearer token — forwarded so order creation is authorized. */
  queueToken?: string | null;
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
  queueToken,
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
          queueToken,
          items: cart.map((i) => ({
            menuItemId: i.menuItemId,
            quantity: i.quantity,
            notes: i.notes || null,
          })),
        });

        if (result && result.rawToken) {
          // Preserve the queue ticket across the order-confirmation page so
          // "Back to My Ticket" never strands the customer on the join form.
          const suffix = queueToken ? `?qtoken=${encodeURIComponent(queueToken)}` : '';
          router.push(`/q/${restaurantSlug}/order/${result.rawToken}${suffix}`);
        } else if (result && result.order && queueToken) {
          // Idempotent replay: the order token is not recoverable from
          // storage (raw tokens are never persisted), so return to the
          // queue ticket instead of stranding the customer.
          router.push(`/q/${restaurantSlug}/status/${queueToken}`);
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
    <div className="space-y-5 pb-32">
      {/* Search + Category Tabs */}
      <div className="space-y-3">
        <div className="relative group">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-orange-400 transition-colors text-[20px]">search</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 Search biryani, pizza, desserts…"
            className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.05] pl-10 pr-4 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:border-orange-400/50 focus:ring-2 focus:ring-orange-500/20 transition-all"
          />
          {q && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors">
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 hide-scrollbar">
          <button
            type="button"
            onClick={() => setActiveCategory('')}
            className={`h-10 px-4 rounded-full text-xs font-black whitespace-nowrap transition-all uppercase tracking-wider shrink-0 border ${!activeCategory ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white border-transparent shadow-lg shadow-orange-500/25' : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'}`}
          >
            ✨ All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`h-10 px-4 rounded-full text-xs font-black whitespace-nowrap transition-all uppercase tracking-wider shrink-0 border ${
                activeCategory === cat.id
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white border-transparent shadow-lg shadow-orange-500/25'
                  : 'bg-white/5 text-slate-300 border-white/10 hover:border-white/20 hover:bg-white/10'
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
            <div className="flex items-center gap-2 border-b border-white/10 pb-2">
              <h3 className="text-xs font-black text-orange-300 uppercase tracking-widest">
                {cat.name}
              </h3>
              <span className="rounded-full bg-orange-500/15 border border-orange-400/20 px-2 py-0.5 text-[10px] text-orange-200 font-black">{cat.items.length}</span>
            </div>

            <div className="space-y-3">
              {cat.items.map((item, idx) => {
                const inCart = cart.find((i) => i.menuItemId === item.id);

                return (
                    <div
                      key={item.id}
                      className={`qf-card rounded-3xl p-3 flex gap-3 transition-all animate-staggerIn hover:scale-[1.01] ${
                        item.available
                          ? 'hover:border-orange-400/30'
                          : 'opacity-60'
                      }`}
                      style={{animationDelay:`${idx*40}ms`}}
                    >
                      <div className="flex h-18 min-h-[72px] w-18 min-w-[72px] shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500/25 via-amber-500/10 to-emerald-500/10 text-3xl">
                        {item.imageUrl ? (<img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" loading="lazy" />) : (<span aria-hidden="true">🍽️</span>)}
                      </div>
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-black text-white text-[14px] leading-tight line-clamp-1 flex-1">
                            {item.name}
                          </h4>
                          {!item.available && (
                            <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/15 border border-amber-400/30 text-amber-300 uppercase tracking-wider">
                              Sold out
                            </span>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
                            {item.description}
                          </p>
                        )}
                        <div className="text-[15px] font-black text-emerald-300 pt-0.5">
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
                          className="qf-cta px-5 py-2.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:brightness-110 text-white text-xs font-black shadow-lg shadow-orange-500/25 transition-all uppercase tracking-wider active:scale-95"
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
          <div className="rounded-3xl bg-gradient-to-r from-orange-500 via-amber-500 to-emerald-500 p-[1.5px] shadow-[0_10px_40px_rgba(249,115,22,0.35)] animate-in slide-in-from-bottom-4">
          <div className="flex items-center justify-between gap-4 rounded-3xl bg-[#141b2e]/95 p-4 backdrop-blur">
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-orange-300">
                🛒 {totalItemsCount} {totalItemsCount === 1 ? 'Item' : 'Items'} selected
              </div>
              <div className="font-mono text-2xl font-black text-white">
                {formatPrice(cartSubtotal)}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="qf-cta px-6 py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:brightness-110 text-white text-xs font-black shadow-lg transition-all flex items-center gap-2 active:scale-95"
            >
              <span>View Cart & Order</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          </div>
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
