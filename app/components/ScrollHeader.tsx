"use client";

import { useEffect, useState } from "react";
import AuthNav from "./AuthNav";

export default function ScrollHeader() {
  const [showHeader, setShowHeader] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowHeader(window.scrollY > 24);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={[
        "sticky top-0 z-50 w-full border-b border-white/10 bg-[#090d14]/95 px-4 py-3 backdrop-blur-xl transition-all duration-200 sm:px-6",
        showHeader ? "shadow-sm shadow-black/20" : "",
      ].join(" ")}
    >
      <AuthNav />
    </header>
  );
}
