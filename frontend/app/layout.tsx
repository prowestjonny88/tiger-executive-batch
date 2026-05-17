import "./globals.css";
import type { Metadata } from "next";
import { Inter, Manrope, Poppins } from "next/font/google";
import { AppHeader } from "../components/layout/app-header";
import { AppFooter } from "../components/layout/app-footer";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: "RExharge Precision Flow",
  description: "Confidence-aware EV charger troubleshooting with a premium technical-manual interface.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="light">
      <body className={`${inter.variable} ${manrope.variable} ${poppins.variable} min-h-screen bg-background flex flex-col font-sans text-foreground`}>
        <AppHeader />

        <main className="flex-1 flex flex-col w-full relative">
          {children}
        </main>

        <AppFooter />
      </body>
    </html>
  );
}
