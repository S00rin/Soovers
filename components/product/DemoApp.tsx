'use client';
import {lazy,Suspense,useEffect,useState} from 'react';
import {ArrowLeft} from 'lucide-react';
import '../product/product.css';
const Academy=lazy(()=>import('../education/F5Academy'));
const Tower=lazy(()=>import('../tower/TowerApp'));
// Static hosting has no account API. This explicit entrypoint never renders login.
export default function DemoApp(){
 const [tower,setTower]=useState(location.hash==='#tower');
 useEffect(()=>{const sync=()=>setTower(location.hash==='#tower');window.addEventListener('hashchange',sync);return()=>window.removeEventListener('hashchange',sync);},[]);
 return <><div className="preview-bar"><span>دموی تعاملی · بدون ثبت‌نام · تعیین سطح اختیاری · ذخیره در همین مرورگر</span><a href={tower?'#demo':'#tower'}>{tower?'آکادمی F5':'پردیس سه‌بعدی'}<ArrowLeft size={14}/></a></div><Suspense fallback={<div className="product-loading" role="status">در حال آماده‌سازی دمو…</div>}>{tower?<Tower/>:<Academy/>}</Suspense></>;
}
