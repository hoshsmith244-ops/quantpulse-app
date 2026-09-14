import { Footer } from "@/components/landing/footer";
import { Hero } from "@/components/landing/hero";
import { MetricsSection } from "@/components/landing/metrics-section";
import { Pricing } from "@/components/landing/pricing";
import { SiteNav } from "@/components/landing/site-nav";
import { Workflow } from "@/components/landing/workflow";

export default function LandingPage() {
  return (
    <div className="min-h-dvh">
      <SiteNav />
      <main>
        <Hero />
        <MetricsSection />
        <Workflow />
        <Pricing />
      </main>
      <Footer />
    </div>
  );
}
