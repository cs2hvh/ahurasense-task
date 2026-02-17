import type { Metadata } from "next";
import { Open_Sans } from "next/font/google";

import { AppProviders } from "@/components/providers/app-providers";
import { APP_NAME } from "@/lib/constants";
import "./globals.css";

const openSans = Open_Sans({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-open-sans",
});

export const metadata: Metadata = {
  title: APP_NAME,
  description: "Ahurasense project management and issue tracking system",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${openSans.variable} font-sans antialiased`}>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}


