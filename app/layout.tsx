import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "Sabi — Africa's AI Operating System for Business",
  description:
    "The AI manager, accountant, and marketer your business has been waiting for.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var t = localStorage.getItem('sabi:theme') || 'system';
                  var dark = t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
                  if (dark) document.documentElement.classList.add('dark');
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="grain">
        <Providers>
          {children}
          <Toaster
            position="bottom-center"
            toastOptions={{
              style: {
                background: "var(--inverse-bg)",
                color: "var(--inverse-text)",
                border: "1px solid var(--border)",
                borderRadius: "12px",
                fontFamily: "DM Sans, sans-serif",
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
