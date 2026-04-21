"use client";

import { useAuth } from "@/lib/firebase/context";
import { useRouter } from "next/navigation";
import { ReactNode, useEffect } from "react";

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: string[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login");
      } else if (allowedRoles && role && !allowedRoles.includes(role)) {
        router.push("/unauthorized"); // or redirect to their respective dashboard
      }
    }
  }, [user, role, loading, allowedRoles, router]);

  if (loading) {
    return <div style={{ padding: "2rem", textAlign: "center" }}>Loading access...</div>;
  }

  if (!user || (allowedRoles && role && !allowedRoles.includes(role))) {
    return null; // Will redirect in useEffect
  }

  return <>{children}</>;
}
