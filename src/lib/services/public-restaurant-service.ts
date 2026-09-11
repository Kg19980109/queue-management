import { createAdminClient } from '@/lib/db/supabase/admin';

export interface PublicRestaurantInfo {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  logoUrl: string | null;
  queueEnabled: boolean;
  maxQueueCapacity: number;
  minPartySize: number;
  maxPartySize: number;
  callTimeoutMinutes: number;
  status: string;
}

export class PublicRestaurantService {
  /**
   * Resolves public restaurant information by slug for customer QR flows.
   */
  static async getPublicRestaurantBySlug(slug: string): Promise<PublicRestaurantInfo | null> {
    if (!slug) return null;

    const supabase = createAdminClient();

    const { data: restaurant, error } = await supabase
      .from('restaurants')
      .select('id, name, slug, description, phone, address, city, logo_url, queue_enabled, max_queue_capacity, min_party_size, max_party_size, call_timeout_minutes, status')
      .eq('slug', slug.trim().toLowerCase())
      .eq('status', 'ACTIVE')
      .maybeSingle();

    if (error || !restaurant) {
      return null;
    }

    return {
      id: restaurant.id,
      name: restaurant.name,
      slug: restaurant.slug,
      description: restaurant.description,
      phone: restaurant.phone,
      address: restaurant.address,
      city: restaurant.city,
      logoUrl: restaurant.logo_url,
      queueEnabled: restaurant.queue_enabled,
      maxQueueCapacity: restaurant.max_queue_capacity,
      minPartySize: restaurant.min_party_size,
      maxPartySize: restaurant.max_party_size,
      callTimeoutMinutes: restaurant.call_timeout_minutes,
      status: restaurant.status,
    };
  }

  /**
   * Fetches active menu items for public customer preview while waiting.
   */
  static async getPublicMenuPreview(restaurantId: string) {
    const supabase = createAdminClient();

    // Fetch active categories
    const { data: categories, error: catError } = await supabase
      .from('menu_categories')
      .select('id, name, description, sort_order')
      .eq('restaurant_id', restaurantId)
      .eq('active', true)
      .eq('is_archived', false)
      .order('sort_order', { ascending: true });

    if (catError || !categories) return [];

    // Fetch active menu items
    const { data: items, error: itemError } = await supabase
      .from('menu_items')
      .select('id, category_id, name, description, price, available')
      .eq('restaurant_id', restaurantId)
      .eq('is_archived', false)
      .order('name', { ascending: true });

    if (itemError || !items) return [];

    // Group items by category
    return categories.map((cat) => ({
      ...cat,
      items: items.filter((item) => item.category_id === cat.id && item.available),
    })).filter((cat) => cat.items.length > 0);
  }
}
