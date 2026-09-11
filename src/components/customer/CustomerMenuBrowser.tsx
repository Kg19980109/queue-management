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
  currency = 'USD',
}: CustomerMenuBrowserProps) {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>(
    categories[0]?.id || ''
  );
  const [idempotencyKey] = useState<string>(
    () => `idemp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  );

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: 2,
    }).format(amount);
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
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-8 text-center space-y-2">
        <div className="text-3xl">🍽️</div>
        <p className="text-sm font-semibold text-slate-300">
          Menu is currently unavailable
        </p>
        <p className="text-xs text-slate-500">
          Please ask your server or check back later.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setActiveCategory(cat.id)}
            className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all ${
              activeCategory === cat.id
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                : 'bg-slate-900 text-slate-400 border border-slate-800 hover:border-slate-700'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Category Items List */}
      {categories
        .filter((cat) => !activeCategory || cat.id === activeCategory)
        .map((cat) => (
          <div key={cat.id} className="space-y-3">
            <div className="border-b border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-white tracking-wide">
                {cat.name}
              </h3>
              {cat.description && (
                <p className="text-xs text-slate-400 mt-0.5">
                  {cat.description}
                </p>
              )}
            </div>

            <div className="space-y-3">
              {cat.items.map((item) => {
                const inCart = cart.find((i) => i.menuItemId === item.id);

                return (
                  <div
                    key={item.id}
                    className={`bg-slate-900/80 border rounded-2xl p-4 flex items-center justify-between gap-4 transition-all ${
                      item.available
                        ? 'border-slate-800/80 hover:border-slate-700'
                        : 'border-slate-800/40 opacity-60'
                    }`}
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-white text-sm">
                          {item.name}
                        </h4>
                        {!item.available && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 border border-amber-500/30 text-amber-400">
                            Unavailable
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-xs text-slate-400 line-clamp-2">
                          {item.description}
                        </p>
                      )}
                      <div className="text-xs font-mono font-bold text-amber-400 pt-1">
                        {formatPrice(item.price)}
                      </div>
                    </div>

                    <div>
                      {!item.available ? (
                        <button
                          disabled
                          className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-500 text-xs font-bold cursor-not-allowed"
                        >
                          Out of Stock
                        </button>
                      ) : inCart ? (
                        <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl p-1">
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateQuantity(item.id, -1)
                            }
                            className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center"
                          >
                            -
                          </button>
                          <span className="text-xs font-mono font-bold text-white px-1">
                            {inCart.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateQuantity(item.id, 1)
                            }
                            className="w-7 h-7 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center"
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleAddToCart(item)}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 transition-all"
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
          <div className="bg-emerald-600 text-slate-950 rounded-2xl p-4 shadow-2xl flex items-center justify-between gap-4 border border-emerald-400/40 animate-in slide-in-from-bottom-4">
            <div>
              <div className="text-xs font-extrabold uppercase tracking-wider text-slate-950/80">
                {totalItemsCount} {totalItemsCount === 1 ? 'Item' : 'Items'} selected
              </div>
              <div className="text-base font-black font-mono">
                {formatPrice(cartSubtotal)}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="px-5 py-2.5 bg-slate-950 hover:bg-slate-900 text-emerald-400 text-xs font-bold rounded-xl shadow-lg transition-all"
            >
              View Cart & Order →
            </button>
          </div>
        </div>
      )}

      {/* Cart Drawer Slide-over Modal */}
      {isCartOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex justify-end">
          <div className="bg-slate-900 border-l border-slate-800 w-full max-w-md h-full flex flex-col justify-between p-6 space-y-6 shadow-2xl overflow-y-auto">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🛒</span>
                  <h3 className="text-lg font-bold text-white">Your Order</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCartOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center font-bold text-sm"
                >
                  ✕
                </button>
              </div>

              {errorMessage && (
                <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold p-3.5 rounded-2xl">
                  ⚠️ {errorMessage}
                </div>
              )}

              {/* Items List */}
              <div className="space-y-3">
                {cart.map((item) => (
                  <div
                    key={item.menuItemId}
                    className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex items-center justify-between gap-3"
                  >
                    <div className="space-y-1 flex-1">
                      <h4 className="font-bold text-white text-xs">
                        {item.name}
                      </h4>
                      <div className="text-xs font-mono text-amber-400">
                        {formatPrice(item.price)} × {item.quantity} ={' '}
                        {formatPrice(item.price * item.quantity)}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateQuantity(item.menuItemId, -1)
                        }
                        className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center"
                      >
                        -
                      </button>
                      <span className="text-xs font-mono font-bold text-white px-1">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateQuantity(item.menuItemId, 1)
                        }
                        className="w-7 h-7 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Cart Footer */}
            <div className="border-t border-slate-800 pt-4 space-y-4">
              <div className="space-y-1 text-xs">
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
                <div className="flex justify-between font-bold text-sm text-white pt-2 border-t border-slate-800">
                  <span>Total Amount</span>
                  <span className="font-mono text-emerald-400 text-base">
                    {formatPrice(cartSubtotal)}
                  </span>
                </div>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3 text-[11px] text-amber-300 leading-relaxed">
                ℹ️ <strong>Optional Order</strong>: Placing an order will send your food request to the kitchen. You remain in your current queue position!
              </div>

              <button
                type="button"
                onClick={handlePlaceOrder}
                disabled={isPending || cart.length === 0}
                className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-extrabold text-sm shadow-xl shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
              >
                {isPending ? 'Placing Order...' : 'Confirm & Place Order →'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
