"use client";
import { useEffect } from "react";
export default function PwaRegistration(){useEffect(()=>{if("serviceWorker" in navigator){navigator.serviceWorker.register("/sw.js",{scope:"/"}).catch(error=>console.warn("Luma Store service worker registration failed",error))}},[]);return null}
