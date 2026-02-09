"use client";

import Button from "@/components/ui/Button";
import PriceTag from "@/components/ui/PriceTag";
import Badge from "@/components/ui/Badge";
import { useCart } from "@/hooks/useCart";
import { toast } from "sonner";
import type { Service } from "@/types";

interface ServiceCardProps {
  service: Service;
  shopName: string;
}

export default function ServiceCard({ service, shopName }: ServiceCardProps) {
  const { addItem } = useCart();

  const handleAdd = () => {
    addItem({
      id: service.id,
      type: "service",
      shopId: service.shopId,
      shopName,
      name: service.name,
      price: service.price,
      quantity: 1,
    });
    toast.success("Service added to cart", {
      description: `${service.name} from ${shopName}`,
    });
  };

  return (
    <div className="flex items-start justify-between gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-green-200 dark:hover:border-green-800 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="font-medium text-gray-900 dark:text-white">{service.name}</h4>
          {!service.isAvailable && <Badge variant="red">Unavailable</Badge>}
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{service.description}</p>
        <div className="flex items-center gap-3">
          <PriceTag price={service.price} priceType={service.priceType} />
          {service.duration && (
            <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {service.duration}
            </span>
          )}
        </div>
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={handleAdd}
        disabled={!service.isAvailable}
      >
        Add
      </Button>
    </div>
  );
}
