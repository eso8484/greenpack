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

  // Column counts follow the sidebar's width, which is now the rail's own 216px
  // (12rem + its `p-3`) rather than the 512px it reserved while it was holding a
  // column open for a subcategory panel. Both thresholds were set against that
  // 512px and both were wrong once it went away.
  //
  // At `lg` (1024px) the container is 992px inner, so the sidebar and the `gap-8`
  // leave 744px: three up is 232px, two is 360px. Three only becomes reasonable
  // here, which is why it starts at `lg` rather than `md`. At `xl` (1280px) the
  // content column is 1000px and four up is 232px again — the same card size the
  // homepage's 5-up `DiscoveryWall` renders at that width, so it is a size this
  // design already calls comfortable rather than a squeezed one. Below `lg` there
  // is no sidebar, so the two-up base is unchanged.
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
      {shops.map((shop) => (
        <ShopCard key={shop.id} shop={shop} />
      ))}
    </div>
  );
}
