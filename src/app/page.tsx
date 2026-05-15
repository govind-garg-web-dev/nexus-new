import SmoothScroll from "@/components/SmoothScroll";
import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import ProblemSection from "@/components/landing/ProblemSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import HowItWorks from "@/components/landing/HowItWorks";
import TrustSection from "@/components/landing/TrustSection";
import CommunitySection from "@/components/landing/CommunitySection";
import WaitlistSection from "@/components/landing/WaitlistSection";
import Footer from "@/components/landing/Footer";

export default function HomePage() {
  return (
    <SmoothScroll>
      <Navbar />
      <main>
        <Hero />
        <ProblemSection />
        <FeaturesSection />
        <HowItWorks />
        <TrustSection />
        <CommunitySection />
        <WaitlistSection />
      </main>
      <Footer />
    </SmoothScroll>
  );
}
