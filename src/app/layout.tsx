import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ChosusQT's Tier List",
  description: "Minecraft PvP tier rankings",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" style={{ margin: 0, padding: 0, background: '#0b0b0e' }}>
      <body className={inter.className} style={{ margin: 0, padding: 0, background: '#0b0b0e' }}>
        {children}
      </body>
    </html>
  );
}
