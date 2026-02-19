import HeroSection from "@/components/home/HeroSection";
import CategoryNav from "@/components/home/CategoryNav";
import FeaturedShops from "@/components/home/FeaturedShops";
import HowItWorks from "@/components/home/HowItWorks";
import PromoBanner from "@/components/home/PromoBanner";
import TrustSignals from "@/components/home/TrustSignals";

export default function Home() {
  return (
    <>
      <HeroSection />
      <CategoryNav />
      <FeaturedShops />
      <TrustSignals />
      <PromoBanner />
      <HowItWorks />
    </>
  );
}
