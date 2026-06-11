"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import {
  motion,
  AnimatePresence,
  animate,
  useInView,
  type Variants,
} from "framer-motion";
import Lenis from "lenis";
import {
  Sun,
  Moon,
  ArrowRight,
  Layers,
  ShoppingCart,
  Shield,
  Smartphone,
  Store,
  ChevronRight,
  Database,
  Lock,
  Globe,
  Plus,
  Check,
  Star,
  ShoppingBag,
  Menu,
  X,
  Building,
  ArrowRightLeft,
  FileText,
} from "lucide-react";

// ─── Animation Variants ───────────────────────────────────────────────────────
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: "easeOut" } },
};

const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.5, ease: "easeOut" } },
};

const slideLeft: Variants = {
  hidden: { opacity: 0, x: -32 },
  show: { opacity: 1, x: 0, transition: { duration: 0.55, ease: "easeOut" } },
};

const slideRight: Variants = {
  hidden: { opacity: 0, x: 32 },
  show: { opacity: 1, x: 0, transition: { duration: 0.55, ease: "easeOut" } },
};

const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: "easeOut" } },
};

const staggerContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
};

const staggerFast: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

// ─── Animated Section Wrapper ─────────────────────────────────────────────────
function AnimSection({
  children,
  variant = fadeUp,
  className = "",
}: {
  children: React.ReactNode;
  variant?: Variants;
  className?: string;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      variants={variant}
      initial="hidden"
      animate={inView ? "show" : "hidden"}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── Theme Hook ───────────────────────────────────────────────────────────────
function useTheme() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setTheme(isDark ? "dark" : "light");
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    if (next === "dark") {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
    setTheme(next);
  };

  return { theme, toggleTheme };
}

// ─── Counter Component ────────────────────────────────────────────────────────
function Counter({
  value,
  prefix = "",
  suffix = "",
}: {
  value: number;
  prefix?: string;
  suffix?: string;
}) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  useEffect(() => {
    if (!isInView) return;
    const controls = animate(0, value, {
      duration: 2.0,
      ease: "easeOut",
      onUpdate(latest) {
        setCount(Math.floor(latest));
      },
    });
    return () => controls.stop();
  }, [isInView, value]);

  return (
    <span ref={ref}>
      {prefix}
      {count.toLocaleString("id-ID")}
      {suffix}
    </span>
  );
}

// ─── iPhone Mockup Simulator ──────────────────────────────────────────────────
function IphoneMockup() {
  const [step, setStep] = useState(0);
  const [buyerName] = useState("Budi Santoso");

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((prev) => (prev + 1) % 3);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative mx-auto w-[220px] h-[440px] bg-neutral-900 rounded-[38px] p-[7px] shadow-2xl border-[3px] border-neutral-800 ring-4 ring-neutral-700/20 flex flex-col overflow-hidden select-none">
      <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-[3px] bg-neutral-800 rounded-full z-40 pointer-events-none" />
      <div className="absolute top-3 left-1/2 -translate-x-1/2 w-14 h-4 bg-black rounded-full z-40 flex items-center justify-center pointer-events-none">
        <div className="w-1.5 h-1.5 rounded-full bg-neutral-900 border border-neutral-800 absolute left-1.5" />
      </div>

      <div className="relative w-full h-full bg-zinc-50 rounded-[38px] overflow-hidden flex flex-col border border-zinc-200">
        <div className="h-10 px-6 pt-2 flex justify-between items-center text-[9px] text-zinc-700 font-bold tracking-tight z-30 shrink-0">
          <span>09:41</span>
          <div className="flex items-center gap-1">
            <span className="w-3.5 h-2 border border-zinc-400 rounded-sm p-[1px] flex items-center">
              <span className="w-2 h-full bg-emerald-500 rounded-[1px]" />
            </span>
          </div>
        </div>

        <div className="h-9 bg-white border-b border-zinc-100 px-4 flex justify-between items-center shrink-0 z-30 relative shadow-sm">
          <div className="flex items-center gap-1">
            <img src="/logo/logo_navbar.png" alt="Logo SiPetto" className="h-4.5 w-auto object-contain" />
          </div>
          <div className="relative cursor-pointer p-1">
            <ShoppingCart className="w-3.5 h-3.5 text-zinc-700" />
            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-blue-600 text-white rounded-full flex items-center justify-center text-[6px] font-black">
              {step === 0 ? "1" : "2"}
            </span>
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-between pb-2 relative overflow-hidden bg-zinc-50">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div
                key="step-catalog"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4 }}
                className="flex-1 flex flex-col justify-between p-3 text-left"
              >
                <div className="space-y-2.5">
                  <div className="border-b border-zinc-100 pb-2">
                    <span className="text-[6.5px] font-extrabold text-blue-600 uppercase tracking-widest block">Mitra UMKM SiPetto</span>
                    <h5 className="text-[11px] font-black text-slate-800 leading-tight">Kopi Desa Toyoresmi</h5>
                    <p className="text-[6.5px] text-zinc-700 font-bold mt-0.5">Katalog Produk Resmi &amp; Terpercaya</p>
                  </div>
                  <div className="space-y-2">
                    {[
                      { id: "p1", name: "House Blend Coffee Beans (250g)", price: 85000, img: "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=200&auto=format&fit=crop&q=80", tag: "TERLARIS" },
                      { id: "p2", name: "Signature Butter Croissant Slice", price: 35000, img: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=200&auto=format&fit=crop&q=80", tag: "FAVORIT" },
                    ].map((p) => (
                      <div key={p.id} className="bg-white border border-zinc-200/60 p-2 rounded-xl flex gap-2 shadow-sm">
                        <img src={p.img} alt={p.name} className="w-12 h-12 object-cover rounded-lg bg-zinc-100" />
                        <div className="flex-1 flex flex-col justify-between min-w-0">
                          <div>
                            <div className="flex justify-between items-start gap-1">
                              <h6 className="text-[8.5px] font-black text-slate-800 line-clamp-1 leading-none">{p.name}</h6>
                              <span className="text-[5px] font-bold bg-blue-50 text-blue-600 px-1 rounded shrink-0">{p.tag}</span>
                            </div>
                            <span className="text-[7.5px] text-blue-500 font-mono font-black mt-1 block">Rp {p.price.toLocaleString("id-ID")}</span>
                          </div>
                          <div className="flex justify-between items-center pt-1 mt-0.5 border-t border-zinc-50">
                            <span className="text-[6px] text-zinc-700 font-bold">Stok Ready</span>
                            <button className="px-2 py-0.5 rounded bg-blue-600 text-white text-[7.5px] font-black flex items-center gap-0.5 active:scale-95 shadow-sm">
                              <Plus className="w-2 h-2 stroke-[3]" /> Add
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-blue-50 border border-blue-100/60 p-2 rounded-xl text-[6.5px] text-blue-700 leading-relaxed font-bold">
                  🎁 Klik produk untuk memasukkan ke keranjang belanja instan.
                </div>
              </motion.div>
            )}
            {step === 1 && (
              <motion.div
                key="step-checkout"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.4 }}
                className="flex-1 flex flex-col justify-between p-3 text-left"
              >
                <div className="space-y-3">
                  <div>
                    <span className="text-[6.5px] font-extrabold text-blue-600 uppercase tracking-widest block">Keranjang Belanja</span>
                    <h5 className="text-[11px] font-black text-slate-800 leading-tight">Konfirmasi Pesanan</h5>
                  </div>
                  <div className="bg-white border border-zinc-200/60 p-2 rounded-xl space-y-1.5 shadow-sm text-[7.5px]">
                    <div className="flex justify-between font-medium"><span>1x House Blend Coffee</span><span className="font-mono font-bold text-slate-800">Rp 85.000</span></div>
                    <div className="flex justify-between font-medium pb-1.5 border-b border-zinc-100"><span>1x Butter Croissant</span><span className="font-mono font-bold text-slate-800">Rp 35.000</span></div>
                    <div className="flex justify-between text-slate-800 font-black pt-1"><span>Total Bayar</span><span className="font-mono text-blue-600 text-[8.5px]">Rp 120.000</span></div>
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-[6px] font-extrabold text-zinc-900 uppercase tracking-wider">Informasi Pengiriman</span>
                    <div className="bg-white border border-zinc-200/60 p-2 rounded-xl space-y-2 shadow-sm">
                      <div className="space-y-0.5">
                        <label className="text-[5.5px] font-black uppercase text-zinc-900">Nama Penerima</label>
                        <input type="text" value={buyerName} readOnly className="w-full bg-zinc-50 border border-zinc-100 rounded px-1.5 py-0.5 text-[7px] font-bold text-black outline-none" />
                      </div>
                      <div className="space-y-0.5">
                        <label className="text-[5.5px] font-black uppercase text-zinc-900">Alamat Kirim</label>
                        <input type="text" value="Desa Toyoresmi, Kediri" readOnly className="w-full bg-zinc-50 border border-zinc-100 rounded px-1.5 py-0.5 text-[7px] font-bold text-black outline-none" />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="w-full bg-emerald-600 text-white rounded-xl py-2 flex items-center justify-center gap-1.5 text-[8.5px] font-black tracking-wide shadow-md cursor-pointer">
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" /> Checkout via WhatsApp
                </div>
              </motion.div>
            )}
            {step === 2 && (
              <motion.div
                key="step-whatsapp"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4 }}
                className="flex-1 flex flex-col justify-between text-left"
              >
                <div className="bg-[#075e54] text-white px-3 py-2 flex items-center gap-2 shrink-0">
                  <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-[8.5px] font-black text-white">KT</div>
                  <div>
                    <h6 className="text-[8.5px] font-black leading-none text-white">Kopi Desa Toyoresmi (Admin)</h6>
                    <span className="text-[5.5px] text-emerald-300 font-bold block leading-none">Online &amp; Aktif</span>
                  </div>
                </div>
                <div className="flex-1 bg-[#ece5dd] p-2.5 flex flex-col justify-end space-y-2 min-h-0 overflow-y-auto">
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="max-w-[85%] bg-[#dcf8c6] self-end rounded-lg p-2 shadow-sm text-zinc-800 text-[6.5px] leading-relaxed relative"
                  >
                    <p className="font-mono text-zinc-800">
                      *PESANAN BARU - SIPETTO*<br />
                      ------------------------<br />
                      Nama: *{buyerName}*<br />
                      Alamat: *Desa Toyoresmi*<br />
                      Toko: *Kopi Desa Toyoresmi*<br /><br />
                      Detail Belanjaan:<br />
                      - 1x House Blend Coffee (Rp 85.000)<br />
                      - 1x Butter Croissant (Rp 35.000)<br /><br />
                      *Total: Rp 120.000*<br />
                      ------------------------<br />
                      Mohon segera diproses ya min!
                    </p>
                    <span className="text-[5px] text-zinc-600 font-bold text-right block mt-1">09:42 ✓✓</span>
                  </motion.div>
                </div>
                <div className="bg-[#f4f4f4] p-1.5 flex gap-1.5 items-center shrink-0 border-t border-zinc-200">
                  <div className="flex-1 bg-white border border-zinc-200 rounded-full px-2 py-1 text-[7px] text-zinc-600 font-medium">Ketik pesan pesanan...</div>
                  <div className="w-6 h-6 rounded-full bg-[#075e54] flex items-center justify-center text-white shrink-0">
                    <ArrowRight className="w-3 h-3 text-white" />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="h-3.5 flex items-center justify-center shrink-0 z-30 bg-white border-t border-zinc-100">
          <div className="w-16 h-[3px] bg-zinc-300 rounded-full" />
        </div>
      </div>
    </div>
  );
}

// ─── Bento Card ───────────────────────────────────────────────────────────────
function BentoCard({
  icon,
  title,
  desc,
  className = "",
  badge,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  className?: string;
  badge?: string;
}) {
  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ y: -6, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 200, damping: 16 }}
      className={`group relative p-6 rounded-3xl border border-white/15 bg-slate-950/65 backdrop-blur-xl hover:bg-slate-950/80 hover:border-white/25 transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-xl hover:shadow-[0_8px_32px_rgba(30,64,175,0.25)] ${className}`}
    >
      <div className="absolute -inset-4 rounded-3xl bg-blue-500/5 opacity-0 group-hover:opacity-100 blur-2xl transition-opacity duration-500 pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/25 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="space-y-4">
        <motion.div
          whileHover={{ rotate: 10, scale: 1.05 }}
          className="w-10 h-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center transition-all duration-300 text-white"
        >

          {icon}
        </motion.div>
        <div>
          {badge && (
            <span className="inline-block text-[8px] font-extrabold tracking-widest uppercase bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 px-2 py-0.5 rounded-full mb-2">
              {badge}
            </span>
          )}
          <h3 className="text-base font-bold text-white tracking-tight group-hover:text-yellow-300 transition-colors">{title}</h3>
          <p className="text-white text-xs leading-relaxed mt-1.5 font-medium">{desc}</p>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main Landing Page ────────────────────────────────────────────────────────
export default function LandingPage() {
  const { theme, toggleTheme } = useTheme();
  const [mobileMenu, setMobileMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [notif, setNotif] = useState("");
  const [lenisInstance, setLenisInstance] = useState<any>(null);

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
      wheelMultiplier: 0.9,
    });
    setLenisInstance(lenis);
    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => {
      lenis.destroy();
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const handleSimulatePurchase = (name: string) => {
    setCartCount((prev) => prev + 1);
    setNotif(name);
    setTimeout(() => setNotif(""), 2500);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased overflow-x-hidden selection:bg-blue-500/25 selection:text-blue-400 relative">

      {/* ── GRADIENT BACKGROUND ── */}
      <div className="fixed inset-0 z-0 pointer-events-none bg-[#030037]" style={{ overflow: "clip" }}>
        <div
          className="absolute inset-0 z-0"
          style={{
            background: 'linear-gradient(135deg, #030037 0%, #0f2166 20%, #1a56db 50%, #0ea5e9 80%, #06b6d4 100%)'
          }}
        />
        {/* Ambient glow overlays */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 blur-[120px] rounded-full animate-pulse z-0 pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-cyan-400/20 blur-[100px] rounded-full animate-pulse delay-700 z-0 pointer-events-none" />
      </div>


      {/* ── STICKY GLASS NAVBAR ── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-white/75 backdrop-blur-2xl border-b border-zinc-200/50 shadow-[0_4px_20px_rgba(0,0,0,0.05)] py-3.5"
          : "bg-white/35 backdrop-blur-md border-b border-white/20 py-6"
      }`}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between relative">
          
          {/* Logo on Left */}
          <div className="flex-1 flex justify-start">
            <Link href="/" className="flex items-center gap-2 group shrink-0">
              <img
                src="/logo/logo_navbar.png"
                alt="SiPetto Logo"
                className="h-8 md:h-10 w-auto object-contain transition-all duration-300 hover:scale-105 active:scale-95"
              />
            </Link>
          </div>

          {/* Links Centered */}
          <div className="hidden md:flex items-center gap-7 bg-white/40 border border-zinc-200/50 px-6 py-2.5 rounded-full backdrop-blur-xl absolute left-1/2 -translate-x-1/2">
            {[
              ["POS Kasir", "#pos"],
              ["Fitur Utama", "#features"],
              ["Etalase Katalog", "#catalog"],
              ["Alur Kerja", "#how"],
            ].map(([label, href]) => (
              <a
                key={label}
                href={href}
                onClick={(e) => {
                  e.preventDefault();
                  lenisInstance?.scrollTo(href);
                }}
                className="text-zinc-800 hover:text-zinc-950 text-xs font-semibold tracking-wide transition-colors relative group cursor-pointer"
              >
                {label}
                <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-0 h-[1.5px] bg-blue-600 group-hover:w-5 transition-all duration-300" />
              </a>
            ))}
          </div>

          {/* Actions on Right */}
          <div className="hidden md:flex items-center justify-end gap-3.5 flex-1 shrink-0">
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl border border-zinc-200/50 hover:border-zinc-200/80 bg-white/40 hover:bg-white/70 backdrop-blur-md transition-all cursor-pointer text-zinc-800"
              title="Ganti Tema"
            >
              {theme === "dark" ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-zinc-800" />}
            </button>
            <Link
              href="/login"
              className="px-4 py-2 text-xs font-bold border border-zinc-200/50 hover:border-zinc-200/80 bg-white/40 hover:bg-white/70 backdrop-blur-md rounded-xl transition-all flex items-center gap-1.5 text-zinc-800 hover:text-zinc-950"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
              Masuk
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-lg shadow-blue-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              Registrasi
            </Link>
          </div>

          {/* Mobile menu trigger */}
          <div className="flex items-center gap-3.5 md:hidden">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-white/40 border border-zinc-200/50 text-zinc-800"
            >
              {theme === "dark" ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4" />}
            </button>
            <button onClick={() => setMobileMenu(!mobileMenu)} className="p-2 text-zinc-800">
              {mobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {mobileMenu && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-white/95 border-b border-zinc-200/80 px-6 py-5 flex flex-col gap-3.5 overflow-hidden backdrop-blur-xl"
            >
              {[
                ["POS Kasir", "#pos"],
                ["Fitur Utama", "#features"],
                ["Etalase Katalog", "#catalog"],
                ["Alur Kerja", "#how"],
              ].map(([label, href]) => (
                <a
                  key={label}
                  href={href}
                  className="text-zinc-800 hover:text-zinc-950 text-xs font-bold py-1.5 transition-colors cursor-pointer"
                  onClick={(e) => {
                    e.preventDefault();
                    setMobileMenu(false);
                    lenisInstance?.scrollTo(href);
                  }}
                >
                  {label}
                </a>
              ))}
              <div className="flex flex-col gap-2.5 pt-3 border-t border-zinc-200">
                <Link
                  href="/login"
                  className="w-full text-center py-2.5 text-xs font-bold text-zinc-800 border border-zinc-200 rounded-xl hover:bg-zinc-100"
                  onClick={() => setMobileMenu(false)}
                >
                  Masuk
                </Link>
                <Link
                  href="/register"
                  className="w-full text-center py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-lg shadow-blue-500/10"
                  onClick={() => setMobileMenu(false)}
                >
                  Registrasi Toko
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ── HERO SECTION ── */}
      <section className="relative pt-28 pb-10 px-6 md:px-12 max-w-7xl mx-auto z-10 flex flex-col items-center justify-center text-center">
        <div className="space-y-5 max-w-3xl flex flex-col items-center">

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05, ease: "easeOut" }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-500/10 bg-blue-500/5 text-[9px] font-bold text-blue-400 shadow-inner"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
            Sippeto Core v2.0 • Infrastruktur Keuangan &amp; Katalog UMKM
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.15, ease: "easeOut" }}
            className="font-extrabold text-3xl sm:text-4xl md:text-5xl tracking-tight leading-[1.15] text-white"
          >
            Kelola Keuangan Bisnis <br />
            <span className="text-yellow-400">Bersama Sippeto</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25, ease: "easeOut" }}
            className="text-white text-xs md:text-sm leading-relaxed max-w-xl mx-auto font-medium"
          >
            Platform modern untuk mendigitalkan kasir POS, menyinkronkan stok antar-cabang,
            mencatat jurnal laba-rugi keuangan, serta meluncurkan katalog produk terintegrasi WhatsApp Order instan.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.35, ease: "easeOut" }}
            className="flex flex-wrap justify-center gap-3 pt-1"
          >
            <Link
              href="/register"
              className="group inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-xl shadow-blue-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all text-xs cursor-pointer"
            >
              Daftarkan Bisnis Anda
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform text-white" />
            </Link>
            <a
              href="#pos"
              onClick={(e) => {
                e.preventDefault();
                lenisInstance?.scrollTo("#pos");
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 border border-white/10 hover:border-white/20 text-white font-semibold bg-white/5 hover:bg-white/10 rounded-xl transition-all text-xs shadow-sm cursor-pointer"
            >
              Coba Simulator POS
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5, ease: "easeOut" }}
            className="pt-8 border-t border-white/10 mt-8 flex flex-wrap justify-center items-center gap-x-7 gap-y-3 text-slate-200 text-xs w-full max-w-2xl"
          >
            {[
              { icon: <Database className="w-3.5 h-3.5 text-cyan-300" />, label: "Prisma Client ORM" },
              { icon: <Lock className="w-3.5 h-3.5 text-cyan-300" />, label: "Row Level Security (RLS)" },
              { icon: <Globe className="w-3.5 h-3.5 text-cyan-300" />, label: "Katalog Publik Siap Rilis" },
            ].map((b, i) => (
              <div key={i} className="flex items-center gap-1.5">
                {b.icon}
                <span className="text-white font-semibold text-xs">{b.label}</span>
              </div>
            ))}
          </motion.div>

        </div>
      </section>

      {/* ── METRICS COUNTERS ── */}
      <section className="py-6 px-6 md:px-12 max-w-7xl mx-auto z-10 relative">
        <AnimSection variant={scaleIn}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-950/65 border border-white/15 rounded-2xl p-4 md:p-6 backdrop-blur-2xl shadow-xl">
            {[
              { value: 1250, suffix: "+", label: "Toko Aktif Terdaftar" },
              { value: 45, prefix: "Rp ", suffix: "M+", label: "Volume Transaksi" },
              { value: 8, label: "Integrasi Cabang Toko" },
              { value: 99, suffix: "%", label: "SLA Up-time Server" },
            ].map((item, i) => (
              <div key={i} className="text-center space-y-0.5">
                <div className="text-xl md:text-2xl font-extrabold text-white font-mono tracking-tight">
                  <Counter value={item.value} prefix={item.prefix} suffix={item.suffix} />
                </div>
                <span className="text-[9px] text-white uppercase tracking-widest block font-bold">{item.label}</span>
              </div>
            ))}
          </div>
        </AnimSection>
      </section>

      {/* ── SECTION: IPHONE CATALOG SIMULATOR ── */}
      <section id="pos" className="py-12 px-6 md:px-12 max-w-7xl mx-auto z-10 relative">
        <div className="grid lg:grid-cols-12 gap-6 lg:gap-8 items-center bg-slate-950/65 border border-white/15 rounded-2xl p-5 md:p-8 shadow-2xl backdrop-blur-2xl">
          <AnimSection variant={slideLeft} className="lg:col-span-7 space-y-4 text-left flex flex-col items-start">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-white/15 bg-white/5 text-[8px] font-extrabold uppercase tracking-wider text-blue-300">
              E-Catalog &amp; WhatsApp Order
            </span>
            <h2 className="font-extrabold text-2xl md:text-3xl text-white leading-tight">
              Katalog Toko Online <br />
              <span className="text-yellow-400">Terintegrasi WhatsApp Order</span>
            </h2>
            <p className="text-white text-xs leading-relaxed max-w-lg">
              Dapatkan subdomain toko digital instan untuk memajang seluruh produk aktif Anda. Pembeli dapat langsung memesan produk, mengisi data diri, dan melakukan checkout yang langsung terkirim secara otomatis ke WhatsApp Admin Anda dengan rapi dan aman.
            </p>
            <motion.div
              variants={staggerFast}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-60px" }}
              className="space-y-2 w-full text-white text-xs"
            >
              {[
                "WhatsApp Redirect Secure (Tautan pesan belanja rapi dikirim otomatis)",
                "Anti-Spam Honeypot (Proteksi formulir pesanan dari bot spammer)",
                "Sinkronisasi Inventori Cabang (Stok produk terupdate sesuai data cabang)",
              ].map((item, i) => (
                <motion.div key={i} variants={fadeUp} className="flex gap-2 items-center">
                  <div className="w-4 h-4 rounded bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
                    <Check className="w-2.5 h-2.5 text-yellow-400" />
                  </div>
                  <span className="text-white">{item}</span>
                </motion.div>
              ))}
            </motion.div>
            <Link
              href="/register"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-all shadow-md active:scale-95 cursor-pointer mt-1"
            >
              Buat Toko Sekarang <ArrowRight className="w-3 h-3 text-white" />
            </Link>
          </AnimSection>

          <AnimSection variant={slideRight} className="lg:col-span-5 flex justify-center items-center relative py-2">
            <div className="absolute -inset-4 rounded-3xl bg-blue-500/8 blur-3xl pointer-events-none" />
            <IphoneMockup />
          </AnimSection>
        </div>
      </section>

      {/* ── SECTION: BENTO FEATURE GRID ── */}
      <section id="features" className="py-20 px-6 md:px-12 max-w-7xl mx-auto z-10 relative">
        <div className="space-y-12">
          <AnimSection variant={fadeUp} className="text-center max-w-2xl mx-auto space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-[9px] font-extrabold uppercase tracking-wider text-blue-300">
              ARSITEKTUR &amp; FITUR UTAMA
            </span>
            <h2 className="font-extrabold text-3xl md:text-4xl text-white">
              Satu Dashboard, <span className="text-yellow-400">Ribuan Kemudahan</span>
            </h2>
            <p className="text-white text-xs md:text-sm">
              Kami menyatukan pembukuan kas, logistik stok produk, dan etalase toko online publik dalam infrastruktur SaaS yang aman.
            </p>
          </AnimSection>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
            className="grid md:grid-cols-12 gap-6"
          >
            <BentoCard
              className="md:col-span-8"
              icon={<Shield className="w-5 h-5 text-blue-400" />}
              badge="KEAMANAN DATABASE"
              title="Isolasi Data Tenant (Row Level Security)"
              desc="Keamanan pembukuan keuangan toko Anda adalah prioritas utama kami. Melalui kebijakan Supabase RLS, setiap data transaksi, produk, dan laporan keuangan dilindungi ketat di tingkat database, memastikan bahwa tidak ada kebocoran atau akses tidak sah dari pihak luar."
            />
            <BentoCard
              className="md:col-span-4"
              icon={<Building className="w-5 h-5 text-blue-400" />}
              badge="LOGISTIK TOKO"
              title="Manajemen Multi-Cabang"
              desc="Pantau perputaran produk di gudang pusat hingga stok fisik di masing-masing cabang toko Anda secara efisien."
            />
            <BentoCard
              className="md:col-span-4"
              icon={<ArrowRightLeft className="w-5 h-5 text-blue-400" />}
              badge="MUTASI STOK"
              title="Pelacakan Riwayat Transfer"
              desc="Mencatat logistik mutasi stok ketika ada restock barang, transfer antar-cabang, atau penyesuaian inventori toko."
            />
            <BentoCard
              className="md:col-span-8"
              icon={<Smartphone className="w-5 h-5 text-blue-400" />}
              badge="INTEGRASI WHATSAPP"
              title="Form Pemesanan Anti-Spam (Secure WhatsApp Order)"
              desc="Setiap pemesanan dari katalog digital dilindungi oleh sistem honeypot bot-detection di sisi server. Pembeli langsung diarahkan ke nomor WhatsApp Admin secara aman melalui tautan redirect dinamis, menyembuyen nomor WA asli Anda dari robot spammer."
            />
            <BentoCard
              className="md:col-span-6"
              icon={<FileText className="w-5 h-5 text-blue-400" />}
              badge="FINANSIAL"
              title="Jurnal Keuangan &amp; Arus Kas"
              desc="Catat pengeluaran bisnis (seperti sewa, belanja barang, modal, gaji karyawan) dan kelola jurnal arus kas terpusat untuk memonitor margin keuntungan bersih bisnis."
            />
            <BentoCard
              className="md:col-span-6"
              icon={<Globe className="w-5 h-5 text-blue-400" />}
              badge="ONLINE STORE"
              title="Etalase Toko Digital Publik"
              desc="Dapatkan subdomain toko instan sipetto.id/store/[username] yang terisi otomatis berdasarkan daftar produk aktif Anda, siap disebarkan ke media sosial."
            />
          </motion.div>
        </div>
      </section>

      {/* ── SECTION: CATALOG SHOWCASE ── */}
      <section id="catalog" className="py-20 px-6 md:px-12 max-w-7xl mx-auto z-10 relative">
        <AnimSection variant={scaleIn}>
          <div className="bg-slate-950/65 border border-white/15 rounded-3xl p-6 md:p-10 shadow-2xl space-y-12 backdrop-blur-xl relative">
            <div className="absolute top-0 left-0 w-40 h-40 bg-blue-500/5 blur-[80px]" />

            <AnimSection variant={fadeUp} className="text-center max-w-2xl mx-auto space-y-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-white/15 bg-white/5 text-[9px] font-extrabold uppercase tracking-wider text-blue-300">
                Demo Katalog Online Publik
              </span>
              <h2 className="font-extrabold text-2xl md:text-3xl text-white">
                Produk Unggulan <span className="text-blue-400 drop-shadow-[0_0_12px_rgba(59,130,246,0.35)]">Kami</span>
              </h2>
              <p className="text-white text-xs md:text-sm">
                Ini adalah etalase modern, bersih, dan super cepat yang akan diakses oleh calon pembeli Anda secara publik tanpa perlu login.
              </p>
            </AnimSection>

            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-60px" }}
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 relative z-10 max-w-5xl mx-auto"
            >
              {[
                { id: "p1", name: "House Blend Coffee Beans (250g)", price: 85000, img: "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400&auto=format&fit=crop&q=80", cat: "F&B / KOPI SHOP", tag: "TERLARIS", badge: "from-blue-600 to-indigo-700" },
                { id: "p2", name: "Signature Butter Croissant Slice", price: 35000, img: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400&auto=format&fit=crop&q=80", cat: "BAKERY / MAKANAN", tag: "FAVORIT", badge: "from-blue-600 to-indigo-700" },
                { id: "p3", name: "Premium Flanel Shirt Casual Fit", price: 185000, img: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400&auto=format&fit=crop&q=80", cat: "RITEL / FASHION", tag: "BARU", badge: "from-blue-600 to-indigo-700" },
              ].map((prod) => (
                <motion.div
                   key={prod.id}
                   variants={fadeUp}
                   whileHover={{ y: -4, scale: 1.015 }}
                   transition={{ type: "spring", stiffness: 200, damping: 18 }}
                   className="group border border-white/10 bg-slate-950/60 p-3 rounded-2xl hover:border-white/25 hover:bg-slate-950/80 hover:shadow-[0_8px_32px_rgba(30,64,175,0.25)] transition-all duration-300 flex flex-col justify-between"
                >
                  <div className="space-y-2.5 text-left">
                    <div className="relative h-28 sm:h-36 rounded-xl overflow-hidden bg-slate-900">
                      <img
                        src={prod.img}
                        alt={prod.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <span className={`absolute top-2 left-2 px-2 py-0.5 rounded text-[8px] font-black text-white bg-gradient-to-r ${prod.badge} shadow-md`}>
                        {prod.tag}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[8px] font-bold text-blue-300 tracking-wider block uppercase">{prod.cat}</span>
                      <h4 className="text-[11px] sm:text-xs font-bold text-white line-clamp-2 min-h-[30px] leading-snug">{prod.name}</h4>
                      <div className="flex items-center gap-1 text-[9px] text-yellow-400">
                        <Star className="w-2.5 h-2.5 fill-current" />
                        <span className="font-bold">4.9</span>
                        <span className="text-slate-100">(12 ulasan)</span>
                      </div>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-white/10 mt-3 flex items-center justify-between">
                    <span className="text-xs font-mono font-extrabold text-blue-400">Rp {prod.price.toLocaleString("id-ID")}</span>
                    <button
                      onClick={() => handleSimulatePurchase(prod.name)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-[9px] font-black text-white shadow-md active:scale-95 transition-all cursor-pointer"
                    >
                      <Plus className="w-3 h-3 text-white stroke-[3]" /> Add
                    </button>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </AnimSection>
      </section>

      {/* ── SECTION: HOW IT WORKS ── */}
      <section id="how" className="py-20 px-6 md:px-12 max-w-7xl mx-auto z-10 relative">
        <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-center bg-slate-950/65 border border-white/15 rounded-3xl p-6 md:p-10 shadow-2xl backdrop-blur-xl">
          <AnimSection variant={slideLeft} className="lg:col-span-7 space-y-6 text-left">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-white/15 bg-white/5 text-[9px] font-extrabold uppercase tracking-wider text-blue-300">
              Panduan Aktivasi Toko
            </span>
            <h2 className="font-extrabold text-2xl md:text-3xl text-white">
              Cukup 3 Langkah <br />
              <span className="text-yellow-400">Untuk Mulai Berjualan</span>
            </h2>
            <p className="text-white text-xs md:text-sm">
              Proses onboarding yang dirancang efisien dan minimalis agar pemilik bisnis bisa segera fokus melayani transaksi.
            </p>

            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-60px" }}
              className="space-y-4 pt-3"
            >
              {[
                { step: "01", title: "Registrasi Akun UMKM", desc: "Buat profil bisnis Anda di SiPetto dengan mengisi formulir singkat dan atur subdomain nama toko." },
                { step: "02", title: "Setup Cabang & Produk", desc: "Daftarkan cabang-cabang bisnis Anda, masukkan inventori produk beserta harga dasar & harga jual." },
                { step: "03", title: "Bagikan Katalog & Transaksi POS", desc: "Mulai melayani kasir POS offline di cabang, serta bagikan tautan etalase toko digital ke pelanggan umum." },
              ].map((item, i) => (
                <motion.div key={i} variants={fadeUp} className="flex gap-4 items-start group">
                  <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-white/10 border border-white/15 text-yellow-400 flex items-center justify-center font-mono text-xs font-bold group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-all duration-300">
                    {item.step}
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-xs md:text-sm mb-0.5 group-hover:text-blue-400 transition-colors">{item.title}</h4>
                    <p className="text-slate-100 text-xs leading-relaxed max-w-lg">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </AnimSection>

          <AnimSection variant={slideRight} className="lg:col-span-5 relative flex justify-center">
            <div className="w-full max-w-sm p-6 rounded-2xl border border-white/15 bg-slate-950/65 backdrop-blur-md shadow-xl text-left space-y-4">
              <h4 className="text-[10px] font-bold text-slate-200 tracking-wider uppercase flex items-center gap-1.5">
                <Store className="w-3.5 h-3.5 text-blue-300" />
                Daftar Subdomain Contoh Toko
              </h4>
              <div className="space-y-2.5">
                {[
                  { n: "Kopi Aroma Nusantara", u: "sipetto.id/store/kopiaroma", l: "KA" },
                  { n: "Bakery Pastry Mantap", u: "sipetto.id/store/pastrymantap", l: "BP" },
                ].map((t, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: 16 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.15, duration: 0.45 }}
                    className="p-3 rounded-xl border border-white/10 bg-slate-950/60 flex items-center justify-between hover:border-white/20 hover:bg-slate-950/75 hover:scale-[1.01] transition-all"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-white/10 text-blue-300 border border-white/10 flex items-center justify-center font-black text-[10px]">
                        {t.l}
                      </div>
                      <div className="leading-tight">
                        <span className="text-[11px] font-bold text-white block truncate max-w-[150px]">{t.n}</span>
                        <span className="text-yellow-400 font-mono text-[9px] font-semibold">{t.u}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/70" />
                  </motion.div>
                ))}
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950/50 border border-white/10 text-[9px] leading-relaxed text-white font-medium">
                Setiap subdomain publik otomatis menampilkan katalog terupdate tanpa mengganggu data pembukuan admin tenant (keamanan terisolasi via Supabase RLS).
              </div>
            </div>
          </AnimSection>
        </div>
      </section>

      {/* ── SECTION: CTA ── */}
      <section className="relative py-20 px-6 md:px-12 max-w-7xl mx-auto z-10">
        <AnimSection variant={scaleIn}>
          <div className="border border-white/15 bg-slate-950/65 backdrop-blur-md rounded-3xl p-8 md:p-14 shadow-2xl text-center space-y-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-blue-500/5 blur-[120px] pointer-events-none" />

            <motion.h2
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              className="font-extrabold text-3xl md:text-5xl leading-tight text-white"
            >
              Kelola Bisnis UMKM <br />
              <span className="text-yellow-400">Lebih Terstruktur</span>
            </motion.h2>
            <motion.p
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-white text-xs md:text-sm max-w-lg mx-auto leading-relaxed font-medium"
            >
              Hentikan pencatatan manual di buku kas kertas yang rentan hilang. Optimalkan operasional kasir cabang dan perluas jangkauan pasar online Anda sekarang.
            </motion.p>
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              transition={{ delay: 0.18 }}
              className="flex flex-wrap justify-center gap-3.5 pt-3 relative z-10"
            >
              <Link
                href="/register"
                className="px-6 py-3 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold rounded-xl text-xs md:text-sm transition-all shadow-lg shadow-yellow-500/10 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                Registrasi Sekarang
              </Link>
              <Link
                href="/login"
                className="px-6 py-3 border border-white/10 hover:border-white/20 hover:bg-white/10 rounded-xl font-semibold text-white text-xs md:text-sm transition-all"
              >
                Sudah Punya Akun? Masuk
              </Link>
            </motion.div>
          </div>
        </AnimSection>
      </section>

      {/* ── FOOTER ── */}
      <AnimSection variant={fadeIn}>
        <footer className="max-w-7xl mx-auto px-6 md:px-12 py-10 border-t border-white/10 z-10 relative">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
                <Layers className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-[11px] md:text-xs font-semibold text-blue-100/60">
                © 2026 <strong>SiPetto</strong>. Sistem Pembukuan Finansial &amp; Katalog UMKM Indonesia.
              </span>
            </div>
            <div className="flex items-center gap-6 text-[11px] md:text-xs text-blue-100/60 font-semibold">
              <a href="#" className="hover:text-blue-300 transition-colors">Kebijakan Privasi</a>
              <a href="#" className="hover:text-blue-300 transition-colors">Ketentuan Layanan</a>
              <a href="#" className="hover:text-blue-300 transition-colors">Bantuan</a>
            </div>
          </div>
        </footer>
      </AnimSection>

      {/* ── NOTIFICATION TOAST ── */}
      <AnimatePresence>
        {notif && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 30, x: "-50%" }}
            animate={{ opacity: 1, scale: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, scale: 0.85, y: 30, x: "-50%" }}
            className="fixed bottom-6 left-1/2 z-50 flex items-center gap-3 bg-slate-950 border border-yellow-500/25 px-5 py-3 rounded-2xl shadow-2xl min-w-[280px] max-w-sm text-left backdrop-blur-md"
          >
            <div className="w-8 h-8 rounded-full bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-400">
              <Check className="w-4 h-4 stroke-[3]" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[8px] font-black uppercase tracking-wider text-yellow-400">Keranjang Simulasi</span>
              <p className="text-xs font-bold text-white truncate">{notif}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── FLOATING CART COUNTER ── */}
      <AnimatePresence>
        {cartCount > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-gradient-to-r from-yellow-400 to-amber-500 text-slate-950 px-4 py-2.5 rounded-2xl shadow-xl hover:scale-[1.03] active:scale-[0.98] transition-all cursor-pointer font-bold"
            onClick={() => {
              alert(`Order simulasi katalog Anda berisi ${cartCount} item siap dikirimkan ke WhatsApp Toko via API Redirect secure.`);
            }}
          >
            <div className="relative shrink-0">
              <ShoppingBag className="w-4 h-4 text-slate-950" />
              <span className="absolute -top-2 -right-2 bg-white text-slate-950 font-black text-[9px] w-4 h-4 rounded-full flex items-center justify-center shadow-md animate-pulse">
                {cartCount}
              </span>
            </div>
            <div className="flex flex-col text-left">
              <span className="text-[8px] font-black uppercase tracking-wider text-slate-900 leading-none">Catalog Order</span>
              <span className="text-[10px] font-extrabold leading-tight">Simulasi WhatsApp Order</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
