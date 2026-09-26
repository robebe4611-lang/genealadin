export default function Header() {
  return (
    <header className="fixed inset-x-0 top-0 z-30 px-4 pt-4 sm:px-8">
      <div className="mx-auto flex max-w-6xl items-center justify-between rounded-full bg-charcoal/60 px-6 py-3 backdrop-blur-md">
        <span className="font-serif text-xl tracking-wide text-ivory">
          HAWAM
        </span>
        <nav className="hidden gap-8 text-sm text-ivory/85 sm:flex">
          <a href="#collections" className="transition hover:text-ivory">
            קולקציות
          </a>
          <a href="#about" className="transition hover:text-ivory">
            אודות
          </a>
          <a href="#contact" className="transition hover:text-ivory">
            צור קשר
          </a>
        </nav>
        <a
          href="#contact"
          className="rounded-full border border-ivory/50 px-5 py-2 text-sm text-ivory transition hover:border-ivory hover:bg-ivory/10"
        >
          ייעוץ חינם
        </a>
      </div>
    </header>
  );
}
