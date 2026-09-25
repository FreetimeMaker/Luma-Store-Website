"use client";

import { useEffect, useState } from "react";
import AuthNav from "./AuthNav";

export default function ScrollHeader() {
  const [showHeaderLine, setShowHeaderLine] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowHeaderLine(window.scrollY > 24);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={[
        "sticky top-0 z-50 w-full bg-[#090d14]/95 px-4 py-3 backdrop-blur-xl sm:px-6",
        showHeaderLine ? "border-b border-white/10 shadow-sm shadow-black/20" : "border-b border-transparent",
      ].join(" ")}
    >
      <AuthNav />
    </header>
  );
}
