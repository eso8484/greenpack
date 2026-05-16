import { notFound } from "next/navigation";
import ShopHeader from "@/components/shop/ShopHeader";
import VideoShowcase from "@/components/shop/VideoShowcase";
import ServiceList from "@/components/shop/ServiceList";
import ProductGrid from "@/components/shop/ProductGrid";
import ShopContactInfo from "@/components/shop/ShopContactInfo";
import ReviewSection from "@/components/shop/ReviewSection";
import {
  dbGetShopById,
  dbGetServicesByShopId,
  dbGetProductsByShopId,
  dbGetReviewsByShopId,
} from "@/lib/db";
import type { Metadata } from "next";

interface ShopPageProps {
  params: Promise<{ shopId: string }>;
}

export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({
  params,
}: ShopPageProps): Promise<Metadata> {
  const { shopId } = await params;
  const shop = await dbGetShopById(shopId);
  if (!shop) return { title: "Shop Not Found" };
  return {
    title: `${shop.name} - GreenPack`,
    description: shop.shortDescription,
  };
}

export default async function ShopPage({ params }: ShopPageProps) {
  const { shopId } = await params;

  let shop, shopServices, shopProducts, shopReviews;
  try {
    shop = await dbGetShopById(shopId);
    if (!shop) notFound();

    [shopServices, shopProducts, shopReviews] = await Promise.all([
      dbGetServicesByShopId(shop.id),
      dbGetProductsByShopId(shop.id),
      dbGetReviewsByShopId(shop.id),
    ]);
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err && String((err as { digest: string }).digest).startsWith("NEXT_NOT_FOUND")) throw err;
    console.error("ShopPage load failed for", shopId, err);
    throw err;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <ShopHeader shop={shop} />

      <div className="mt-8 flex flex-col lg:flex-row gap-8">
        {/* Main content */}
        <div className="flex-1 min-w-0 space-y-8">
          <VideoShowcase shop={shop} />
          <ServiceList services={shopServices} shopName={shop.name} />
          <ProductGrid products={shopProducts} shopName={shop.name} />
          <ReviewSection reviews={shopReviews} />
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-80 shrink-0">
          <div className="lg:sticky lg:top-24">
            <ShopContactInfo shop={shop} />
          </div>
        </div>
      </div>
    </div>
  );
}
