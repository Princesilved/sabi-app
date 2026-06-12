"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

type BusinessContextValue = {
  businessId: Id<"businesses"> | null;
  businessName: string | null;
  businessType: string | null;
  role: string | null;
  businesses: any[] | undefined;
  permissions: string[];
  can: (perm: string) => boolean;
  switchBusiness: (id: Id<"businesses">) => void;
  loading: boolean;
};

const BusinessContext = createContext<BusinessContextValue | null>(null);
const STORAGE_KEY = "sabi:activeBusinessId";

export function BusinessProvider({ children }: { children: ReactNode }) {
  const businesses = useQuery(api.businesses.list);
  const [businessId, setBusinessId] = useState<Id<"businesses"> | null>(null);

  useEffect(() => {
    if (!businesses) return;
    if (businesses.length === 0) {
      setBusinessId(null);
      return;
    }
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && businesses.find((b: any) => b._id === stored)) {
      setBusinessId(stored as Id<"businesses">);
    } else {
      setBusinessId(businesses[0]._id);
      localStorage.setItem(STORAGE_KEY, businesses[0]._id);
    }
  }, [businesses]);

  const perms = useQuery(
    api.businesses.myPermissions,
    businessId ? { businessId } : "skip"
  );

  const switchBusiness = (id: Id<"businesses">) => {
    setBusinessId(id);
    localStorage.setItem(STORAGE_KEY, id);
  };

  const currentBusiness = businesses?.find((b: any) => b._id === businessId);
  const permissions = perms?.permissions ?? [];
  const can = (perm: string) => (permissions as string[]).includes(perm);

  return (
    <BusinessContext.Provider
      value={{
        businessId,
        businessName: currentBusiness?.name ?? null,
        businessType: currentBusiness?.type ?? null,
        role: perms?.role ?? currentBusiness?.role ?? null,
        businesses,
        permissions,
        can,
        switchBusiness,
        loading: businesses === undefined,
      }}
    >
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusiness() {
  const ctx = useContext(BusinessContext);
  if (!ctx) throw new Error("useBusiness must be used inside BusinessProvider");
  return ctx;
}
