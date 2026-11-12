import { useAuth } from "@/_core/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { Redirect } from "wouter";
import DashboardLayout from "./DashboardLayout";

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const { loading, user } = useAuth();

  if (loading) {
    return <div className="grid min-h-screen place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }
  if (user && user.role !== "admin") return <Redirect to="/pos" />;
  return <DashboardLayout>{children}</DashboardLayout>;
}
