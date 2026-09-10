import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { PLATFORM } from "@/lib/config/brand";
import { AuthProvider } from "@/context/auth-provider";
import { AppDataProvider } from "@/context/app-data-provider";
import { MessagesProvider } from "@/context/messages-provider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: `${PLATFORM.name} — ${PLATFORM.tagline}`,
  description: PLATFORM.description,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <TooltipProvider delayDuration={200}>
          <AuthProvider>
            <AppDataProvider>
              <MessagesProvider>
                {children}
                <Toaster richColors closeButton position="top-right" />
              </MessagesProvider>
            </AppDataProvider>
          </AuthProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}
