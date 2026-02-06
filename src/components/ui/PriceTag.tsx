import { formatPrice, formatPriceType } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Service } from "@/types";

interface PriceTagProps {
  price: number;
  originalPrice?: number;
  priceType?: Service["priceType"];
  className?: string;
}

export default function PriceTag({
  price,
  originalPrice,
  priceType,
  className,
}: PriceTagProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="text-lg font-bold text-green-600">
        {priceType ? formatPriceType(price, priceType) : formatPrice(price)}
      </span>
      {originalPrice && originalPrice > price && (
        <span className="text-sm text-gray-400 line-through">
          {formatPrice(originalPrice)}
        </span>
      )}
      {originalPrice && originalPrice > price && (
        <span className="text-xs font-medium text-red-500">
          -{Math.round(((originalPrice - price) / originalPrice) * 100)}%
        </span>
      )}
    </div>
  );
}
