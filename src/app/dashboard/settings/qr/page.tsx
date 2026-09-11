import React from 'react';
import { RestaurantAdminService } from '@/lib/services/restaurant-admin-service';
import { QRManagerClient } from '@/components/dashboard/QRManagerClient';

export default async function RestaurantQRPage() {
  const { restaurant } = await RestaurantAdminService.getRestaurantDashboardStats();
  
  // Construct the absolute URL for the QR code
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  const host = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL || 'localhost:3000';
  const qrUrl = `${protocol}://${host}/q/${restaurant.slug}`;

  return (
    <QRManagerClient 
      restaurantName={restaurant.name} 
      qrUrl={qrUrl} 
    />
  );
}
