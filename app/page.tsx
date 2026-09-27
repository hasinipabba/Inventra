import BackgroundVideo from "@/components/BackgroundVideo";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import PageBackground from "@/components/PageBackground";
import Features from "@/components/Features";
import Workflow from "@/components/Workflow";
import Solutions from "@/components/Solutions";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main className="relative min-h-screen w-full bg-[#18191D]">
      <Navbar />

      {/* Hero viewport */}
      <div className="relative h-screen w-full overflow-hidden">
        <BackgroundVideo src="/videos/hero-bg.mp4" />
        <Hero />
        {/* Seam blend */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[15] h-40 bg-gradient-to-b from-transparent to-[#18191D]" />
      </div>

      {/* Cinematic ambient background for everything below the Hero */}
      <PageBackground />

      <Features id="features" />
      <Workflow id="workflow" />
      <Solutions id="solutions" />
      <Footer />
    </main>
  );
}