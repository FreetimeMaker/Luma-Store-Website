"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type AppInfo={id:string;name:string|null;package_name:string|null;short_description:string|null;icon_url:string|null;developer_name:string|null;version:string|null};
type Saved={app_id:string;created_at:string;app:AppInfo|null};
type Rating={app_id:string;rating:number;updated_at:string;app:AppInfo|null};

export default function GoogleDashboard(){
 const supabase=useMemo(()=>createClient(),[]);
 const [saved,setSaved]=useState<Saved[]>([]),[ratings,setRatings]=useState<Rating[]>([]),[loading,setLoading]=useState(true);
 useEffect(()=>{let cancelled=false;(async()=>{const {data:{user}}=await supabase.auth.getUser();if(!user)return;
 const [s,r]=await Promise.all([
  supabase.from("store_saved_apps").select("app_id,created_at,app:store_apps(id,name,package_name,short_description,icon_url,developer_name,version)").eq("user_id",user.id).order("created_at",{ascending:false}),
  supabase.from("store_app_ratings").select("app_id,rating,updated_at,app:store_apps(id,name,package_name,short_description,icon_url,developer_name,version)").eq("user_id",user.id).order("updated_at",{ascending:false})
 ]);
 if(!cancelled){if(s.error)alert(s.error.message);if(r.error)alert(r.error.message);setSaved((s.data??[]) as unknown as Saved[]);setRatings((r.data??[]) as unknown as Rating[]);setLoading(false);}})();return()=>{cancelled=true}},[supabase]);
 async function removeSaved(id:string){const {data:{user}}=await supabase.auth.getUser();if(!user)return;const {error}=await supabase.from("store_saved_apps").delete().eq("app_id",id).eq("user_id",user.id);if(error)alert(error.message);else setSaved(x=>x.filter(i=>i.app_id!==id));}
 async function removeRating(id:string){const {data:{user}}=await supabase.auth.getUser();if(!user)return;const {error}=await supabase.from("store_app_ratings").delete().eq("app_id",id).eq("user_id",user.id);if(error)alert(error.message);else setRatings(x=>x.filter(i=>i.app_id!==id));}
 const row=(app:AppInfo|null,actions:React.ReactNode)=>app&&<div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">{app.icon_url?<img src={app.icon_url} alt="" className="h-14 w-14 rounded-2xl border border-slate-700 object-cover"/>:<div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800 font-bold">{(app.name||"?")[0]}</div>}<div className="min-w-0 flex-1"><h3 className="font-semibold text-white">{app.name||app.package_name}</h3><p className="text-sm text-slate-400">{app.developer_name||"Unknown developer"}{app.version?` · v${app.version}`:""}</p></div><div className="flex flex-wrap items-center gap-2"><Link href={`/discover/${encodeURIComponent(app.package_name||app.id)}`} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm text-white">Open</Link>{actions}</div></div>;
 return <div className="glass-page mx-auto max-w-5xl space-y-6"><header className="rounded-3xl border border-indigo-400/15 bg-gradient-to-br from-indigo-500/15 via-slate-900 to-violet-500/10 p-6 sm:p-8"><p className="text-sm font-medium text-indigo-300">Luma Store account</p><h1 className="mt-2 text-3xl font-bold text-white">Account</h1><p className="mt-2 text-slate-400">Manage your saved apps and ratings across devices.</p></header>
 {loading?<div className="rounded-3xl border border-slate-800 bg-slate-900/55 p-8 text-slate-400">Loading account…</div>:<>
 <section className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/55"><div className="border-b border-slate-800 p-5"><h2 className="text-xl font-semibold text-white">Saved Apps</h2></div>{saved.length?<div className="divide-y divide-slate-800">{saved.map(i=><div key={i.app_id}>{row(i.app,<button onClick={()=>void removeSaved(i.app_id)} className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300">Remove</button>)}</div>)}</div>:<p className="p-6 text-slate-400">No saved apps yet.</p>}</section>
 <section className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/55"><div className="border-b border-slate-800 p-5"><h2 className="text-xl font-semibold text-white">Your ratings</h2><p className="mt-1 text-sm text-slate-500">Manage the ratings you have submitted.</p></div>{ratings.length?<div className="divide-y divide-slate-800">{ratings.map(i=><div key={i.app_id}>{row(i.app,<><span className="px-2 text-amber-300">{"★".repeat(i.rating)}<span className="text-slate-700">{"★".repeat(5-i.rating)}</span></span><button onClick={()=>void removeRating(i.app_id)} className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300">Delete rating</button></>)}</div>)}</div>:<p className="p-6 text-slate-400">You have not rated any apps yet.</p>}</section></>}
 </div>
}