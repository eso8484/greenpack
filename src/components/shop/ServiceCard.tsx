"use client";

import Image from "next/image";
import Button from "@/components/ui/Button";
import PriceTag from "@/components/ui/PriceTag";
import Badge from "@/components/ui/Badge";
import { useCart } from "@/hooks/useCart";
import { BLUR_PLACEHOLDER } from "@/lib/utils";
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
      image: service.image,
    });
    toast.success("Service added to cart", {
      description: `${service.name} from ${shopName}`,
    });
  };

  const galleryCount = service.gallery?.length ?? 0;
  const mainImage = service.image || service.gallery?.[0];

  return (
    <div className="flex items-start gap-4 p-4 rounded-2xl bg-white dark:bg-gray-800/70 border border-gray-100 dark:border-gray-700/70 hover:border-green-300 dark:hover:border-green-700 hover:shadow-lg hover:shadow-green-500/5 transition-all">
      {mainImage && (
        <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden shrink-0 bg-gray-100 dark:bg-gray-800">
          <Image
            src={mainImage}
            alt={service.name}
            fill
            className="object-cover"
            unoptimized
            placeholder="blur"
            blurDataURL={BLUR_PLACEHOLDER}
          />
          {galleryCount > 1 && (
            <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
              +{galleryCount - 1}
            </span>
          )}
        </div>
      )}
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
              <span className="material-symbols-outlined text-[15px]">schedule</span>
              {service.duration}
            </span>
          )}
        </div>
      </div>
      <Button
        size="sm"
        onClick={handleAdd}
        disabled={!service.isAvailable}
        className="shrink-0"
      >
        {service.isAvailable ? "Book Now" : "Unavailable"}
      </Button>
    </div>
  );
}
