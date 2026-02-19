import HeroSection from "@/components/home/HeroSection";
import CategoryNav from "@/components/home/CategoryNav";
import FeaturedShops from "@/components/home/FeaturedShops";
import VideoHighlights from "@/components/home/VideoHighlights";
import TrustSection from "@/components/home/TrustSection";
import CTABanner from "@/components/home/CTABanner";

export default function Home() {
  return (
    <>
      <HeroSection />
      <CategoryNav />
      <FeaturedShops />
      <VideoHighlights />
      <TrustSection />
      <CTABanner />
    </>
  );
}
