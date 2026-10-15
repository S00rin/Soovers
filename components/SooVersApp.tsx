"use client";
import ProductApp, { ProductBoundary } from "./product/ProductApp";
export default function SooVersApp() {
  return (
    <ProductBoundary>
      <ProductApp />
    </ProductBoundary>
  );
}
