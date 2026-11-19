"use client";

import { SessionProvider } from "next-auth/react";
import { SWRConfig } from "swr";
import { ThemeProvider } from "@/components/theme";
import { fetcher } from "@/lib/client";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        <SWRConfig value={{ fetcher, revalidateOnFocus: false }}>
          {children}
        </SWRConfig>
      </ThemeProvider>
    </SessionProvider>
  );
}
