import BackgroundVideo from "@/components/BackgroundVideo";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";

export default function Home() {
  return (
    <main className="relative h-screen w-full overflow-hidden bg-[#0a0b0d]">
      <BackgroundVideo src="/videos/hero-bg.mp4" />
      <Navbar />
      <Hero />
    </main>
  );
}