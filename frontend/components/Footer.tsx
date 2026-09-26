export default function Footer() {
  return (
    <footer
      id="contact"
      className="scroll-mt-24 bg-charcoal px-6 py-16 text-ivory sm:px-10"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-10 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <span className="font-serif text-2xl">HAWAM Design</span>
          <p className="mt-3 max-w-xs text-sm text-ivory/60">
            סטודיו וילונות ופתרונות טקסטיל לבית — עיצוב, תפירה והתקנה
            בהתאמה אישית.
          </p>
        </div>
        <div className="text-sm text-ivory/80">
          <p>054-000-0000</p>
          <p className="mt-2">hello@hawamdesign.com</p>
          <a
            href="https://instagram.com"
            className="mt-4 inline-block underline decoration-sand/60 underline-offset-4 hover:text-sand"
          >
            Instagram
          </a>
        </div>
      </div>
      <p className="mx-auto mt-12 max-w-6xl border-t border-ivory/10 pt-6 text-xs text-ivory/40">
        © {new Date().getFullYear()} HAWAM Design. כל הזכויות שמורות.
      </p>
    </footer>
  );
}
