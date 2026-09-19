"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * Wraps next-themes so the app can offer Light / Dark / System instead of
 * being locked to one look - Platinum (the "dark" theme) is a deliberate
 * identity, but daytime hospital admin staff shouldn't be stuck in it.
 * `attribute="class"` toggles the `.dark` class globals.css already keys
 * its tokens off; `defaultTheme="system"` respects the OS preference until
 * someone picks one explicitly.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </NextThemesProvider>
  );
}
