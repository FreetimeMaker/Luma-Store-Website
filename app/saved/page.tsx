"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
export default function SavedRedirect(){const router=useRouter();useEffect(()=>{router.replace("/dashboard")},[router]);return <div className="glass-page p-8 text-slate-400">Opening dashboard…</div>;}
