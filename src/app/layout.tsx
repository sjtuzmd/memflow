import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// Note: Geist font is not available by default in Next.js
// If you want to use Geist, you'll need to install @vercel/geist package
// and configure it according to their documentation

export const metadata: Metadata = {
  title: "Flow of Memory",
  description: "Organize and relive your precious memories with AI-powered photo management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
