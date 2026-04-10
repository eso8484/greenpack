import { notFound } from "next/navigation";
import ShopHeader from "@/components/shop/ShopHeader";
import VideoShowcase from "@/components/shop/VideoShowcase";
import ServiceList from "@/components/shop/ServiceList";
import ProductGrid from "@/components/shop/ProductGrid";
import ShopContactInfo from "@/components/shop/ShopContactInfo";
import ReviewSection from "@/components/shop/ReviewSection";
import {
  getShopById,
  getServicesByShopId,
  getProductsByShopId,
  getReviewsByShopId,
} from "@/lib/utils";
import { shops } from "@/lib/data/shops";
import type { Metadata } from "next";

interface ShopPageProps {
  params: Promise<{ shopId: string }>;
}

export async function generateStaticParams() {
  return shops.map((shop) => ({ shopId: shop.id }));
}

export async function generateMetadata({
  params,
}: ShopPageProps): Promise<Metadata> {
  const { shopId } = await params;
  const shop = getShopById(shopId);
  if (!shop) return { title: "Shop Not Found" };
  return {
    title: `${shop.name} - GreenPack`,
    description: shop.shortDescription,
  };
}

export default async function ShopPage({ params }: ShopPageProps) {
  const { shopId } = await params;
  const shop = getShopById(shopId);

  if (!shop) notFound();

  const shopServices = getServicesByShopId(shopId);
  const shopProducts = getProductsByShopId(shopId);
  const shopReviews = getReviewsByShopId(shopId);

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
