"use client";

import { ReactNode } from "react";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { ThemeProvider } from "@/components/theme-provider";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <ClerkProvider
        appearance={{
          variables: {
            colorPrimary: "#D44621",
            fontFamily: "DM Sans, system-ui, sans-serif",
            borderRadius: "12px",
          },
        }}
      >
        <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
          {children}
        </ConvexProviderWithClerk>
      </ClerkProvider>
    </ThemeProvider>
  );
}
