import { dbGetShops, dbGetProductsByShopId } from "@/lib/db";
import { categories } from "@/lib/data/categories";
import HeroSection, { type HeroDeal } from "@/components/home/HeroSection";
import TrendingShops from "@/components/home/TrendingShops";
import FeaturedShops from "@/components/home/FeaturedShops";
import StatsBand from "@/components/home/StatsBand";
import VideoHighlights from "@/components/home/VideoHighlights";
import DiscoveryWall from "@/components/home/DiscoveryWall";
import TrustSection from "@/components/home/TrustSection";
import CTABanner from "@/components/home/CTABanner";
import { CategoryRail } from "@/components/browse/CategorySidebar";

export default async function Home() {
  // Fetch the real shop catalog once, then derive every section's data from it
  // (one DB round-trip instead of one per section). Nothing here is fabricated.
  const allShops = await dbGetShops();

  // Promoted list: elite shops lead, then the featured shops that are not
  // already there. `isElite` is only ever true on a shop an admin approved, so
  // with nothing approved `promoted` is empty and `ranked` is exactly the
  // pre-elite `featured || topRated` fallback — the homepage is unchanged until
  // a real shop earns the tier.
  const elite = allShops.filter((s) => s.isElite);
  const featured = allShops.filter((s) => s.isFeatured);
  const promoted = [...elite, ...featured.filter((s) => !s.isElite)];
  const topRated = [...allShops]
    .sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount)
    .slice(0, 10);
  const ranked = promoted.length ? promoted : topRated;

  // Nine, not six: the grid is `lg:grid-cols-3`, so three shops per row fills
  // three complete rows. It was six back when the category grid sat below the
  // hero and took the vertical space; with that block gone the shops carry the
  // page themselves.
  const featuredOrTop = ranked.slice(0, 9);

  // Trending is elite-led but is NOT `ranked` — `ranked` already feeds
  // `featuredOrTop` and the hero carousel, and reusing it here would render the
  // same shops in the same order in two adjacent sections. Elite is hoisted to
  // the front and the non-elite remainder keeps its rating order, so the section
  // stays a ratings list that merely prefers elite. With nothing approved `elite`
  // is empty and this is exactly `topRated` — which is the point.
  const trending = [...elite, ...topRated.filter((s) => !s.isElite)].slice(0, 10);

  // Discovery wall: prefer shops not already shown as "featured" to reduce
  // repetition, but fall back to the full list when the catalog is small.
  // Twenty rather than fifteen so the 5-up `xl` grid stays full for four rows.
  const featuredIds = new Set(featuredOrTop.map((s) => s.id));
  const remaining = allShops.filter((s) => !featuredIds.has(s.id));
  const discovery = (remaining.length >= 5 ? remaining : allShops).slice(0, 20);

  const videoShops = allShops.filter((s) => Boolean(s.video?.url)).slice(0, 6);

  // Hero deal carousel: up to 5 promoted shops, same order as the sections
  // below so an elite shop leads the carousel too. For each, look up its
  // products and compute a REAL "% off" from originalPrice vs price — nothing is
  // invented; shops without a markdown fall back to a truthful "Elite partner /
  // Featured / Top rated / Verified" badge in the carousel component.
  const dealShops = ranked.slice(0, 5);
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
        isElite: shop.isElite,
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
    // `relative` is load-bearing, not decoration: `CategoryRail` is `absolute`,
    // so without a positioned ancestor it would resolve against the initial
    // containing block — the document — and `top-8` would land it at y=32, i.e.
    // *behind* the 80px sticky header. This div is the first thing in `<main>`,
    // so it already begins below the header in the flow, and `top-8` inside it
    // resolves to the same on-screen 112px the rail used to get from `fixed
    // top-28`. `position: relative` with `z-index: auto` creates no stacking
    // context, so the rail's `z-40` still paints over `HeroSection`'s `z-20`.
    <div className="relative pb-4">
      {/* The homepage's only category entry point, and it is collapsed: nine
          group icons in the top-left corner, each expanding its subcategories
          rightward on hover. `absolute`, so it is out of flow and the hero-
          leads-shops order below is untouched — every home section self-wraps
          with its own `max-w-7xl mx-auto px-4 md:px-6` and an in-flow rail
          would nest containers and double both. Being absolute rather than
          fixed is also what keeps it off the sections below: it scrolls away
          with the hero instead of hanging over whatever text passes under it. */}
      <CategoryRail />
      <HeroSection deals={deals} />
      <TrendingShops shops={trending} />
      <FeaturedShops shops={featuredOrTop} />
      <StatsBand {...stats} />
      <VideoHighlights shops={videoShops} />
      <DiscoveryWall shops={discovery} />
      <TrustSection />
      <CTABanner />
    </div>
  );
}
