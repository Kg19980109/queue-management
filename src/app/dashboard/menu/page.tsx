import React from 'react';
import { MenuService } from '@/lib/services/menu-service';
import { InventoryService } from '@/lib/services/inventory-service';
import { RecipeService } from '@/lib/services/recipe-service';
import {
  createCategoryFormAction,
  updateCategoryStatusAction,
  createMenuItemFormAction,
  updateMenuItemAvailabilityAction,
  archiveMenuItemAction,
  addIngredientFormAction,
  removeIngredientAction,
} from '@/app/dashboard/actions';

export default async function MenuManagementPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    category?: string;
    showArchived?: string;
    recipeUpdated?: string;
  }>;
}) {
  const params = await searchParams;
  const searchTerm = params.search || '';
  const selectedCategory = params.category || '';
  const includeArchived = params.showArchived === 'true';

  const [{ categories }, { items, total }, { items: inventoryItems }] = await Promise.all([
    MenuService.listCategories(),
    MenuService.listMenuItems({
      search: searchTerm,
      categoryId: selectedCategory || undefined,
      includeArchived,
      limit: 100,
    }),
    InventoryService.listInventoryItems({ limit: 100, activeOnly: true }),
  ]);

  // If recipe updated param is present, fetch ingredients for that menu item
  let selectedRecipeItem: { id: string; name: string } | null = null;
  let recipeIngredients: { id: string; inventoryItemName: string; unit: string; quantityRequired: number }[] = [];

  if (params.recipeUpdated) {
    try {
      const recipeData = await RecipeService.listIngredients(params.recipeUpdated);
      selectedRecipeItem = recipeData.menuItem;
      recipeIngredients = recipeData.ingredients;
    } catch {
      // Ignored if invalid ID
    }
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Menu Management</h1>
          <p className="text-sm text-slate-400">
            Configure menu categories, items, pricing, availability, and ingredient linkages.
          </p>
        </div>
      </div>

      {/* CATEGORIES SECTION */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Menu Categories ({categories.length})</h2>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className={`p-4 rounded-xl border transition-colors flex items-center justify-between ${
                cat.active
                  ? 'bg-slate-900/80 border-slate-800'
                  : 'bg-slate-950/40 border-slate-900 opacity-60'
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-slate-200">{cat.name}</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                      cat.active
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {cat.active ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </div>
                {cat.description && (
                  <p className="text-xs text-slate-400 mt-1 line-clamp-1">{cat.description}</p>
                )}
                <div className="text-[11px] text-slate-500 mt-1">
                  {cat.itemCount} menu item{cat.itemCount !== 1 ? 's' : ''}
                </div>
              </div>

              <form action={updateCategoryStatusAction.bind(null, cat.id, !cat.active)}>
                <button
                  type="submit"
                  className={`text-xs px-2.5 py-1 rounded font-medium transition-colors ${
                    cat.active
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20'
                      : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20'
                  }`}
                >
                  {cat.active ? 'Deactivate' : 'Activate'}
                </button>
              </form>
            </div>
          ))}
        </div>

        {/* Add Category Form Inline */}
        <details className="mt-4 border-t border-slate-800 pt-4">
          <summary className="text-xs font-semibold text-emerald-400 cursor-pointer hover:underline">
            + Add New Category
          </summary>
          <form action={createCategoryFormAction} className="mt-3 flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Category Name</label>
              <input
                type="text"
                name="name"
                required
                placeholder="e.g. Starters, Main Course"
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Description (Optional)</label>
              <input
                type="text"
                name="description"
                placeholder="Short description"
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Sort Order</label>
              <input
                type="number"
                name="sortOrder"
                defaultValue="0"
                min="0"
                className="w-20 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium px-4 py-1.5 rounded-lg transition-colors"
            >
              Save Category
            </button>
          </form>
        </details>
      </div>

      {/* MENU ITEMS SECTION */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h2 className="text-lg font-semibold text-white">Menu Items ({total})</h2>

          {/* Search & Category Filter */}
          <form method="GET" className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              name="search"
              defaultValue={searchTerm}
              placeholder="Search items..."
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            />
            <select
              name="category"
              defaultValue={selectedCategory}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3 py-1.5 rounded-lg transition-colors"
            >
              Filter
            </button>
          </form>
        </div>

        {/* Menu Items Table */}
        <div className="overflow-x-auto border border-slate-800 rounded-xl">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="p-3">Item Name</th>
                <th className="p-3">Category</th>
                <th className="p-3">Price</th>
                <th className="p-3">Availability</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-500">
                    No menu items found matching the current filters.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3 font-medium text-white">
                      <div>{item.name}</div>
                      {item.description && (
                        <div className="text-[11px] text-slate-400">{item.description}</div>
                      )}
                    </td>
                    <td className="p-3 text-slate-300">{item.categoryName}</td>
                    <td className="p-3 font-mono font-semibold text-emerald-400">
                      ${item.price.toFixed(2)}
                    </td>
                    <td className="p-3">
                      <form action={updateMenuItemAvailabilityAction.bind(null, item.id, !item.available)}>
                        <button
                          type="submit"
                          className={`px-2 py-0.5 text-[10px] rounded font-semibold transition-colors ${
                            item.available
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {item.available ? 'AVAILABLE' : 'OUT OF STOCK'}
                        </button>
                      </form>
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 text-[10px] rounded font-mono ${
                          item.isArchived
                            ? 'bg-slate-800 text-slate-500'
                            : item.active
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-amber-500/10 text-amber-400'
                        }`}
                      >
                        {item.isArchived ? 'ARCHIVED' : item.active ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>
                    <td className="p-3 text-right space-x-2">
                      <a
                        href={`/dashboard/menu?recipeUpdated=${item.id}`}
                        className="text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded transition-colors"
                      >
                        Recipe
                      </a>
                      {!item.isArchived && (
                        <form
                          action={archiveMenuItemAction.bind(null, item.id)}
                          className="inline-block"
                        >
                          <button
                            type="submit"
                            className="text-[11px] bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-1 rounded transition-colors"
                          >
                            Archive
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Add Menu Item Form */}
        <details className="border-t border-slate-800 pt-4">
          <summary className="text-xs font-semibold text-emerald-400 cursor-pointer hover:underline">
            + Create New Menu Item
          </summary>
          <form action={createMenuItemFormAction} className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Item Name</label>
              <input
                type="text"
                name="name"
                required
                placeholder="e.g. Chicken Biryani"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Category</label>
              <select
                name="categoryId"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="">Unassigned</option>
                {categories
                  .filter((c) => c.active)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Price ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                name="price"
                required
                placeholder="25.00"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Preparation Time (minutes)</label>
              <input
                type="number"
                name="preparationTimeMinutes"
                defaultValue="15"
                min="0"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs text-slate-400 mb-1">Description</label>
              <textarea
                name="description"
                rows={2}
                placeholder="Dish summary or ingredient highlights"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="sm:col-span-2 flex justify-end">
              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-6 py-2 rounded-lg transition-colors"
              >
                Create Menu Item
              </button>
            </div>
          </form>
        </details>
      </div>

      {/* RECIPE INGREDIENT MAPPING SECTION (IF ITEM SELECTED) */}
      {selectedRecipeItem && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">
                Recipe Ingredients for {selectedRecipeItem.name}
              </h2>
              <p className="text-xs text-slate-400">
                Link active inventory items required to prepare one unit of this dish.
              </p>
            </div>
            <a
              href="/dashboard/menu"
              className="text-xs text-slate-400 hover:text-white"
            >
              Close
            </a>
          </div>

          <div className="space-y-2">
            {recipeIngredients.map((ing) => (
              <div
                key={ing.id}
                className="p-3 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-semibold text-white">{ing.inventoryItemName}</span>
                  <span className="text-slate-400 ml-2">
                    ({ing.quantityRequired} {ing.unit})
                  </span>
                </div>
                <form action={removeIngredientAction.bind(null, ing.id, selectedRecipeItem!.id)}>
                  <button
                    type="submit"
                    className="text-[11px] text-red-400 hover:underline"
                  >
                    Remove
                  </button>
                </form>
              </div>
            ))}
          </div>

          {/* Add Ingredient Form */}
          <form action={addIngredientFormAction} className="flex flex-wrap gap-3 items-end pt-2">
            <input type="hidden" name="menuItemId" value={selectedRecipeItem.id} />
            <div>
              <label className="block text-xs text-slate-400 mb-1">Inventory Ingredient</label>
              <select
                name="inventoryItemId"
                required
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="">Select ingredient...</option>
                {inventoryItems.map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.name} ({inv.unit})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Quantity Required</label>
              <input
                type="number"
                step="0.001"
                min="0.001"
                name="quantityRequired"
                required
                placeholder="e.g. 0.15"
                className="w-28 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-1.5 rounded-lg transition-colors"
            >
              Link Ingredient
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
