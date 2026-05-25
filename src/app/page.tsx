import { dbGetShops, dbGetProductsByShopId } from "@/lib/db";
import { categories } from "@/lib/data/categories";
import HeroSection, { type HeroDeal } from "@/components/home/HeroSection";
import CategoryNav from "@/components/home/CategoryNav";
import TrendingShops from "@/components/home/TrendingShops";
import FeaturedShops from "@/components/home/FeaturedShops";
import StatsBand from "@/components/home/StatsBand";
import VideoHighlights from "@/components/home/VideoHighlights";
import DiscoveryWall from "@/components/home/DiscoveryWall";
import TrustSection from "@/components/home/TrustSection";
import CTABanner from "@/components/home/CTABanner";

export default async function Home() {
  // Fetch the real shop catalog once, then derive every section's data from it
  // (one DB round-trip instead of one per section). Nothing here is fabricated.
  const allShops = await dbGetShops();

  const featured = allShops.filter((s) => s.isFeatured);
  const topRated = [...allShops]
    .sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount)
    .slice(0, 10);
  const featuredOrTop = (featured.length ? featured : topRated).slice(0, 6);

  // Discovery wall: prefer shops not already shown as "featured" to reduce
  // repetition, but fall back to the full list when the catalog is small.
  const featuredIds = new Set(featuredOrTop.map((s) => s.id));
  const remaining = allShops.filter((s) => !featuredIds.has(s.id));
  const discovery = (remaining.length >= 5 ? remaining : allShops).slice(0, 15);

  const videoShops = allShops.filter((s) => Boolean(s.video?.url)).slice(0, 6);

  // Hero deal carousel: up to 5 featured (or top-rated) shops. For each, look
  // up its products and compute a REAL "% off" from originalPrice vs price —
  // nothing is invented; shops without a markdown fall back to a truthful
  // "Featured / Top rated / Verified" badge in the carousel component.
  const dealShops = (featured.length ? featured : topRated).slice(0, 5);
  const deals: HeroDeal[] = await Promise.all(
    dealShops.map(async (shop) => {
      let discountPct = 0;
      try {
        const products = await dbGetProductsByShopId(shop.id);
        for (const p of products) {
          if (p.originalPrice && p.originalPrice > p.price) {
            const pct = Math.round((1 - p.price / p.originalPrice) * 100);
            if (pct > discountPct) discountPct = pct;
          }
        }
      } catch {
        // products are optional decoration here — never block the hero
      }
      return {
        id: shop.id,
        name: shop.name,
        href: `/shop/${shop.id}`,
        image: shop.images.thumbnail,
        category: shop.categoryName,
        rating: shop.rating,
        reviewCount: shop.reviewCount,
        isVerified: shop.isVerified,
        isFeatured: shop.isFeatured,
        discountPct: discountPct > 0 ? discountPct : undefined,
      };
    })
  );

  const stats = {
    shops: allShops.length,
    verified: allShops.filter((s) => s.isVerified).length,
    categories: categories.length,
    areas: new Set(
      allShops.map((s) => s.location.city?.trim().toLowerCase()).filter(Boolean)
    ).size,
  };

  return (
    <div className="pb-4">
      <HeroSection deals={deals} />
      <CategoryNav />
      <TrendingShops shops={topRated} />
      <FeaturedShops shops={featuredOrTop} />
      <StatsBand {...stats} />
      <VideoHighlights shops={videoShops} />
      <DiscoveryWall shops={discovery} />
      <TrustSection />
      <CTABanner />
    </div>
  );
}
