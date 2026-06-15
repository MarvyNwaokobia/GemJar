import type { Metadata, Viewport } from "next";
import { DM_Sans, Nunito } from "next/font/google";
import { WalletProvider } from "@/components/providers/WalletProvider";
import "./globals.css";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["700", "800", "900"],
  variable: "--font-nunito",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-dm-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "GemJar - Match, Save, Win",
  description:
    "A match-3 puzzle game with a daily stablecoin prize pool and a savings jar that grows every time you play.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${nunito.variable} ${dmSans.variable}`}>
      <body>
        <WalletProvider>{children}</WalletProvider>
      </body>
    </html>
  );
}
