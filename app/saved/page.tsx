"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
export default function SavedRedirect(){const router=useRouter();useEffect(()=>{router.replace("/account")},[router]);return <div className="glass-page p-8 text-slate-400">Opening account…</div>;}
