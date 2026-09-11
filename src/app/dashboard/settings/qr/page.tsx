import React from 'react';
import { RestaurantAdminService } from '@/lib/services/restaurant-admin-service';
import { QRCodeSVG } from 'qrcode.react';

export default async function RestaurantQRPage() {
  const { restaurant } = await RestaurantAdminService.getRestaurantDashboardStats();
  
  // Construct the absolute URL for the QR code
  // Assuming the app is hosted on the Vercel URL or fallback to localhost in dev
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  const host = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL || 'localhost:3000';
  const qrUrl = `${protocol}://${host}/q/${restaurant.slug}`;

  return (
    <div className="max-w-2xl mx-auto space-y-6 pt-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">QR Code Generator</h1>
          <p className="text-sm text-slate-400 mt-1">
            Print this QR code and place it on tables or at the host stand. Customers can scan it to join the digital queue and browse the menu.
          </p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-10 flex flex-col items-center justify-center space-y-8 shadow-2xl">
        <div className="bg-white p-6 rounded-3xl shadow-inner print:shadow-none">
          <QRCodeSVG 
            value={qrUrl} 
            size={250}
            level="H"
            includeMargin={true}
            bgColor="#ffffff"
            fgColor="#020617" // slate-950
          />
        </div>

        <div className="text-center space-y-2 max-w-sm">
          <h2 className="text-xl font-bold text-white">{restaurant.name}</h2>
          <p className="text-xs font-mono text-emerald-400 break-all bg-slate-950 p-2 rounded-lg border border-slate-800">
            {qrUrl}
          </p>
        </div>

        <div className="pt-4 flex gap-4 w-full max-w-sm">
          <button 
            type="button"
            className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm rounded-xl transition-all"
            // This button works better in a client component, but we can use a simple JS script tag
            // or just render a client component wrapper. For simplicity, we can do it inline or add a client script.
          >
            Download PNG
          </button>
          <button 
            type="button"
            className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-emerald-500/20"
          >
            Print QR Code
          </button>
        </div>

        {/* Client script to handle print and download */}
        <script dangerouslySetInnerHTML={{
          __html: `
            document.querySelectorAll('button').forEach(btn => {
              if(btn.textContent === 'Print QR Code') {
                btn.onclick = () => window.print();
              }
              if(btn.textContent === 'Download PNG') {
                btn.onclick = () => {
                  const canvas = document.querySelector('canvas');
                  if(canvas) {
                    const url = canvas.toDataURL('image/png');
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = '${restaurant.slug}-qrcode.png';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                  }
                };
              }
            });
          `
        }} />
      </div>

      {/* Print-specific styles hidden on screen */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @media print {
            body * { visibility: hidden; }
            .bg-slate-900, .bg-slate-900 * { visibility: visible; }
            .bg-slate-900 { 
              position: absolute; 
              left: 0; 
              top: 0; 
              width: 100%;
              background: transparent !important;
              border: none !important;
              box-shadow: none !important;
            }
            button, .text-slate-400 { display: none !important; }
            .text-white { color: black !important; }
          }
        `
      }} />
    </div>
  );
}
