'use client';

import React, { useState, useTransition, useEffect } from 'react';
import { createCustomerOrderAction } from '@/app/dashboard/actions';
import { useRouter } from 'next/navigation';

export interface CustomerMenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  available: boolean;
  imageUrl?: string | null;
  /** Kitchen prep estimate in minutes (authoritative; display only). */
  preparationTimeMinutes?: number | null;
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
  /** Server-resolved queue status for CALLED-aware browsing cues (4H). */
  queueStatus?: string | null;
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
  queueStatus,
}: CustomerMenuBrowserProps) {
  const router = useRouter();
  // Phase 4G: cart survives menu ↔ ticket navigation via sessionStorage.
  // Stored: ONLY non-sensitive cart lines (ids, display names/prices,
  // quantities, notes). NEVER queue/order tokens, cookies, or secrets —
  // those stay in props/cookies. Server revalidates price + availability.
  const cartKey = `qf_cart_${restaurantSlug}`;
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      if (typeof window === 'undefined') return [];
      const raw = window.sessionStorage.getItem(cartKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as CartItem[];
      if (!Array.isArray(parsed)) return [];
      const validIds = new Set(categories.flatMap((c) => c.items.map((i) => i.id)));
      return parsed
        .filter((l) => l && validIds.has(l.menuItemId) && Number.isInteger(l.quantity) && l.quantity > 0 && l.quantity <= 99)
        .map((l) => ({
          menuItemId: l.menuItemId,
          name: String(l.name || '').slice(0, 120),
          price: Number(l.price) || 0,
          quantity: l.quantity,
          notes: typeof l.notes === 'string' ? l.notes.slice(0, 200) : undefined,
        }));
    } catch {
      return [];
    }
  });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<CustomerMenuItem | null>(null);
  const [detailQty, setDetailQty] = useState(1);
  const [detailNotes, setDetailNotes] = useState('');
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

  // Persist non-sensitive cart lines only (see note above).
  useEffect(() => {
    try {
      window.sessionStorage.setItem(cartKey, JSON.stringify(cart));
    } catch {
      // Storage full/blocked: cart simply stays in memory for this visit.
    }
  }, [cart, cartKey]);

  // Escape closes topmost sheet first (detail, then cart).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (detailItem) setDetailItem(null);
      else if (isCartOpen) setIsCartOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [detailItem, isCartOpen]);

  const openDetail = (item: CustomerMenuItem) => {
    const inCart = cart.find((i) => i.menuItemId === item.id);
    setDetailQty(inCart?.quantity || 1);
    setDetailNotes(inCart?.notes || '');
    setDetailItem(item);
  };

  const confirmDetailAdd = () => {
    if (!detailItem || !detailItem.available) return;
    const qty = Math.min(99, Math.max(1, detailQty));
    const notes = detailNotes.trim().slice(0, 200) || undefined;
    setCart((prev) => {
      const existing = prev.find((i) => i.menuItemId === detailItem.id);
      if (existing) {
        return prev.map((i) =>
          i.menuItemId === detailItem.id ? { ...i, quantity: qty, notes } : i
        );
      }
      return [...prev, { menuItemId: detailItem.id, name: detailItem.name, price: detailItem.price, quantity: qty, notes }];
    });
    setDetailItem(null);
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
          // Order placed: drop the persisted cart (fresh lines only, no tokens stored).
          try { window.sessionStorage.removeItem(cartKey); } catch {}
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
      {/* Phase 4H: a CALLED customer browsing the menu gets one dominant,
          honest instruction — return first, browse later. No duplicate
          urgency banners; the ticket hero remains the authority. */}
      {queueStatus === 'CALLED' && queueToken && (
        <a
          href={`/q/${restaurantSlug}/status/${queueToken}`}
          className="flex items-center gap-3 rounded-3xl border border-sky-400/30 bg-sky-500/10 p-4 shadow-lg transition-all hover:bg-sky-500/15 active:scale-[0.99]"
        >
          <span aria-hidden="true" className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75 motion-safe:animate-ping" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-sky-400" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-black text-white">Your turn is here — please return 📢</span>
            <span className="block text-[11px] font-semibold text-sky-200/90">Tap to open your ticket · ordering can wait</span>
          </span>
          <span aria-hidden="true" className="shrink-0 text-sky-300">→</span>
        </a>
      )}
      {/* Search + Category Tabs */}
      <div className="space-y-3">
        <div className="relative group">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-orange-400 transition-colors text-[20px]">search</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 Search biryani, pizza, desserts…"
            aria-label="Search dishes"
            className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.05] pl-10 pr-4 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:border-orange-400/50 focus:ring-2 focus:ring-orange-500/20 transition-all"
          />
          {q && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label="Clear search"
              className="absolute right-1 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center"
            >
              <span className="w-7 h-7 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors">
                <span className="material-symbols-outlined text-[16px]">close</span>
              </span>
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
                          : 'opacity-75'
                      }`}
                      style={{animationDelay:`${idx*40}ms`}}
                    >
                      <button
                        type="button"
                        onClick={() => openDetail(item)}
                        aria-label={`View details for ${item.name}, ${formatPrice(item.price)}${item.available ? '' : ', currently unavailable'}`}
                        className="flex min-w-0 flex-1 items-center gap-3 text-left active:scale-[0.99]"
                      >
                      <div className="flex h-18 min-h-[72px] w-18 min-w-[72px] shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500/25 via-amber-500/10 to-emerald-500/10 text-3xl">
                        {item.imageUrl ? (<img src={item.imageUrl} alt="" className="w-full h-full object-cover" loading="lazy" />) : (<span aria-hidden="true">🍽️</span>)}
                      </div>
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-black text-white text-[14px] leading-tight line-clamp-1 flex-1">
                            {item.name}
                          </h4>
                          {!item.available && (
                            <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-500/15 border border-slate-400/30 text-slate-300 uppercase tracking-wider">
                              Unavailable
                            </span>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
                            {item.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 pt-0.5">
                          <span className="text-[15px] font-black text-emerald-300">
                            {formatPrice(item.price)}
                          </span>
                          {typeof item.preparationTimeMinutes === 'number' && item.preparationTimeMinutes > 0 && (
                            <span className="text-[10px] font-bold text-slate-400">⏱ ~{item.preparationTimeMinutes} min</span>
                          )}
                        </div>
                      </div>
                      </button>

                    <div>
                      {!item.available ? (
                        <button
                          type="button"
                          onClick={() => openDetail(item)}
                          className="px-4 py-2 rounded-xl bg-slate-800 text-slate-400 text-xs font-bold uppercase tracking-wider border border-white/5"
                        >
                          Unavailable
                        </button>
                      ) : inCart ? (
                        <div className="flex items-center gap-3 bg-black/40 border border-white/10 rounded-xl p-1 shadow-inner">
                          <button
                            type="button"
                            aria-label={`Remove one ${item.name} from cart`}
                            onClick={() =>
                              handleUpdateQuantity(item.id, -1)
                            }
                            className="relative w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm flex items-center justify-center transition-colors before:absolute before:-inset-2 before:content-['']"
                          >
                            -
                          </button>
                          <span className="text-sm font-mono font-bold text-white px-1" aria-live="polite">
                            {inCart.quantity}
                          </span>
                          <button
                            type="button"
                            aria-label={`Add one more ${item.name} to cart`}
                            onClick={() =>
                              handleUpdateQuantity(item.id, 1)
                            }
                            className="relative w-8 h-8 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm flex items-center justify-center transition-colors shadow-[0_0_10px_rgba(16,185,129,0.3)] before:absolute before:-inset-2 before:content-['']"
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          aria-label={`Add ${item.name} to cart`}
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

      {/* Floating Cart Sticky Bottom Bar (rises above the ticket float) */}
      {totalItemsCount > 0 && (
        <div className="fixed bottom-4 left-4 right-4 max-w-md mx-auto z-50">
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
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Your order, ${totalItemsCount} items, total ${formatPrice(cartSubtotal)}`}
            className="bg-slate-900 border-l border-white/10 w-full max-w-md h-full flex flex-col justify-between p-6 space-y-6 shadow-2xl overflow-y-auto animate-in slide-in-from-right"
          >
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
                  aria-label="Close cart"
                  onClick={() => setIsCartOpen(false)}
                  className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center font-bold text-sm transition-colors border border-white/5"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              {/* Queue context: ordering never strands the ticket. Solid pill
                  reads in both color schemes (translucent emerald washes out
                  on light cards). */}
              {queueStatus === 'CALLED' && queueToken ? (
                <a
                  href={`/q/${restaurantSlug}/status/${queueToken}`}
                  className="flex items-center gap-2 rounded-2xl border border-sky-400/30 bg-sky-500/15 px-4 py-3 shadow-lg"
                >
                  <span aria-hidden="true" className="relative flex h-2.5 w-2.5 shrink-0">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-sky-400" />
                  </span>
                  <span className="text-xs font-black text-white">
                    Your turn is here — return first 📢
                  </span>
                  <span className="ml-auto shrink-0 text-xs font-black text-sky-300">
                    My ticket →
                  </span>
                </a>
              ) : queueToken ? (
                <a
                  href={`/q/${restaurantSlug}/status/${queueToken}`}
                  className="flex items-center justify-between gap-2 rounded-2xl bg-emerald-600 px-4 py-3 shadow-lg transition-all hover:bg-emerald-500 active:scale-[0.99]"
                >
                  <span className="text-xs font-bold text-white">
                    🎟️ Ordering while you wait — spot saved
                  </span>
                  <span className="shrink-0 text-xs font-black text-white">
                    My ticket →
                  </span>
                </a>
              ) : (
                <p className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-[11px] leading-relaxed text-slate-400">
                  💡 Browsing as a guest — join the queue from the restaurant page to link your order to a ticket.
                </p>
              )}

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
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <h4 className="font-bold text-white text-sm">
                        {item.name}
                      </h4>
                      {item.notes && (
                        <p className="text-[11px] italic text-slate-400 line-clamp-2">“{item.notes}”</p>
                      )}
                      <div className="text-xs font-mono text-emerald-400 font-bold">
                        {formatPrice(item.price)} × {item.quantity} ={' '}
                        {formatPrice(item.price * item.quantity)}
                      </div>
                      <p className="text-[10px] text-slate-500">Final price confirmed by the restaurant at checkout.</p>
                    </div>

                    <div className="flex items-center gap-3 bg-black/40 border border-white/10 rounded-xl p-1">
                      <button
                        type="button"
                        aria-label={`Remove one ${item.name} from cart`}
                        onClick={() =>
                          handleUpdateQuantity(item.menuItemId, -1)
                        }
                        className="relative w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm flex items-center justify-center transition-colors before:absolute before:-inset-2 before:content-['']"
                      >
                        -
                      </button>
                      <span className="text-sm font-mono font-bold text-white px-1" aria-live="polite">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        aria-label={`Add one more ${item.name} to cart`}
                        onClick={() =>
                          handleUpdateQuantity(item.menuItemId, 1)
                        }
                        className="relative w-8 h-8 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm flex items-center justify-center transition-colors shadow-[0_0_10px_rgba(16,185,129,0.3)] before:absolute before:-inset-2 before:content-['']"
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

      {/* Item detail sheet: bigger look, prep estimate, quantity + notes.
          Presentation only — price/availability revalidated server-side. */}
      {detailItem && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[60] flex items-end sm:items-center justify-center animate-in fade-in sm:p-4"
          onClick={() => { if (!isPending) setDetailItem(null); }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Details for ${detailItem.name}`}
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-white/10 w-full max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom max-h-[92dvh] overflow-y-auto"
          >
            <div className="relative h-52 bg-gradient-to-br from-orange-500/25 via-amber-500/10 to-emerald-500/10 flex items-center justify-center">
              {detailItem.imageUrl ? (
                <img src={detailItem.imageUrl} alt={detailItem.name} className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <span aria-hidden="true" className="text-7xl">🍽️</span>
              )}
              <button
                type="button"
                aria-label="Close item details"
                onClick={() => setDetailItem(null)}
                className="absolute top-3 right-3 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center border border-white/10"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
              {!detailItem.available && (
                <span className="absolute bottom-3 left-4 px-3 py-1 rounded-full text-[11px] font-black bg-slate-900/80 border border-slate-400/30 text-slate-200 uppercase tracking-wider">
                  Currently unavailable
                </span>
              )}
            </div>

            <div className="p-5 space-y-4">
              <div>
                <h3 className="text-xl font-black text-white tracking-tight">{detailItem.name}</h3>
                {detailItem.description && (
                  <p className="mt-1 text-[13px] leading-relaxed text-slate-300">{detailItem.description}</p>
                )}
                <div className="mt-2 flex items-center gap-3">
                  <span className="text-xl font-black text-emerald-400">{formatPrice(detailItem.price)}</span>
                  {typeof detailItem.preparationTimeMinutes === 'number' && detailItem.preparationTimeMinutes > 0 && (
                    <span className="text-[11px] font-bold text-slate-400">⏱ Ready in ~{detailItem.preparationTimeMinutes} min</span>
                  )}
                </div>
                <p className="mt-1 text-[10px] text-slate-500">Price confirmed by the restaurant when you order.</p>
              </div>

              <div>
                <label htmlFor="detail-qty" className="block text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2">
                  Quantity
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    aria-label={`Decrease quantity of ${detailItem.name}`}
                    onClick={() => setDetailQty((q) => Math.max(1, q - 1))}
                    className="w-11 h-11 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-black text-lg flex items-center justify-center transition-colors"
                  >
                    −
                  </button>
                  <span id="detail-qty" aria-live="polite" className="w-10 text-center font-mono text-xl font-black text-white">
                    {detailQty}
                  </span>
                  <button
                    type="button"
                    aria-label={`Increase quantity of ${detailItem.name}`}
                    onClick={() => setDetailQty((q) => Math.min(99, q + 1))}
                    className="w-11 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-lg flex items-center justify-center transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="detail-notes" className="block text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2">
                  Special instructions <span className="font-semibold normal-case text-slate-500">(optional)</span>
                </label>
                <textarea
                  id="detail-notes"
                  value={detailNotes}
                  onChange={(e) => setDetailNotes(e.target.value.slice(0, 200))}
                  maxLength={200}
                  rows={2}
                  placeholder="e.g. less spicy, no onion…"
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-orange-400/50 focus:ring-2 focus:ring-orange-500/20"
                />
              </div>

              <button
                type="button"
                onClick={confirmDetailAdd}
                disabled={!detailItem.available}
                className="qf-cta w-full py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:brightness-110 disabled:opacity-40 disabled:saturate-50 text-white font-black text-sm shadow-lg transition-all uppercase tracking-wider active:scale-[0.99]"
              >
                {detailItem.available
                  ? `Add ${detailQty} to cart · ${formatPrice(detailItem.price * detailQty)}`
                  : 'Unavailable right now'}
              </button>
              {!detailItem.available && (
                <p className="text-center text-[11px] text-slate-400">
                  The kitchen will mark it available again soon — the restaurant confirms availability when you order.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
