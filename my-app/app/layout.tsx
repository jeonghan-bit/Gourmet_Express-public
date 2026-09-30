import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import AuthProvider from "./auth/Provider";
import { Toaster } from "@/components/ui/toaster";
import NavBarWrapper from "./NavBarWrapper";
import { Providers } from "./providers";
import Footer from "@/components/Footer";
import { MainContent } from "./MainContent";
import { STORE_CONFIG } from "@/lib/storeConfig";
const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: `${STORE_CONFIG.name} Chinese Food (${STORE_CONFIG.address.street})`,
  description: `${STORE_CONFIG.name} Kipling for a great Chinese food experience`,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <html lang="en" data-theme="light">
        <head>
          {}
        </head>
        <body className={inter.className}>
          <Providers>
            <div className="min-h-screen flex flex-col">
              <NavBarWrapper />
              <MainContent>{children}</MainContent>
              <Footer />
            </div>
          </Providers>
          <Toaster />
        </body>
      </html>
    </AuthProvider>
  );
}
