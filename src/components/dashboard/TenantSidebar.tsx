"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebar } from "@/lib/context/SidebarContext";
import {
  LayoutDashboard,
  Store,
  Package,
  ShoppingCart,
  BarChart3,
  UserCircle,
  Settings,
  HelpCircle,
  X,
  History,
  Receipt,
  ChevronDown,
  Sliders
} from "lucide-react";

type NavItem = {
  icon: any;
  label: string;
  href: string;
  permission?: string;
  subItems?: { label: string; href: string }[];
};

const tenantNavItems: NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/backend/tenant" },
  { 
    icon: ShoppingCart, 
    label: "POS Kasir (Penjualan)", 
    href: "/backend/tenant/sales",
    subItems: [
      { label: "Buka Kasir", href: "/backend/tenant/sales" },
      { label: "Riwayat Penjualan", href: "/backend/tenant/sales/history" },
    ]
  },
  { icon: Package, label: "Kelola Produk", href: "/backend/tenant/products", permission: "kelola_produk" },
  { icon: Sliders, label: "Kelola Stok", href: "/backend/tenant/stocks", permission: "kelola_stok" },
  { icon: Store, label: "Kelola Cabang", href: "/backend/tenant/branches", permission: "kelola_cabang" },
  { icon: Receipt, label: "Catatan Transaksi", href: "/backend/tenant/transactions" },
  { icon: History, label: "Riwayat & Kelola", href: "/backend/tenant/transactions/history" },
  { 
    icon: BarChart3, 
    label: "Statistik Penjualan", 
    href: "/backend/tenant/reports",
    subItems: [
      { label: "Laporan Harian", href: "/backend/tenant/reports/daily" },
      { label: "Laporan Mingguan", href: "/backend/tenant/reports/weekly" },
      { label: "Laporan Bulanan", href: "/backend/tenant/reports/monthly" },
      { label: "Laporan Tahunan", href: "/backend/tenant/reports/yearly" },
    ]
  },
  { icon: UserCircle, label: "Profil UMKM", href: "/backend/tenant/profile" },
];

export const TenantSidebar = () => {
  const pathname = usePathname();
  const { isOpen, closeSidebar } = useSidebar();
  const [mounted, setMounted] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const [userBranchId, setUserBranchId] = useState<string | null>(null);
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [loadingPermissions, setLoadingPermissions] = useState(true);

  useEffect(() => {
    setMounted(true);
    // Fetch user profile to check branch_id and permissions
    fetch("/api/auth/me")
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) {
          if (data.branch_id) {
            setUserBranchId(data.branch_id);
          }
          if (data.permissions) {
            setUserPermissions(data.permissions);
          }
        }
        setLoadingPermissions(false);
      })
      .catch(() => {
        setLoadingPermissions(false);
      });

    // Auto-tutup sub-menu jika berpindah ke halaman menu utama (tidak terkait)
    const activeItem = tenantNavItems.find(item => item.subItems && pathname.startsWith(item.href));
    if (activeItem) {
      setExpandedMenus([activeItem.label]);
    } else {
      setExpandedMenus([]);
    }
  }, [pathname]);

  const toggleMenu = (label: string) => {
    // Menggunakan gaya Accordion: Jika satu dibuka, yang lain ditutup otomatis.
    // Jika diklik yang sama, akan tertutup.
    setExpandedMenus(prev => prev.includes(label) ? [] : [label]);
  };

  if (!mounted) return null;

  return (
    <>
      <div 
        className={`fixed inset-0 bg-[#030037]/20 backdrop-blur-sm z-[50] lg:hidden transition-opacity duration-300 pointer-events-none ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0"
        }`}
        onClick={closeSidebar}
      />

      <aside 
        className={`fixed inset-y-0 left-0 w-72 h-full bg-[#030037] text-white flex flex-col p-6 z-[60] transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between mb-10 pt-2 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary rounded-xl">
               <Store className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tightest font-heading uppercase italic">SiPetto</h1>
              <p className="text-[8px] font-black text-white/30 uppercase tracking-[0.3em] mt-1 font-sans leading-none">
                Tenant Portal
              </p>
            </div>
          </div>
          <button 
            onClick={closeSidebar}
            className="p-2 lg:hidden hover:bg-white/10 rounded-xl transition-colors"
          >
            <X className="w-5 h-5 text-white/40" />
          </button>
        </div>

        <nav className="flex-1 space-y-1.5 overflow-y-auto overflow-x-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {tenantNavItems
            .filter((item) => {
              if (userBranchId && item.href === "/backend/tenant/branches") {
                return false;
              }
              if (item.permission && !loadingPermissions) {
                return userPermissions.includes(item.permission);
              }
              return true;
            })
            .map((item) => {
            const isActive = pathname === item.href || (!!item.subItems && pathname.startsWith(item.href) && pathname !== item.href);
            const hasSubItems = !!item.subItems;
            const isExpanded = expandedMenus.includes(item.label);
            
            return (
              <div key={item.label} className="relative">
                {hasSubItems ? (
                  <button
                    onClick={() => toggleMenu(item.label)}
                    className={`w-full flex items-center justify-between px-4 py-4 rounded-2xl transition-all group ${
                      isActive ? "bg-white/5 text-white shadow-sm border border-white/5" : "text-white/40 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon
                        className={`w-5 h-5 transition-colors ${
                          isActive ? "text-primary-light" : "text-white/20 group-hover:text-white"
                        }`}
                      />
                      <span className={`text-sm tracking-tight ${isActive ? 'font-black' : 'font-bold'}`}>{item.label}</span>
                    </div>
                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''} ${isActive ? "text-white" : "text-white/40 group-hover:text-white"}`} />
                  </button>
                ) : (
                  <Link
                    href={item.href}
                    onClick={() => { if (window.innerWidth < 1024) closeSidebar(); }}
                    className={`flex items-center gap-3 px-4 py-4 rounded-2xl transition-all group ${
                      isActive ? "bg-white/5 text-white shadow-sm border border-white/5" : "text-white/40 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <item.icon
                      className={`w-5 h-5 transition-colors ${
                        isActive ? "text-primary-light" : "text-white/20 group-hover:text-white"
                      }`}
                    />
                    <span className={`text-sm tracking-tight ${isActive ? 'font-black' : 'font-bold'}`}>{item.label}</span>
                    {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />}
                  </Link>
                )}

                {hasSubItems && (
                  <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-64 opacity-100 mt-1' : 'max-h-0 opacity-0'}`}>
                    <div className="flex flex-col gap-1 pl-12 pr-4 py-2 border-l border-white/10 ml-6">
                      {item.subItems?.map((subItem) => {
                        const isSubActive = pathname === subItem.href;
                        return (
                          <Link
                            key={subItem.label}
                            href={subItem.href}
                            onClick={() => { if (window.innerWidth < 1024) closeSidebar(); }}
                            className={`block py-2 text-sm transition-colors ${
                              isSubActive ? "text-white font-bold" : "text-white/40 hover:text-white/80 font-medium"
                            }`}
                          >
                            {subItem.label}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="mt-auto pt-6 border-t border-white/5 shrink-0">
           
          <button className="flex items-center gap-3 w-full px-5 py-4 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white rounded-2xl transition-all group">
            <HelpCircle className="w-5 h-5 text-white/20 group-hover:text-white" />
            <span className="text-sm font-black tracking-tight">Pusat Bantuan</span>
          </button>
        </div>
      </aside>
    </>
  );
};
