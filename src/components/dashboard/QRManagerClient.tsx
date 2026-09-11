'use client';

import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

export function QRManagerClient({
  restaurantName,
  qrUrl,
}: {
  restaurantName: string;
  qrUrl: string;
}) {
  const [activeTab, setActiveTab] = useState('host-stand');
  const [aesthetic, setAesthetic] = useState<'dark' | 'light'>('dark');
  const [title, setTitle] = useState('Join the Digital Queue');
  const [showMonogram, setShowMonogram] = useState(true);
  const [showSmsCallout, setShowSmsCallout] = useState(true);
  const [highContrast, setHighContrast] = useState(true);

  // Deriving the preview styles based on aesthetic
  const isDark = aesthetic === 'dark';
  const previewOuterBg = isDark ? 'bg-[#0B101E]' : 'bg-surface-container-low';
  const previewInnerBg = isDark ? 'bg-[#151B2B]' : 'bg-white';
  const textColor = isDark ? 'text-white' : 'text-on-surface';
  const subtextColor = isDark ? 'text-slate-400' : 'text-on-surface-variant';
  const borderColor = isDark ? 'border-white/10' : 'border-outline-variant/50';

  const handleDownloadPNG = () => {
    // Basic implementation for downloading the QR part
    const canvas = document.querySelector('canvas');
    if (canvas) {
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `qr-code.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      alert("Please note: Full layout download requires a backend renderer. Downloading QR only.");
    }
  };

  return (
    <div className="flex flex-col w-full bg-surface-container-lowest min-h-screen text-on-surface antialiased p-space-xl gap-space-xl">
      
      {/* Header Section */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="font-headline-xl text-[28px] text-on-surface tracking-tight font-bold">QR Code Hub & Touchpoint Collateral</h1>
            <span className="px-2 py-1 rounded bg-indigo-50 text-indigo-600 border border-indigo-100 text-[11px] font-extrabold uppercase tracking-widest">CMYK Print Ready</span>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container-high text-on-surface font-headline-sm text-sm transition-colors border border-outline-variant/50 shadow-sm">
              <span className="material-symbols-outlined text-[18px]">download</span>
              <span>Bulk Export All (ZIP)</span>
            </button>
            <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-headline-sm text-sm transition-colors shadow-sm">
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span>New Touchpoint QR</span>
            </button>
          </div>
        </div>
        <p className="text-body-lg text-on-surface-variant max-w-3xl">
          Generate, customize, and track scan engagement across physical dining room touchpoints, host stands, table tents, and sidewalk displays.
        </p>
      </div>

      {/* Main Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: Collateral Preview & Export */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          
          {/* Tabs Navigation */}
          <div className="flex items-center gap-2 bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-2 shadow-sm overflow-x-auto">
            <button onClick={() => setActiveTab('host-stand')} className={`flex items-center justify-center flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all ${activeTab === 'host-stand' ? 'bg-[#0B101E] text-white shadow-md' : 'text-on-surface-variant hover:bg-surface-container-high'}`}>
              Host Stand Acrylic<br/><span className="text-[10px] font-medium opacity-70">(Selected)</span>
            </button>
            <button onClick={() => setActiveTab('table-tents')} className={`flex items-center justify-center flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all ${activeTab === 'table-tents' ? 'bg-[#0B101E] text-white shadow-md' : 'text-on-surface-variant hover:bg-surface-container-high'}`}>
              Table Tents<br/><span className="text-[10px] font-medium opacity-70">(T1-T28)</span>
            </button>
            <button onClick={() => setActiveTab('a-frame')} className={`flex items-center justify-center flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all ${activeTab === 'a-frame' ? 'bg-[#0B101E] text-white shadow-md' : 'text-on-surface-variant hover:bg-surface-container-high'}`}>
              Sidewalk A-<br/>Frame
            </button>
            <button onClick={() => setActiveTab('coasters')} className={`flex items-center justify-center flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all ${activeTab === 'coasters' ? 'bg-[#0B101E] text-white shadow-md' : 'text-on-surface-variant hover:bg-surface-container-high'}`}>
              Bar<br/>Coasters
            </button>
            <div className="flex items-center justify-center flex-1 py-3 px-4 border-l border-outline-variant/30">
               <div className="flex flex-col items-center gap-1">
                 <span className="flex items-center gap-1 text-[10px] font-bold text-on-surface uppercase tracking-wider"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span> 300 DPI</span>
                 <span className="text-[10px] text-on-surface-variant uppercase tracking-wider">Vector</span>
               </div>
            </div>
          </div>

          {/* Standee Preview Canvas */}
          <div className={`relative w-full rounded-[32px] p-8 flex flex-col items-center transition-colors duration-500 ${previewOuterBg} shadow-inner min-h-[700px]`}>
            <div className="absolute top-6 border border-white/20 rounded-full px-4 py-1 text-[10px] font-bold text-white/50 uppercase tracking-widest bg-white/5 backdrop-blur-sm">
              Front Standee Collateral Preview
            </div>

            {/* Inner Acrylic Card */}
            <div className={`mt-16 w-full max-w-[420px] rounded-[32px] p-10 flex flex-col items-center transition-colors duration-500 border shadow-2xl ${previewInnerBg} ${borderColor}`}>
               
               {/* Restaurant Brand */}
               <div className="flex items-center gap-2 mb-6">
                 <div className="w-6 h-6 rounded-md bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                   <span className="material-symbols-outlined text-[14px] text-white">local_fire_department</span>
                 </div>
                 <span className={`font-bold text-[13px] tracking-[0.2em] uppercase ${isDark ? 'text-amber-500' : 'text-primary'}`}>
                   {restaurantName}
                 </span>
               </div>

               <h2 className={`text-[28px] font-black text-center leading-tight mb-3 ${textColor}`}>
                 {title}
               </h2>
               
               <p className={`text-[13px] text-center mb-10 leading-relaxed font-medium ${subtextColor} max-w-[280px]`}>
                 Scan to take your turn ticket & browse tonight&apos;s specials while you wait.
               </p>

               {/* The QR Code Container */}
               <div className={`relative p-5 rounded-[24px] mb-8 ${isDark ? 'bg-white' : 'bg-surface-container-lowest border border-outline-variant/30 shadow-sm'}`}>
                 <QRCodeSVG 
                    value={qrUrl} 
                    size={200}
                    level={highContrast ? "H" : "M"}
                    includeMargin={false}
                    bgColor="#ffffff"
                    fgColor="#000000"
                 />
                 {/* Center Monogram (Optional) */}
                 {showMonogram && (
                   <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-black rounded-xl border-4 border-white flex items-center justify-center">
                     <span className="material-symbols-outlined text-white text-[20px]">swap_vert</span>
                   </div>
                 )}
               </div>

               {/* URL Pill */}
               <div className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-[11px] mb-12 truncate max-w-full">
                 <span className="material-symbols-outlined text-[14px]">link</span>
                 {qrUrl.replace('https://', '').replace('http://', '')}
               </div>

               {/* Features Footer */}
               <div className={`flex items-center justify-between w-full pt-6 border-t ${borderColor}`}>
                 <div className="flex flex-col items-center gap-1">
                   <span className="text-[11px] font-bold text-amber-500 flex items-center gap-0.5"><span className="material-symbols-outlined text-[12px]">bolt</span> No App</span>
                   <span className={`text-[10px] ${subtextColor}`}>Direct Web</span>
                 </div>
                 
                 {showSmsCallout && (
                   <div className="flex flex-col items-center gap-1 border-x px-6 border-white/10">
                     <span className="text-[11px] font-bold text-amber-500 flex items-center gap-0.5"><span className="material-symbols-outlined text-[12px]">notifications</span> SMS Alert</span>
                     <span className={`text-[10px] ${subtextColor}`}>Turn Buzzer</span>
                   </div>
                 )}

                 <div className="flex flex-col items-center gap-1">
                   <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-0.5"><span className="material-symbols-outlined text-[12px]">restaurant</span> Pre-Order</span>
                   <span className={`text-[10px] ${subtextColor}`}>Kitchen Fire</span>
                 </div>
               </div>
            </div>
            
            {/* Base shadow effect */}
            <div className="w-[300px] h-2 bg-black/40 blur-xl rounded-[100%] mt-8"></div>
          </div>

          {/* Export Action Row */}
          <div className="flex items-center gap-3 bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-2 shadow-sm">
            <button onClick={handleDownloadPNG} className="flex-1 flex justify-center items-center gap-2 py-3 px-4 rounded-xl bg-[#0B101E] hover:bg-black text-white font-bold text-sm transition-colors shadow-md">
              <span className="material-symbols-outlined text-[18px]">download</span>
              Download PNG (2400px)
            </button>
            <button className="flex-1 flex justify-center items-center gap-2 py-3 px-4 rounded-xl bg-surface-container-lowest hover:bg-surface-container-low text-on-surface font-bold text-sm transition-colors border border-outline-variant/50">
              <span className="material-symbols-outlined text-[18px]">print</span>
              Print PDF (300 DPI)
            </button>
            <button className="flex-1 flex justify-center items-center gap-2 py-3 px-4 rounded-xl bg-surface-container-lowest hover:bg-surface-container-low text-on-surface font-bold text-sm transition-colors border border-outline-variant/50">
              Vector SVG
            </button>
          </div>

        </div>

        {/* RIGHT COLUMN: Settings & Stats */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Customization & Brand Styling Panel */}
          <div className="bg-surface-container-lowest border border-outline-variant/50 rounded-2xl p-6 shadow-sm flex flex-col gap-8">
            <div className="flex items-center justify-between">
              <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">Customization & Brand Styling</h3>
              <button className="text-sm font-bold text-primary hover:underline">Reset Defaults</button>
            </div>

            {/* Collateral Aesthetic */}
            <div className="flex flex-col gap-3">
              <label className="text-[11px] font-extrabold text-on-surface-variant uppercase tracking-widest">Collateral Aesthetic</label>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setAesthetic('dark')}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all ${aesthetic === 'dark' ? 'border-primary bg-primary/5' : 'border-outline-variant/30 hover:border-outline-variant'}`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${aesthetic === 'dark' ? 'border-primary' : 'border-outline-variant'}`}>
                    {aesthetic === 'dark' && <div className="w-2 h-2 bg-primary rounded-full"></div>}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-sm text-on-surface">Fine Dining Dark</span>
                    <span className="text-[11px] text-on-surface-variant">Slate & Amber Accent</span>
                  </div>
                </button>
                <button 
                  onClick={() => setAesthetic('light')}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all ${aesthetic === 'light' ? 'border-primary bg-primary/5' : 'border-outline-variant/30 hover:border-outline-variant'}`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${aesthetic === 'light' ? 'border-primary' : 'border-outline-variant'}`}>
                    {aesthetic === 'light' && <div className="w-2 h-2 bg-primary rounded-full"></div>}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-sm text-on-surface">Crisp Minimalist</span>
                    <span className="text-[11px] text-on-surface-variant">Clean White Ceramic</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Destination Smart Route */}
            <div className="flex flex-col gap-3">
              <label className="text-[11px] font-extrabold text-on-surface-variant uppercase tracking-widest">Destination Smart Route</label>
              <div className="relative">
                <select className="w-full appearance-none bg-surface-container-low border border-outline-variant/50 text-on-surface text-sm rounded-xl px-4 py-3.5 focus:outline-none focus:border-primary font-medium">
                  <option>Smart Gateway: Waitlist + Pre-Order Menu</option>
                  <option>Direct to Pre-Order Menu Only</option>
                  <option>Static PDF Menu Link</option>
                </select>
                <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none">expand_more</span>
              </div>
            </div>

            {/* Primary Standee Title */}
            <div className="flex flex-col gap-3">
              <label className="text-[11px] font-extrabold text-on-surface-variant uppercase tracking-widest">Primary Standee Title</label>
              <input 
                type="text" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline-variant/50 text-on-surface text-sm rounded-xl px-4 py-3.5 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary font-medium"
              />
            </div>

            <div className="h-px bg-outline-variant/30 w-full"></div>

            {/* Toggles */}
            <div className="flex flex-col gap-5">
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-bold text-on-surface">Embed Restaurant Monogram</span>
                  <span className="text-xs text-on-surface-variant">Places center crest over QR payload</span>
                </div>
                <button 
                  onClick={() => setShowMonogram(!showMonogram)}
                  className={`w-12 h-7 rounded-full transition-colors relative flex items-center px-1 ${showMonogram ? 'bg-primary' : 'bg-surface-container-highest'}`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white transition-transform ${showMonogram ? 'translate-x-5' : 'translate-x-0'}`}></div>
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-bold text-on-surface">Show SMS Turn Buzzer Callout</span>
                  <span className="text-xs text-on-surface-variant">Reassures guests they can wander around</span>
                </div>
                <button 
                  onClick={() => setShowSmsCallout(!showSmsCallout)}
                  className={`w-12 h-7 rounded-full transition-colors relative flex items-center px-1 ${showSmsCallout ? 'bg-primary' : 'bg-surface-container-highest'}`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white transition-transform ${showSmsCallout ? 'translate-x-5' : 'translate-x-0'}`}></div>
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-bold text-on-surface">High-Contrast Error Correction (Level H)</span>
                  <span className="text-xs text-on-surface-variant">Guarantees scans in low candlelight dining rooms</span>
                </div>
                <button 
                  onClick={() => setHighContrast(!highContrast)}
                  className={`w-12 h-7 rounded-full transition-colors relative flex items-center px-1 ${highContrast ? 'bg-primary' : 'bg-surface-container-highest'}`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white transition-transform ${highContrast ? 'translate-x-5' : 'translate-x-0'}`}></div>
                </button>
              </div>
            </div>

          </div>

          {/* Live Touchpoint Performance Widget */}
          <div className="bg-[#0B101E] rounded-2xl p-6 shadow-xl flex flex-col gap-6 relative overflow-hidden text-white border border-white/5">
            <div className="flex items-center justify-between relative z-10">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Live Touchpoint Performance</span>
                <span className="text-xl font-bold text-white">Standee Conversion Today</span>
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/20">
                +24% vs Yesterday
              </span>
            </div>

            <div className="grid grid-cols-3 gap-4 relative z-10 pt-2 pb-4 border-b border-white/10">
              <div className="flex flex-col gap-1">
                <span className="text-3xl font-black text-white tracking-tight">1,482</span>
                <span className="text-xs text-slate-400">Total Scans</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-3xl font-black text-emerald-400 tracking-tight">84.6%</span>
                <span className="text-xs text-slate-400">Joined Waitlist</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-3xl font-black text-amber-500 tracking-tight">38.2%</span>
                <span className="text-xs text-slate-400">Pre-Ordered</span>
              </div>
            </div>

            <div className="flex items-center justify-between relative z-10 text-xs font-medium text-slate-300">
              <span>Peak Rush: <strong className="text-white">7:30 PM - 9:00 PM</strong></span>
              <span>Avg Scan-to-Seat: <strong className="text-white">18 min</strong></span>
            </div>

            {/* Decorative background flare */}
            <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-emerald-500/10 blur-[80px] rounded-full pointer-events-none"></div>
          </div>

        </div>

      </div>
    </div>
  );
}
