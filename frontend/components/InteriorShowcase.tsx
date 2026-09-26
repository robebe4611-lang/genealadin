import Image from "next/image";
import Reveal from "./Reveal";

export default function InteriorShowcase() {
  return (
    <section id="about" className="scroll-mt-24 bg-walnut px-6 py-24 sm:px-10">
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
        <Reveal className="relative aspect-[4/3] overflow-hidden rounded-2xl">
          <Image
            src="/images/hawam-interior.jpg"
            alt="סלון מעוצב עם וילונות HAWAM"
            fill
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-cover"
          />
        </Reveal>
        <Reveal delay={0.15}>
          <p className="text-sm uppercase tracking-[0.3em] text-sand">
            לכל חלל בבית
          </p>
          <h2 className="mt-4 font-serif text-3xl text-ivory sm:text-4xl">
            מסלון ועד חדר שינה — פתרון וילונות אחד שמדבר בשפה שלכם
          </h2>
          <p className="mt-6 max-w-md text-ivory/75">
            אנחנו מגיעים אליכם הביתה, מודדים, מציעים בדים וסגנונות שמתאימים
            לאור ולריהוט הקיים, ומלווים אתכם מהבחירה ועד ההתקנה הסופית.
          </p>
          <a
            href="#contact"
            className="mt-8 inline-flex rounded-full bg-sand px-8 py-3 text-sm font-medium text-charcoal transition hover:bg-ivory"
          >
            לתיאום מדידה בבית
          </a>
        </Reveal>
      </div>
    </section>
  );
}
