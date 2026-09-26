import type { Metadata } from "next";
import { Heebo, Frank_Ruhl_Libre } from "next/font/google";
import "./globals.css";
import "lenis/dist/lenis.css";
import SmoothScroll from "@/components/SmoothScroll";

const heebo = Heebo({
  variable: "--font-heebo",
  subsets: ["hebrew", "latin"],
});

const frankRuhlLibre = Frank_Ruhl_Libre({
  variable: "--font-frank-ruhl",
  subsets: ["hebrew", "latin"],
  weight: ["500", "700"],
});

export const metadata: Metadata = {
  title: "HAWAM Design — וילונות ועיצוב פנים בהתאמה אישית",
  description:
    "סטודיו HAWAM Design מתמחה בוילונות מעוצבים, תפירה והתקנה בהתאמה אישית לבית שלכם.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="he"
      dir="rtl"
      className={`${heebo.variable} ${frankRuhlLibre.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-ivory font-sans text-walnut">
        <SmoothScroll>{children}</SmoothScroll>
      </body>
    </html>
  );
}
