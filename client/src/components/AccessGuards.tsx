import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";
import React from "react";
import { Redirect } from "wouter";
import DashboardLayout from "./DashboardLayout";

function Loading() {
  return <div className="grid min-h-screen place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
}

export function WorkspaceGuard({ children, adminOnly = false, tenantOwnerOnly = false, posOnly = false }: { children: React.ReactNode; adminOnly?: boolean; tenantOwnerOnly?: boolean; posOnly?: boolean }) {
  const { loading, user } = useAuth();
  const workspace = trpc.workspace.current.useQuery(undefined, { enabled: !!user, retry: false });
  if (loading || workspace.isLoading) return <Loading />;
  if (!user) return <Redirect to="/login" />;
  if (user.passwordChangeRequired === "yes") return <Redirect to="/ganti-password" />;
  if (workspace.error || !workspace.data) return <div className="grid min-h-screen place-items-center p-6 text-center"><div><h1 className="font-display text-3xl font-bold">Akses tenant belum tersedia</h1><p className="mt-3 text-muted-foreground">Minta superadmin untuk menambahkan akun Anda ke tenant dan cabang yang sesuai.</p></div></div>;
  if (tenantOwnerOnly && !workspace.data.isTenantAdmin) return <Redirect to={workspace.data.membershipRole === "cashier" ? "/pos" : "/dashboard"} />;
  if (posOnly && workspace.data.membershipRole !== "cashier") return <Redirect to="/dashboard" />;
  if (adminOnly && !workspace.data.isTenantAdmin && !workspace.data.isBranchAdmin) return <Redirect to="/pos" />;
  if (posOnly) return <>{children}</>;
  return <DashboardLayout>{children}</DashboardLayout>;
}

export function SuperadminGuard({ children }: { children: React.ReactNode }) {
  const { loading, user } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Redirect to="/login" />;
  if (user.passwordChangeRequired === "yes") return <Redirect to="/ganti-password" />;
  if (user.role !== "superadmin") return <Redirect to="/dashboard" />;
  return <DashboardLayout>{children}</DashboardLayout>;
}
