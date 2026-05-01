import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://pay.abgespeichert.com"),
  applicationName: "OpenPay",
  title: {
    default: "OpenPay",
    template: "%s | OpenPay",
  },
  description:
    "OpenPay is a lightweight Solana payment processor for creating short-lived payment links, tracking live payment status, and settling funds automatically.",
  keywords: [
    "OpenPay",
    "Solana",
    "crypto payments",
    "payment links",
    "payment processor",
    "Next.js",
  ],
  authors: [
    {
      name: "abgespeichert",
      url: "https://github.com/abgespeichert2",
    },
  ],
  creator: "abgespeichert",
  publisher: "abgespeichert",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    url: "https://pay.abgespeichert.com",
    siteName: "OpenPay",
    title: "OpenPay",
    description:
      "Create short-lived Solana payment links with live status polling, Redis-backed state, per-payment wallets, and automatic settlement.",
  },
  twitter: {
    card: "summary",
    title: "OpenPay",
    description:
      "Create short-lived Solana payment links with live status polling and automatic settlement.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
    >
      <body className="min-h-full antialiased">
        {children}
      </body>
    </html>
  );
}
