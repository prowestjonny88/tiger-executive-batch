import "./globals.css";
import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Manrope, Space_Grotesk } from "next/font/google";
import { AppHeader } from "../components/layout/app-header";
import { AppFooter } from "../components/layout/app-footer";
import { Toaster } from "../components/ui/sonner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-space-grotesk",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "RExharge Precision Flow",
  description: "Confidence-aware EV charger troubleshooting with a premium technical-manual interface.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="light">
      <body className={`${inter.variable} ${manrope.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} min-h-screen bg-background flex flex-col font-sans text-foreground`}>
        <AppHeader />

        <main className="flex-1 flex flex-col w-full relative">
          {children}
        </main>

        <AppFooter />
        <Toaster richColors />
      </body>
    </html>
  );
}
