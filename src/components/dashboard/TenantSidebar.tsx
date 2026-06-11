"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  Sliders,
  Globe,
  ShoppingBag
} from "lucide-react";

type NavItem = {
  icon: any;
  label: string;
  href: string;
  permission?: string;
  subItems?: { label: string; href: string; permission?: string }[];
};

const tenantNavItems: NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/backend/tenant" },
  { 
    icon: ShoppingCart, 
    label: "POS Kasir (Penjualan)", 
    href: "/backend/tenant/sales",
    subItems: [
      { label: "Kasir", href: "/backend/tenant/sales" },
      { label: "Data Penjualan & Pesanan", href: "/backend/tenant/sales/history" },
    ]
  },
  { 
    icon: Package, 
    label: "Produk", 
    href: "/backend/tenant/products", 
    subItems: [
      { label: "Daftar Produk", href: "/backend/tenant/products", permission: "kelola_produk" },
      { label: "Kelola Stok", href: "/backend/tenant/stocks", permission: "kelola_stok" },
    ]
  },
  { icon: Store, label: "Kelola Cabang", href: "/backend/tenant/branches", permission: "kelola_cabang" },
  {
    icon: Receipt,
    label: "Pencatatan Transaksi",
    href: "/backend/tenant/transactions",
    subItems: [
      { label: "Pencatatan - Transaksi", href: "/backend/tenant/transactions" },
      { label: "Riwayat - Transaksi", href: "/backend/tenant/transactions/history" },
    ]
  },
  { 
    icon: BarChart3, 
    label: "Laporan", 
    href: "/backend/tenant/reports",
    subItems: [
      { label: "Laporan Harian", href: "/backend/tenant/reports/daily" },
      { label: "Laporan Mingguan", href: "/backend/tenant/reports/weekly" },
      { label: "Laporan Bulanan", href: "/backend/tenant/reports/monthly" },
      { label: "Laporan Tahunan", href: "/backend/tenant/reports/yearly" },
    ]
  },
  { icon: UserCircle, label: "Profil & Toko Saya", href: "/backend/tenant/profile" },
];

export const TenantSidebar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { isOpen, closeSidebar, toggleSidebar } = useSidebar();
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
        className={`fixed inset-y-0 left-0 h-full bg-[#030037] text-white flex flex-col z-[60] transition-all duration-300 ease-in-out ${
          isOpen ? "w-72 translate-x-0 p-6" : "-translate-x-full lg:translate-x-0 lg:w-[76px] lg:px-3 lg:py-6"
        }`}
      >
        {/* Header Logo */}
        <div className={`flex items-center justify-between mb-8 pt-2 shrink-0 ${isOpen ? "" : "lg:justify-center"}`}>
          <div className="flex items-center gap-3">
            <div className="shrink-0 flex items-center justify-center">
               <img 
                 src="/logo/Logo Sippeto 1.png" 
                 alt="Logo Sippeto" 
                 className="w-10 h-10 object-contain rounded-xl"
               />
            </div>
            {isOpen && (
              <div className="animate-in fade-in duration-300">
                <h1 className="text-xl font-black tracking-tightest font-heading uppercase leading-none">Sippeto</h1>
                <p className="text-[8px] font-black text-white/30 uppercase tracking-[0.3em] mt-1 font-sans leading-none">
                  Tenant Portal
                </p>
              </div>
            )}
          </div>
          {isOpen && (
            <button 
              onClick={closeSidebar}
              className="p-2 lg:hidden hover:bg-white/10 rounded-xl transition-colors"
            >
              <X className="w-5 h-5 text-white/40" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className={`flex-1 space-y-2 overflow-y-auto overflow-x-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${isOpen ? "" : "flex flex-col items-center"}`}>
          {tenantNavItems
            .filter((item) => {
              if (userBranchId && item.href === "/backend/tenant/branches") {
                return false;
              }
              if (item.subItems && !loadingPermissions) {
                return item.subItems.some(sub => !sub.permission || userPermissions.includes(sub.permission));
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

              // ─── Collapsed Mode Design ───
              if (!isOpen) {
                return (
                  <div key={item.label} className="relative group/tooltip flex justify-center w-full">
                    <button
                      onClick={() => {
                        toggleSidebar();
                        if (hasSubItems) {
                          setExpandedMenus([item.label]);
                        } else {
                          router.push(item.href);
                        }
                      }}
                      className={`w-12 h-12 flex items-center justify-center rounded-xl transition-all relative ${
                        isActive 
                          ? "bg-white/10 text-white border border-white/10" 
                          : "text-white/40 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <item.icon className="w-5 h-5" />
                      {isActive && <div className="absolute right-1 w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />}
                    </button>
                    
                    {/* Tooltip on Hover */}
                    <div className="absolute left-16 top-1/2 -translate-y-1/2 ml-2 px-3 py-1.5 bg-[#030037] border border-white/10 text-white text-xs font-bold rounded-lg shadow-lg opacity-0 pointer-events-none group-hover/tooltip:opacity-100 transition-opacity whitespace-nowrap z-[100]">
                      {item.label}
                    </div>
                  </div>
                );
              }

              // ─── Expanded Mode Design (Original) ───
              return (
                <div key={item.label} className="relative animate-in fade-in duration-200">
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
                        {item.subItems
                          ?.filter(sub => !sub.permission || userPermissions.includes(sub.permission))
                          .map((subItem) => {
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

        {/* Footer Help */}
        <div className={`mt-auto pt-6 border-t border-white/5 shrink-0 ${isOpen ? "" : "w-full flex justify-center"}`}>
          {isOpen ? (
            <button className="flex items-center gap-3 w-full px-5 py-4 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white rounded-2xl transition-all group">
              <HelpCircle className="w-5 h-5 text-white/20 group-hover:text-white" />
              <span className="text-sm font-black tracking-tight">Pusat Bantuan</span>
            </button>
          ) : (
            <div className="relative group/tooltip flex justify-center w-full">
              <button 
                title="Pusat Bantuan"
                className="w-12 h-12 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all"
              >
                <HelpCircle className="w-5 h-5 text-white/20" />
              </button>
              <div className="absolute left-16 top-1/2 -translate-y-1/2 ml-2 px-3 py-1.5 bg-[#030037] border border-white/10 text-white text-xs font-bold rounded-lg shadow-lg opacity-0 pointer-events-none group-hover/tooltip:opacity-100 transition-opacity whitespace-nowrap z-[100]">
                Pusat Bantuan
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
