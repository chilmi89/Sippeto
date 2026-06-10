"use client";

import React, { useState } from 'react';
import { Sparkles, ArrowUpRight, TrendingUp } from 'lucide-react';

export const WelcomeSection = ({ theme = 'dark' }: { theme?: 'light' | 'dark' }) => {
  const isLight = theme === 'light';
  
  const [activeTab, setActiveTab] = useState<'7d' | '30d'>('7d');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Data finansial untuk grafik area
  const data7d = [
    { label: 'Sen', value: 'Rp 12.4M', growth: '+10.2%', x: 10, y: 100 },
    { label: 'Sel', value: 'Rp 18.5M', growth: '+12.5%', x: 55, y: 85 },
    { label: 'Rab', value: 'Rp 28.1M', growth: '+15.8%', x: 100, y: 90 },
    { label: 'Kam', value: 'Rp 39.3M', growth: '+18.1%', x: 145, y: 65 },
    { label: 'Jum', value: 'Rp 52.8M', growth: '+22.4%', x: 190, y: 45 },
    { label: 'Sab', value: 'Rp 68.4M', growth: '+25.0%', x: 235, y: 55 },
    { label: 'Min', value: 'Rp 82.5M', growth: '+28.4%', x: 280, y: 20 },
  ];

  const data30d = [
    { label: 'W1', value: 'Rp 92.5M', growth: '+12.4%', x: 10, y: 90 },
    { label: 'W2', value: 'Rp 148.0M', growth: '+16.8%', x: 100, y: 70 },
    { label: 'W3', value: 'Rp 225.5M', growth: '+21.5%', x: 190, y: 40 },
    { label: 'W4', value: 'Rp 310.2M', growth: '+28.4%', x: 280, y: 15 },
  ];

  const activeData = activeTab === '7d' ? data7d : data30d;
  
  // Default values ketika cursor tidak mengarah ke titik mana pun
  const defaultValue = activeTab === '7d' ? 'Rp 82.5M' : 'Rp 310.2M';
  const defaultGrowth = '+28.4%';

  // Menentukan nilai yang ditampilkan berdasarkan state hover
  const currentVal = hoveredIdx !== null ? activeData[hoveredIdx].value : defaultValue;
  const currentGrowth = hoveredIdx !== null ? activeData[hoveredIdx].growth : defaultGrowth;

  // Handler untuk mengkalkulasi titik terdekat pada SVG saat kursor digerakkan
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left; // Posisi X kursor di dalam elemen SVG
    const width = rect.width;
    
    const numPoints = activeData.length;
    const step = width / (numPoints - 1);
    let nearestIdx = Math.round(x / step);
    
    if (nearestIdx < 0) nearestIdx = 0;
    if (nearestIdx >= numPoints) nearestIdx = numPoints - 1;
    
    setHoveredIdx(nearestIdx);
  };

  // SVG Paths
  const linePath7d = "M 10 100 C 32.5 92.5, 32.5 85, 55 85 C 77.5 85, 77.5 90, 100 90 C 122.5 90, 122.5 65, 145 65 C 167.5 65, 167.5 45, 190 45 C 212.5 45, 212.5 55, 235 55 C 257.5 55, 257.5 20, 280 20";
  const areaPath7d = `${linePath7d} L 280 120 L 10 120 Z`;

  const linePath30d = "M 10 90 C 55 80, 55 70, 100 70 C 145 70, 145 40, 190 40 C 235 40, 235 15, 280 15";
  const areaPath30d = `${linePath30d} L 280 120 L 10 120 Z`;

  const activeLinePath = activeTab === '7d' ? linePath7d : linePath30d;
  const activeAreaPath = activeTab === '7d' ? areaPath7d : areaPath30d;

  return (
    <div className={`hidden lg:flex flex-col space-y-6 animate-in fade-in slide-in-from-left duration-1000 ${isLight ? 'text-slate-800' : 'text-white'}`}>
      <div className="space-y-3">
        <h1 className="text-4xl xl:text-5xl font-black leading-[1.1] tracking-tight">
          Selamat Datang <br /> di <span className={isLight ? 'text-primary' : 'text-white drop-shadow-md'}>SIPPETO</span> 🚀
        </h1>
        <p className={`text-sm xl:text-base font-medium leading-relaxed max-w-md ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>
          Sistem Pencatatan Penjualan TOYORESMI
        </p>
        <p className={`text-sm xl:text-base font-medium leading-relaxed max-w-md ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>
          Solusi modern untuk manajemen dan pertumbuhan bisnis lokal Anda di Desa Toyoresmi
        </p>
      </div>

      <div className="relative w-full max-w-[340px] xl:max-w-[380px] aspect-square lg:aspect-[4/3] group pt-4 select-none">
        {/* Main Glass Card */}
        <div className={`absolute inset-0 backdrop-blur-3xl rounded-[2.5rem] border shadow-2xl p-6 xl:p-8 flex flex-col space-y-6 animate-float ring-1 transition-all duration-500 ${
          isLight 
            ? 'bg-white/85 border-slate-200/60 shadow-slate-200/50 ring-slate-100' 
            : 'bg-slate-950/65 border-white/15 shadow-2xl ring-white/10'
        }`}>
          {/* Header Info */}
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <p className={`text-[9px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${
                hoveredIdx !== null ? 'text-emerald-400' : (isLight ? 'text-slate-400' : 'text-white/40')
              }`}>
                {hoveredIdx !== null ? `Sales (${activeData[hoveredIdx].label})` : 'Sales Growth'}
              </p>
              <div className="flex items-baseline gap-2">
                <h3 className={`text-3xl font-black tracking-tighter transition-all duration-150 ${isLight ? 'text-slate-800' : 'text-white'}`}>
                  {currentVal}
                </h3>
                <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-0.5 transition-all duration-150">
                  <ArrowUpRight className="w-3 h-3" />
                  {currentGrowth}
                </span>
              </div>
            </div>

            {/* Interactive Tab Toggle */}
            <div className="flex bg-slate-900/40 p-1 rounded-xl border border-white/5 text-[9px] font-bold relative z-30">
              <button 
                onClick={() => { setActiveTab('7d'); setHoveredIdx(null); }}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${activeTab === '7d' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'}`}
              >
                7 Hari
              </button>
              <button 
                onClick={() => { setActiveTab('30d'); setHoveredIdx(null); }}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${activeTab === '30d' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'}`}
              >
                30 Hari
              </button>
            </div>
          </div>

          {/* Area Line Chart SVG */}
          <div className="flex-1 relative flex flex-col justify-end w-full group/chart pt-2">
            
            {/* SVG Canvas */}
            <svg 
              viewBox="0 0 290 120" 
              className="w-full h-[90%] overflow-visible cursor-crosshair z-20"
              onMouseMove={handleMouseMove}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              <defs>
                {/* Area Gradient */}
                <linearGradient id="chartAreaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.00" />
                </linearGradient>
                {/* Glow Filter */}
                <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#10b981" floodOpacity="0.5" />
                </filter>
              </defs>

              {/* Grid Lines */}
              <line x1="10" y1="20" x2="280" y2="20" stroke="currentColor" className="opacity-[0.05]" strokeDasharray="3 3" />
              <line x1="10" y1="60" x2="280" y2="60" stroke="currentColor" className="opacity-[0.05]" strokeDasharray="3 3" />
              <line x1="10" y1="100" x2="280" y2="100" stroke="currentColor" className="opacity-[0.05]" strokeDasharray="3 3" />

              {/* Area Under the Curve */}
              <path 
                d={activeAreaPath} 
                fill="url(#chartAreaGradient)" 
                className="transition-all duration-700 ease-in-out" 
              />

              {/* Glowing Line Path */}
              <path 
                d={activeLinePath} 
                fill="none" 
                stroke="#10b981" 
                strokeWidth="3.5" 
                strokeLinecap="round" 
                filter="url(#neonGlow)"
                className="transition-all duration-700 ease-in-out"
              />

              {/* Anchor Dots for all points */}
              {activeData.map((item, idx) => (
                <circle 
                  key={idx} 
                  cx={item.x} 
                  cy={item.y} 
                  r="3.5" 
                  fill={isLight ? "#0f172a" : "#ffffff"} 
                  className={`opacity-35 transition-all duration-300 ${hoveredIdx === idx ? 'scale-150 opacity-0' : ''}`}
                />
              ))}

              {/* Hover Interactions & Vertical Crosshair Line */}
              {hoveredIdx !== null && (
                <>
                  {/* Vertical Guide Line */}
                  <line 
                    x1={activeData[hoveredIdx].x} 
                    y1="10" 
                    x2={activeData[hoveredIdx].x} 
                    y2="110" 
                    stroke="#10b981" 
                    strokeWidth="1.5" 
                    strokeDasharray="3 3" 
                    className="opacity-60" 
                  />
                  {/* Glowing Active Dot */}
                  <circle 
                    cx={activeData[hoveredIdx].x} 
                    cy={activeData[hoveredIdx].y} 
                    r="6.5" 
                    fill="#ffffff" 
                    stroke="#10b981" 
                    strokeWidth="3"
                    className="filter drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]"
                  />
                  <circle 
                    cx={activeData[hoveredIdx].x} 
                    cy={activeData[hoveredIdx].y} 
                    r="12" 
                    fill="#10b981" 
                    fillOpacity="0.25" 
                    className="animate-ping pointer-events-none" 
                  />
                </>
              )}
            </svg>

            {/* X-Axis Labels */}
            <div className="flex justify-between w-full px-2.5 pt-2 border-t border-white/5 mt-1">
              {activeData.map((item, idx) => (
                <span 
                  key={idx} 
                  className={`text-[9px] font-black tracking-tighter uppercase transition-colors duration-200 ${
                    hoveredIdx === idx 
                      ? 'text-emerald-400 font-bold scale-105' 
                      : (isLight ? 'text-slate-400' : 'text-white/30')
                  }`}
                >
                  {item.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Small Floating Card: Volatility */}
        <div className={`absolute -top-4 -right-4 w-32 h-20 backdrop-blur-2xl rounded-2xl border shadow-xl p-4 flex flex-col justify-center animate-float [animation-delay:2s] ring-1 transition-all duration-500 ${
          isLight 
            ? 'bg-white/80 border-slate-200/60 ring-slate-100 text-slate-800' 
            : 'bg-slate-950/75 border-white/15 ring-white/10 text-white'
        }`}>
          <p className={`text-[9px] font-bold uppercase tracking-widest ${isLight ? 'text-slate-400' : 'text-white/40'}`}>Volatility</p>
          <div className="flex items-center gap-2">
            <p className="text-lg font-black text-rose-500">Low</p>
            <div className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.7)] animate-pulse" />
          </div>
        </div>

        {/* Small Floating Card: Progress */}
        <div className={`absolute -bottom-2 -left-6 w-38 h-16 backdrop-blur-2xl rounded-2xl border shadow-xl p-3 flex flex-col justify-between animate-float [animation-delay:4s] ring-1 transition-all duration-500 ${
          isLight 
            ? 'bg-white/80 border-slate-200/60 ring-slate-100' 
            : 'bg-slate-950/75 border-white/15 ring-white/10'
        }`}>
          <div className={`flex justify-between items-center text-[8px] font-black uppercase ${isLight ? 'text-slate-400' : 'text-white/40'}`}>
            <span>Profit Margin</span>
            <span className="text-emerald-400">22%</span>
          </div>
          <div className={`w-full h-1.5 rounded-full overflow-hidden border ${isLight ? 'bg-slate-100 border-slate-200/40' : 'bg-slate-900/50 border-white/5'}`}>
            <div className="h-full w-[72%] bg-gradient-to-r from-emerald-500 to-cyan-300 rounded-full shadow-[0_0_10px_rgba(52,211,153,0.3)] animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
};
