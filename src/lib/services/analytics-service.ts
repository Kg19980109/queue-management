import 'server-only';
import { createServerClient } from '@/lib/db/supabase/server';

export interface QueueMetricsSummary {
  total_joined: number;
  total_seated: number;
  total_dropped: number;
  avg_wait_time_seconds: number;
}

export interface HourlyQueueVolume {
  hour: string;
  count: number;
}

export interface CommerceMetricsSummary {
  total_orders: number;
  total_revenue: number;
}

export class AnalyticsService {
  /**
   * Get queue metrics summary for a given time range
   */
  static async getQueueMetricsSummary(
    restaurantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<QueueMetricsSummary> {
    const supabase = await createServerClient();

    const { data, error } = await supabase.rpc('get_queue_metrics_summary', {
      p_restaurant_id: restaurantId,
      p_start_date: startDate.toISOString(),
      p_end_date: endDate.toISOString(),
    });

    if (error) {
      console.error('Failed to get queue metrics summary:', error);
      throw new Error(`Analytics Error: ${error.message}`);
    }

    return data as unknown as QueueMetricsSummary;
  }

  /**
   * Get hourly queue volume for a specific time range
   */
  static async getHourlyQueueVolume(
    restaurantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<HourlyQueueVolume[]> {
    const supabase = await createServerClient();

    const { data, error } = await supabase.rpc('get_hourly_queue_volume', {
      p_restaurant_id: restaurantId,
      p_start_date: startDate.toISOString(),
      p_end_date: endDate.toISOString(),
    });

    if (error) {
      console.error('Failed to get hourly queue volume:', error);
      throw new Error(`Analytics Error: ${error.message}`);
    }

    return data as unknown as HourlyQueueVolume[];
  }

  /**
   * Get commerce metrics summary for a given time range
   */
  static async getCommerceMetricsSummary(
    restaurantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<CommerceMetricsSummary> {
    const supabase = await createServerClient();

    const { data, error } = await supabase.rpc('get_commerce_metrics_summary', {
      p_restaurant_id: restaurantId,
      p_start_date: startDate.toISOString(),
      p_end_date: endDate.toISOString(),
    });

    if (error) {
      console.error('Failed to get commerce metrics summary:', error);
      throw new Error(`Analytics Error: ${error.message}`);
    }

    return data as unknown as CommerceMetricsSummary;
  }
}
