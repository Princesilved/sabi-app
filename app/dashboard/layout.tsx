"use client";

import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Sidebar, MobileNav } from "@/components/dashboard/sidebar";
import { BusinessProvider, useBusiness } from "@/components/dashboard/business-context";

function DashboardGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const me = useQuery(api.users.me);
  const businesses = useQuery(api.businesses.list);

  useEffect(() => {
    if (me === null) {
      router.replace("/onboarding");
      return;
    }
    if (me && !me.onboarded) {
      router.replace("/onboarding");
      return;
    }
    if (businesses && businesses.length === 0) {
      router.replace("/onboarding");
    }
  }, [me, businesses, router]);

  if (me === undefined || businesses === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-ink/50 text-sm">Loading…</div>
      </div>
    );
  }

  if (!me || !me.onboarded || (businesses && businesses.length === 0)) {
    return null;
  }

  return <>{children}</>;
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <DashboardGuard>
      <BusinessProvider>
        <div className="min-h-screen flex">
          <Sidebar />
          <main className="flex-1 pb-20 lg:pb-0">{children}</main>
          <MobileNav />
        </div>
      </BusinessProvider>
    </DashboardGuard>
  );
}
