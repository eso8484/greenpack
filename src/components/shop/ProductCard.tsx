"use client";

import Image from "next/image";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import PriceTag from "@/components/ui/PriceTag";
import Badge from "@/components/ui/Badge";
import { useCart } from "@/hooks/useCart";
import type { Product } from "@/types";

interface ProductCardProps {
  product: Product;
  shopName: string;
}

export default function ProductCard({ product, shopName }: ProductCardProps) {
  const { addItem } = useCart();

  const handleAdd = () => {
    addItem({
      id: product.id,
      type: "product",
      shopId: product.shopId,
      shopName,
      name: product.name,
      price: product.price,
      quantity: 1,
      image: product.image,
    });
  };

  return (
    <Card>
      <div className="relative aspect-square bg-gray-100">
        <Image
          src={product.image}
          alt={product.name}
          fill
          className="object-cover"
          unoptimized
        />
        {!product.inStock && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <Badge variant="red">Out of Stock</Badge>
          </div>
        )}
      </div>
      <div className="p-3">
        <h4 className="font-medium text-gray-900 text-sm mb-1 leading-tight">
          {product.name}
        </h4>
        <PriceTag
          price={product.price}
          originalPrice={product.originalPrice}
          className="mb-2"
        />
        <Button
          size="sm"
          className="w-full"
          onClick={handleAdd}
          disabled={!product.inStock}
        >
          {product.inStock ? "Add to Cart" : "Sold Out"}
        </Button>
      </div>
    </Card>
  );
}
