import type { Metadata, Viewport } from "next";
import { Press_Start_2P, VT323 } from "next/font/google";
import "./globals.css";
import HelpLink from "@/components/HelpLink";

const pressStart = Press_Start_2P({
  variable: "--font-press-start",
  weight: "400",
  subsets: ["latin"],
});

const vt323 = VT323({
  variable: "--font-vt323",
  weight: "400",
  subsets: ["latin"],
});

const DESCRIPTION =
  "Party mini-games for two players or a roomful — half of them co-op, all of them behind one room code. No accounts, no installs.";

export const metadata: Metadata = {
  title: { default: "Web Arcade", template: "%s · Web Arcade" },
  description: DESCRIPTION,
  applicationName: "Web Arcade",

  robots: { index: true, follow: true },
  openGraph: {
    title: "Web Arcade",
    description: DESCRIPTION,
    type: "website",
    siteName: "Web Arcade",
  },
  twitter: { card: "summary", title: "Web Arcade", description: DESCRIPTION },
  appleWebApp: { capable: true, title: "Arcade", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
};

export const dynamic = "force-dynamic";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#06030d",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${pressStart.variable} ${vt323.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <HelpLink />
      </body>
    </html>
  );
}
