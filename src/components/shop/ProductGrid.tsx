import ProductCard from "./ProductCard";
import type { Product } from "@/types";

interface ProductGridProps {
  products: Product[];
  shopName: string;
}

export default function ProductGrid({ products, shopName }: ProductGridProps) {
  if (products.length === 0) return null;

  return (
    <section id="products" className="scroll-mt-24">
      <div className="mb-4">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-500/10 text-accent-600 dark:text-accent-400 px-3 py-1 text-[11px] font-bold uppercase tracking-wider mb-2">
          <span className="material-symbols-outlined text-[14px] fill-1">shopping_bag</span>
          Shop
        </span>
        <h2 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
          Products
        </h2>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} shopName={shopName} />
        ))}
      </div>
    </section>
  );
}
