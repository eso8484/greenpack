import ShopCard from "./ShopCard";
import EmptyState from "@/components/ui/EmptyState";
import type { Shop } from "@/types";

interface ShopGridProps {
  shops: Shop[];
}

export default function ShopGrid({ shops }: ShopGridProps) {
  if (shops.length === 0) {
    return (
      <EmptyState
        title="No shops found"
        description="Try adjusting your search or browse a different category."
        actionLabel="Browse All"
        actionHref="/browse"
      />
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
      {shops.map((shop) => (
        <ShopCard key={shop.id} shop={shop} />
      ))}
    </div>
  );
}
