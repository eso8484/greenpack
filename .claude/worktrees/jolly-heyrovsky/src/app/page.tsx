import HeroSection from "@/components/home/HeroSection";
import CategoryNav from "@/components/home/CategoryNav";
import FeaturedShops from "@/components/home/FeaturedShops";
import HowItWorks from "@/components/home/HowItWorks";

export default function Home() {
  return (
    <>
      <HeroSection />
      <CategoryNav />
      <FeaturedShops />
      <HowItWorks />
    </>
  );
}
