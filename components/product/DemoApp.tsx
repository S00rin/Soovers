"use client";
import { lazy, Suspense, useEffect, useState } from "react";
import "../product/product.css";
const Academy = lazy(() => import("../education/F5Academy"));
const Industrial = lazy(() => import("../ics/IcsAcademy"));
const Tower = lazy(() => import("../tower/TowerApp"));
export default function DemoApp() {
  const [route, setRoute] = useState(location.hash);
  useEffect(() => {
    const sync = () => setRoute(location.hash);
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  const legacy = route === "#demo" || route === "#f5" || route === "#tower";
  return (
    <>
      {legacy && (
        <div className="preview-bar course-mode-bar">
          <span>نمای سه‌بعدی و تعاملی · مسیر مطالعهٔ معمولی هم در دسترس است</span>
          <a href="#ics">آموزش معمولی بدون عینک ←</a>
        </div>
      )}
      <Suspense
        fallback={
          <div className="product-loading" role="status">
            در حال آماده‌سازی آکادمی…
          </div>
        }
      >
        {route === "#tower" ? (
          <Tower />
        ) : route === "#demo" || route === "#f5" ? (
          <Academy />
        ) : (
          <Industrial />
        )}
      </Suspense>
    </>
  );
}
