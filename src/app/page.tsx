import { dbGetShops } from "@/lib/db";
import { categories } from "@/lib/data/categories";
import HeroSection from "@/components/home/HeroSection";
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
      <HeroSection />
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
