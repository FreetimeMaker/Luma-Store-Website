"use client";
import Link from "next/link";
import {useEffect,useMemo,useState} from "react";
import {createClient} from "@/lib/supabase/client";
const input="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-white outline-none focus:border-indigo-500";
export default function DeveloperProfilePage(){
 const supabase=useMemo(()=>createClient(),[]),[userId,setUserId]=useState<string|null>(null),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[message,setMessage]=useState<string|null>(null);
 const [form,setForm]=useState({display_name:"",bio:"",website_url:"",github_url:"",gitlab_url:"",avatar_url:""});
 useEffect(()=>{void(async()=>{const {data:{user}}=await supabase.auth.getUser();if(!user){setLoading(false);return}setUserId(user.id);const {data}=await supabase.from("luma_developer_profiles").select("display_name,bio,website_url,github_url,gitlab_url,avatar_url").eq("developer_id",user.id).maybeSingle();if(data)setForm({display_name:data.display_name||"",bio:data.bio||"",website_url:data.website_url||"",github_url:data.github_url||"",gitlab_url:data.gitlab_url||"",avatar_url:data.avatar_url||""});setLoading(false)})()},[supabase]);
 const set=(k:keyof typeof form,v:string)=>setForm(x=>({...x,[k]:v}));
 async function save(e:React.FormEvent){e.preventDefault();if(!userId)return;setSaving(true);const clean=(v:string)=>v.trim()||null;const {error}=await supabase.from("luma_developer_profiles").upsert({developer_id:userId,display_name:clean(form.display_name),bio:clean(form.bio),website_url:clean(form.website_url),github_url:clean(form.github_url),gitlab_url:clean(form.gitlab_url),avatar_url:clean(form.avatar_url),updated_at:new Date().toISOString()},{onConflict:"developer_id"});setMessage(error?error.message:"Developer profile saved.");setSaving(false)}
 if(loading)return <div className="glass-page mx-auto max-w-3xl p-8 text-slate-400">Loading profile…</div>;
 if(!userId)return <div className="glass-page mx-auto max-w-3xl p-8 text-slate-300">Sign in to manage your developer profile.</div>;
 return <div className="glass-page mx-auto max-w-3xl space-y-6 pb-20"><div><Link href="/dashboard" className="text-sm text-indigo-300">← Dashboard</Link><h1 className="mt-4 text-3xl font-bold text-white">Developer profile</h1><p className="mt-2 text-slate-400">Public information shown on your Luma Store developer page.</p></div>{message&&<div className="rounded-xl border border-slate-700 bg-slate-900/70 p-4 text-sm text-slate-200">{message}</div>}<form onSubmit={save} className="space-y-5 rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
 {([["display_name","Display name"],["avatar_url","Avatar URL"],["website_url","Website"],["github_url","GitHub"],["gitlab_url","GitLab"]] as const).map(([k,l])=><div key={k}><label className="mb-2 block text-sm text-slate-300">{l}</label><input value={form[k]} onChange={e=>set(k,e.target.value)} className={input}/></div>)}
 <div><label className="mb-2 block text-sm text-slate-300">Bio</label><textarea rows={5} value={form.bio} onChange={e=>set("bio",e.target.value)} className={input}/></div>
 <button disabled={saving} className="rounded-xl bg-indigo-600 px-5 py-2.5 font-medium text-white disabled:opacity-50">{saving?"Saving…":"Save profile"}</button>
 </form></div>
}