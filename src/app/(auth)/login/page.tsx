"use client";

import { useEffect, useState } from "react";
import { LoginCard } from "@/components/auth/LoginCard";
import { WelcomeSection } from "@/components/auth/WelcomeSection";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

const LoginPage = () => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return <div className="min-h-screen bg-[#F8FAFC]" />;
  }

  return (
    <div
      className="min-h-screen w-full flex flex-col font-sans selection:bg-white/20 selection:text-white relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #030037 0%, #0f2166 20%, #1a56db 50%, #0ea5e9 80%, #06b6d4 100%)'
      }}
      suppressHydrationWarning
    >
      {/* Ambient glow overlays */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[50%] bg-blue-600/20 blur-[120px] rounded-full animate-pulse z-0 pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[50%] bg-cyan-400/20 blur-[100px] rounded-full animate-pulse delay-700 z-0 pointer-events-none" />

      {/* Navbar Container */}
      <header className="shrink-0 relative z-20">
        <Navbar />
      </header>


      {/* Main Container */}
      <main className="flex-1 min-h-0 w-full flex items-center justify-center relative z-10 py-8 lg:py-12">
        <div className="container max-w-6xl mx-auto flex items-center justify-center">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 lg:gap-6 items-center w-full">
            {/* Illustration Section */}
            <div className="hidden lg:flex items-center justify-center lg:justify-start transform scale-90 xl:scale-100 origin-left">
              <WelcomeSection theme="dark" />
            </div>

            {/* Card Section */}
            <div className="flex items-center justify-center lg:justify-end py-1">
              <LoginCard theme="dark" />
            </div>
          </div>
        </div>
      </main>

      {/* Footer Container */}
      <footer className="shrink-0 relative z-20">
        <Footer theme="light" />
      </footer>
    </div>
  );
};

export default LoginPage;
