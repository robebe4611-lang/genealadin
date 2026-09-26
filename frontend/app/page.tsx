import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Collections from "@/components/Collections";
import TextureBanner from "@/components/TextureBanner";
import InteriorShowcase from "@/components/InteriorShowcase";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Collections />
        <TextureBanner />
        <InteriorShowcase />
      </main>
      <Footer />
    </>
  );
}
