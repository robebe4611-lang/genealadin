import Image from "next/image";
import Reveal from "./Reveal";

const items = [
  {
    src: "/images/soft-roman.jpeg",
    title: "רומאי רך",
    desc: "קפל אחיד לחלונות קטנים ובינוניים",
  },
  {
    src: "/images/roman-curtain.jpeg",
    title: "רומאי קלאסי",
    desc: "קווים נקיים לחדרי עבודה ולסלון",
  },
  {
    src: "/images/sheer-living-room.jpeg",
    title: "שיפון שקוף",
    desc: "אור מלא רכות, לפרוזדורים ולסלון",
  },
  {
    src: "/images/custom-curtains.jpeg",
    title: "תפירה מיוחדת",
    desc: "בד ודוגמה נבחרים, בהזמנה אישית",
  },
];

export default function Collections() {
  return (
    <section
      id="collections"
      className="scroll-mt-24 bg-ivory px-6 py-24 sm:px-10"
    >
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <p className="text-sm uppercase tracking-[0.3em] text-walnut/60">
            קולקציות
          </p>
          <h2 className="mt-3 max-w-lg font-serif text-3xl text-walnut sm:text-4xl">
            כל סגנון וילון, מותאם לבית שלכם
          </h2>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item, i) => (
            <Reveal key={item.title} delay={i * 0.1}>
              <div className="group relative aspect-[3/4] overflow-hidden rounded-2xl bg-walnut/5">
                <Image
                  src={item.src}
                  alt={item.title}
                  fill
                  sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                  className="object-cover transition duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-charcoal/70 via-transparent to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5">
                  <h3 className="font-serif text-xl text-ivory">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-sm text-ivory/75">{item.desc}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
