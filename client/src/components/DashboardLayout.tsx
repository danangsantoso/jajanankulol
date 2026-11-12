import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Archive, BarChart3, Building2, ChevronLeft, ClipboardList, LayoutDashboard, LogOut, Menu, Printer, QrCode, ReceiptText, Settings2, ShoppingBasket, Tags, UsersRound } from "lucide-react";
import React, { useState } from "react";
import { useLocation } from "wouter";
import BranchSwitcher from "./BranchSwitcher";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const [collapsed, setCollapsed] = useState(() => typeof window !== "undefined" && window.innerWidth < 768);
  const isSuperadmin = user?.role === "superadmin";
  const workspace = trpc.workspace.current.useQuery(undefined, { enabled: !!user && !isSuperadmin, retry: false });
  const isTenantAdmin = workspace.data?.isTenantAdmin;
  const isBranchAdmin = workspace.data?.isBranchAdmin;
  const subscription = workspace.data?.subscription;
  const whatsapp = trpc.platform.publicSettings.useQuery(undefined, { enabled: !!user && !isSuperadmin });
  const whatsappNumber = whatsapp.data?.whatsappNumber?.replace(/\D/g, "");
  const whatsappUrl = whatsappNumber ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsapp.data?.whatsappMessage || "Halo Jajananku, saya ingin memilih paket langganan.")}` : "/";
  const isCashier = workspace.data?.membershipRole === "cashier";
  const menus = isSuperadmin
    ? [{ icon: LayoutDashboard, label: "Tenant & paket", path: "/superadmin" }, { icon: UsersRound, label: "Semua pengguna", path: "/superadmin/pengguna" }, { icon: Settings2, label: "Pengaturan", path: "/superadmin/pengaturan" }]
    : isCashier
      ? [{ icon: ShoppingBasket, label: "Kasir", path: "/pos" }]
      : [{ icon: LayoutDashboard, label: "Ringkasan", path: "/dashboard" }, { icon: Tags, label: "Produk", path: "/produk" }, { icon: Archive, label: "Arsip Produk", path: "/produk/arsip" }, { icon: ClipboardList, label: "Stok", path: "/stok" }, { icon: QrCode, label: "Cetak QR", path: "/label-qr" }, { icon: ReceiptText, label: "Transaksi", path: "/transaksi" }, { icon: BarChart3, label: "Keuangan", path: "/laporan" }, ...(isTenantAdmin ? [{ icon: Tags, label: "Promo", path: "/promo" }, { icon: Building2, label: "Cabang", path: "/cabang" }, { icon: UsersRound, label: "Pengguna", path: "/pengguna" }, { icon: Printer, label: "Printer & struk", path: "/pengaturan-struk" }, { icon: Settings2, label: "Profil usaha", path: "/profil-usaha" }] : [])];

  return <div className="min-h-screen bg-[#f7fcfb] text-[#173832]">
    <aside className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-[#d7eee9] bg-white/95 p-3 shadow-[8px_0_30px_rgba(17,114,103,.04)] transition-all ${collapsed ? "w-[76px]" : "w-[260px]"}`}>
      <div className={`flex h-14 items-center gap-2 px-1 ${collapsed ? "justify-center" : "justify-between"}`}>
        {collapsed ? <button type="button" aria-label="Buka menu sidebar" title="Buka menu" onClick={() => setCollapsed(false)} className="grid h-10 w-10 place-items-center rounded-xl text-[#0d756c] transition hover:bg-[#dff7f2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d756c]"><Menu className="h-6 w-6" /></button> : <>
          <button type="button" onClick={() => setLocation(isSuperadmin ? "/superadmin" : isCashier ? "/pos" : "/dashboard")} className="flex min-w-0 items-center gap-2" aria-label="Beranda Jajananku"><img src="/manus-storage/jajananku-logo_5fd59c99.png" alt="Logo Jajananku" className="h-9 w-9 rounded-xl object-cover" /><span className="font-display text-xl font-extrabold tracking-tight text-[#0d756c]">Jajananku</span></button>
          <Button variant="ghost" size="icon" aria-label="Ringkas sidebar" title="Ringkas sidebar" className="h-8 w-8" onClick={() => setCollapsed(true)}><ChevronLeft className="h-4 w-4" /></Button>
        </>}
      </div>
      <div className={`mt-5 px-1 ${collapsed ? "hidden" : ""}`}>{!isSuperadmin && !isCashier && <BranchSwitcher />}</div>
      <nav className="mt-5 space-y-1">{menus.map(item => { const Icon = item.icon; const active = location === item.path; return <button key={item.path} onClick={() => setLocation(item.path)} title={item.label} className={`flex h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-bold transition ${active ? "bg-[#dff7f2] text-[#0b756b]" : "text-[#5b746d] hover:bg-[#effaf8] hover:text-[#0b756b]"}`}><Icon className="h-[18px] w-[18px] shrink-0" /><span className={collapsed ? "hidden" : ""}>{item.label}</span></button>; })}</nav>
      <div className="mt-auto border-t border-[#e5f2ef] pt-3"><div className={`mb-3 rounded-xl bg-[#effaf8] p-3 ${collapsed ? "hidden" : ""}`}><p className="truncate text-sm font-extrabold">{user?.name || "Pengguna"}</p><p className="mt-1 truncate text-xs text-[#64827a]">{isSuperadmin ? "Superadmin" : isTenantAdmin ? "Admin Utama" : isBranchAdmin ? "Admin Cabang" : "Kasir"}</p></div><Button variant="ghost" className="w-full justify-start gap-3 px-3 text-[#64827a] hover:text-red-600" onClick={logout}><LogOut className="h-[18px] w-[18px] shrink-0" /><span className={collapsed ? "hidden" : ""}>Keluar</span></Button></div>
    </aside>
    <main className={`min-h-screen transition-all ${collapsed ? "pl-[76px]" : "pl-[260px]"}`}><div className="mx-auto max-w-7xl p-4 md:p-8">{!isSuperadmin && subscription && <div className={`mb-5 rounded-2xl border p-4 ${subscription.allowed ? "border-[#b9eadf] bg-[#edfcf8] text-[#176b60]" : "border-[#f5c2be] bg-[#fff1f0] text-[#9d342d]"}`}><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-extrabold">{subscription.allowed ? subscription.state === "trial" ? `Masa coba aktif${subscription.daysRemaining !== null ? ` · ${subscription.daysRemaining} hari tersisa` : ""}` : `Paket aktif${subscription.daysRemaining !== null ? ` · ${subscription.daysRemaining} hari tersisa` : ""}` : "Akses perlu diperpanjang"}</p><p className="mt-1 text-sm">{subscription.allowed ? "Pilih paket sebelum masa aktif berakhir agar operasional tidak terhenti." : subscription.message}</p></div><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => setLocation("/")}>Pilih paket</Button><a href={whatsappUrl} target={whatsappNumber ? "_blank" : undefined} rel="noreferrer"><Button size="sm">Hubungi admin</Button></a></div></div></div>}{children}</div></main>
  </div>;
}
