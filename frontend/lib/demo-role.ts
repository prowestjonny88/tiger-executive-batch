"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export type DemoRole = "customer" | "staff";

export function useDemoRoleGuard(expectedRole: DemoRole) {
  const router = useRouter();

  useEffect(() => {
    const currentRole = window.localStorage.getItem("chargerdoc_role");
    if (currentRole !== expectedRole) {
      router.replace("/login");
    }
  }, [expectedRole, router]);
}

export function saveDemoCustomerProfile(profile: object) {
  window.localStorage.setItem("chargerdoc_customer_profile", JSON.stringify(profile));
}

export function loadDemoCustomerProfile<T>() {
  const raw = window.localStorage.getItem("chargerdoc_customer_profile");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    window.localStorage.removeItem("chargerdoc_customer_profile");
    return null;
  }
}
