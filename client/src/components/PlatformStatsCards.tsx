import { Card, CardContent } from "@/components/ui/card";
import { Building2, CircleCheckBig, ShieldCheck, UsersRound } from "lucide-react";
import React from "react";

export type PlatformStats = {
  tenants: { total: number; active: number; trial: number; suspended: number };
  users: { total: number; active: number; superadmin: number; adminUtama: number; adminCabang: number; kasir: number };
};

export default function PlatformStatsCards({ stats, isLoading }: { stats?: PlatformStats; isLoading?: boolean }) {
  const value = (amount?: number) => isLoading ? "…" : amount ?? 0;
  return <section aria-label="Ringkasan platform" className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
    <Card className="border-0 bg-gradient-to-br from-[#e8fbf6] to-white shadow-sm"><CardContent className="p-5"><div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-muted-foreground">Total tenant</p><p className="mt-2 font-display text-3xl font-extrabold text-[#0d5c52]">{value(stats?.tenants.total)}</p></div><Building2 className="h-5 w-5 text-primary" /></div><p className="mt-3 text-xs text-muted-foreground">Semua usaha yang terdaftar</p></CardContent></Card>
    <Card className="border-0 bg-gradient-to-br from-[#eefaf0] to-white shadow-sm"><CardContent className="p-5"><div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-muted-foreground">Tenant aktif</p><p className="mt-2 font-display text-3xl font-extrabold text-[#18734f]">{value(stats?.tenants.active)}</p></div><CircleCheckBig className="h-5 w-5 text-[#18734f]" /></div><p className="mt-3 text-xs text-muted-foreground">{value(stats?.tenants.trial)} trial · {value(stats?.tenants.suspended)} nonaktif</p></CardContent></Card>
    <Card className="border-0 bg-gradient-to-br from-[#edf5ff] to-white shadow-sm"><CardContent className="p-5"><div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-muted-foreground">Pengguna aktif</p><p className="mt-2 font-display text-3xl font-extrabold text-[#26689f]">{value(stats?.users.active)}</p></div><UsersRound className="h-5 w-5 text-[#26689f]" /></div><p className="mt-3 text-xs text-muted-foreground">dari {value(stats?.users.total)} akun tersimpan</p></CardContent></Card>
    <Card className="border-0 bg-gradient-to-br from-[#fff8e8] to-white shadow-sm"><CardContent className="p-5"><div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-muted-foreground">Komposisi role</p><p className="mt-2 font-display text-2xl font-extrabold text-[#9b6800]">{value(stats?.users.adminUtama)} admin utama</p></div><ShieldCheck className="h-5 w-5 text-[#bd8712]" /></div><p className="mt-3 text-xs text-muted-foreground">{value(stats?.users.adminCabang)} admin cabang · {value(stats?.users.kasir)} kasir</p></CardContent></Card>
  </section>;
}
