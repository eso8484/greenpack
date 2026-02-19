import ProductCard from "./ProductCard";
import type { Product } from "@/types";

interface ProductGridProps {
  products: Product[];
  shopName: string;
}

export default function ProductGrid({ products, shopName }: ProductGridProps) {
  if (products.length === 0) return null;

  return (
    <section>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Products</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            shopName={shopName}
          />
        ))}
      </div>
    </section>
  );
}
