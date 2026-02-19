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
  const hasDiscount = originalPrice && originalPrice > price;
  const discountPct = hasDiscount
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : 0;

  return (
    <div className={cn("flex items-center gap-2 flex-wrap", className)}>
      <span className="text-lg font-bold text-gray-900 dark:text-white">
        {priceType ? formatPriceType(price, priceType) : formatPrice(price)}
      </span>
      {hasDiscount && (
        <>
          <span className="text-sm text-gray-400 dark:text-gray-500 line-through">
            {formatPrice(originalPrice)}
          </span>
          <span className="text-xs font-bold text-white bg-red-500 rounded-md px-1.5 py-0.5">
            -{discountPct}%
          </span>
        </>
      )}
    </div>
  );
}
