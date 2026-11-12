import PageHeading from "@/components/PageHeading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatRupiah } from "@/lib/format";
import { trpc } from "@/lib/trpc";
import PlatformStatsCards from "@/components/PlatformStatsCards";
import { Ban, Building2, KeyRound, PackageCheck, Pencil, Plus, ShieldCheck, Tag, Trash2 } from "lucide-react";
import React, { useMemo, useState } from "react";
import { toast } from "sonner";

type Tier = "bronze" | "silver" | "gold" | "platinum";
type Availability = "available" | "coming_soon" | "archived";
type PlanForm = { id?: number; name: string; tier: Tier; durationDays: string; branchLimit: string; cashierLimit: string; regularPrice: string; salePrice: string; availability: Availability };

const emptyPlan = (): PlanForm => ({ name: "Bronze 1 Bulan", tier: "bronze", durationDays: "30", branchLimit: "2", cashierLimit: "2", regularPrice: "357000", salePrice: "257000", availability: "available" });
const dateLabel = (value?: Date | string | null) => value ? new Date(value).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "—";
const tierLabel = (tier: Tier) => tier[0].toUpperCase() + tier.slice(1);

export default function SuperadminPage() {
  const statistics = trpc.superadmin.statistics.useQuery();
  const tenants = trpc.superadmin.tenants.useQuery();
  const plans = trpc.superadmin.plans.list.useQuery();
  const utils = trpc.useUtils();
  const [tenantName, setTenantName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [email, setEmail] = useState("");
  const [initialPassword, setInitialPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [tenantToDelete, setTenantToDelete] = useState<NonNullable<typeof tenants.data>[number] | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [planForm, setPlanForm] = useState<PlanForm>(emptyPlan);
  const [tenantPlanSelections, setTenantPlanSelections] = useState<Record<number, string>>({});
  const selectedTenant = useMemo(() => tenants.data?.find(tenant => tenant.id === Number(tenantId)), [tenantId, tenants.data]);
  const availablePlans = plans.data?.filter(plan => plan.isActive === "yes" && plan.availability === "available") || [];

  const refresh = async () => {
    await Promise.all([utils.superadmin.statistics.invalidate(), utils.superadmin.tenants.invalidate(), utils.superadmin.plans.list.invalidate(), utils.platform.plans.invalidate()]);
  };
  const create = trpc.superadmin.createTenant.useMutation({ onSuccess: async () => { toast.success("Tenant dibuat dengan masa coba 3 hari."); setTenantName(""); await refresh(); }, onError: error => toast.error(error.message) });
  const createAdmin = trpc.superadmin.createAdmin.useMutation({ onSuccess: async () => { toast.success("Admin Utama dibuat. Ia wajib mengganti kata sandi saat login pertama."); setAdminName(""); setEmail(""); setInitialPassword(""); setPasswordConfirmation(""); await refresh(); }, onError: error => toast.error(error.message) });
  const deleteTenant = trpc.superadmin.deleteTenant.useMutation({ onSuccess: async result => { toast.success(`Usaha ${result.deletedTenantName} dan data operasionalnya telah dihapus.`); setTenantToDelete(null); setDeleteConfirmation(""); await refresh(); }, onError: error => toast.error(error.message) });
  const savePlan = trpc.superadmin.plans.save.useMutation({ onSuccess: async () => { toast.success("Paket berhasil disimpan."); setPlanForm(emptyPlan()); await refresh(); }, onError: error => toast.error(error.message) });
  const deletePlan = trpc.superadmin.plans.delete.useMutation({ onSuccess: async result => { toast.success(result.archived ? "Paket pernah digunakan sehingga diarsipkan." : "Paket berhasil dihapus."); setPlanForm(emptyPlan()); await refresh(); }, onError: error => toast.error(error.message) });
  const setSubscription = trpc.superadmin.accounts.setSubscription.useMutation({ onSuccess: async data => { toast.success(`${data.planName} aktif hingga ${dateLabel(data.endsAt)}.`); await refresh(); }, onError: error => toast.error(error.message) });
  const setTenantStatus = trpc.superadmin.accounts.setTenantStatus.useMutation({ onSuccess: refresh, onError: error => toast.error(error.message) });
  const setUserStatus = trpc.superadmin.accounts.setUserStatus.useMutation({ onSuccess: refresh, onError: error => toast.error(error.message) });
  const resetPassword = trpc.superadmin.accounts.resetPassword.useMutation({ onSuccess: () => toast.success("Kata sandi admin berhasil direset dan akun diaktifkan."), onError: error => toast.error(error.message) });
  const updateTenant = trpc.superadmin.updateTenant.useMutation({ onSuccess: async () => { toast.success("Data usaha diperbarui."); await refresh(); }, onError: error => toast.error(error.message) });
  const updateAdmin = trpc.superadmin.updateAdmin.useMutation({ onSuccess: async () => { toast.success("Data Admin Utama diperbarui."); await refresh(); }, onError: error => toast.error(error.message) });
  const deleteAdmin = trpc.superadmin.deleteAdmin.useMutation({ onSuccess: async () => { toast.success("Admin Utama dihapus dari usaha."); await refresh(); }, onError: error => toast.error(error.message) });

  const resetAdmin = (userId?: number | null) => {
    if (!userId) return toast.error("Admin utama belum tersedia.");
    const newPassword = window.prompt("Masukkan kata sandi baru untuk admin (minimal 8 karakter):");
    if (newPassword && newPassword.length >= 8) resetPassword.mutate({ userId, newPassword });
    else if (newPassword) toast.error("Kata sandi minimal 8 karakter.");
  };
  const editTenantName = (tenant: NonNullable<typeof tenants.data>[number]) => {
    const name = window.prompt("Nama usaha:", tenant.name);
    if (name && name.trim() !== tenant.name) updateTenant.mutate({ tenantId: tenant.id, name });
  };
  const editTenantAdmin = (tenant: NonNullable<typeof tenants.data>[number]) => {
    const admin = tenant.admin;
    if (!admin?.adminUserId) return toast.error("Admin Utama belum tersedia.");
    const name = window.prompt("Nama Admin Utama:", admin.adminName || "");
    if (!name) return;
    const email = window.prompt("Email Admin Utama:", admin.adminEmail || "");
    if (email) updateAdmin.mutate({ tenantId: tenant.id, userId: admin.adminUserId, name, email });
  };
  const removeTenantAdmin = (tenant: NonNullable<typeof tenants.data>[number]) => {
    const admin = tenant.admin;
    if (!admin?.adminUserId) return toast.error("Admin Utama belum tersedia.");
    if (window.confirm(`Hapus Admin Utama ${admin.adminEmail} dari usaha ${tenant.name}?`)) deleteAdmin.mutate({ tenantId: tenant.id, userId: admin.adminUserId });
  };
  const editPlan = (plan: NonNullable<typeof plans.data>[number]) => setPlanForm({ id: plan.id, name: plan.name, tier: plan.tier, durationDays: String(plan.durationDays), branchLimit: String(plan.branchLimit), cashierLimit: String(plan.cashierLimit), regularPrice: String(plan.regularPrice), salePrice: plan.salePrice ? String(plan.salePrice) : "", availability: plan.availability });
  const submitPlan = () => savePlan.mutate({ id: planForm.id, name: planForm.name, tier: planForm.tier, durationDays: Number(planForm.durationDays), branchLimit: Number(planForm.branchLimit), cashierLimit: Number(planForm.cashierLimit), regularPrice: Number(planForm.regularPrice || 0), salePrice: planForm.salePrice ? Number(planForm.salePrice) : null, isActive: planForm.availability === "archived" ? "no" : "yes", availability: planForm.availability, sortOrder: plans.data?.length || 0 });

  return <div className="mx-auto max-w-7xl">
    <PageHeading eyebrow="Control center" title="Platform & langganan" description="Kelola pelanggan dan berikan paket yang masa aktif serta kuotanya melekat pada masing-masing usaha." />
    <PlatformStatsCards stats={statistics.data} isLoading={statistics.isLoading} />
    <div className="mt-6 grid gap-6 xl:grid-cols-[.8fr_1.2fr]">
      <div className="space-y-6">
        <Card className="border-0 shadow-sm"><CardContent className="p-6">
          <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/10 text-primary"><Plus className="h-5 w-5" /></div><div><h2 className="font-display text-xl font-extrabold">Pelanggan baru</h2><p className="text-xs text-muted-foreground">Tenant baru langsung mendapat trial Bronze selama 3 hari.</p></div></div>
          <form className="mt-5 space-y-4" onSubmit={event => { event.preventDefault(); create.mutate({ name: tenantName }); }}><div><Label>Nama brand atau UMKM</Label><Input required value={tenantName} onChange={event => setTenantName(event.target.value)} placeholder="Contoh: Rasa Nusantara" /></div><Button className="w-full" disabled={create.isPending}>Buat tenant</Button></form>
        </CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-6">
          <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-2xl bg-[#fff5d9] text-[#bd8712]"><ShieldCheck className="h-5 w-5" /></div><div><h2 className="font-display text-xl font-extrabold">Admin utama usaha</h2><p className="text-xs text-muted-foreground">Admin utama melihat seluruh cabang dan mengelola pengguna usaha.</p></div></div>
          <form className="mt-5 space-y-4" onSubmit={event => { event.preventDefault(); if (initialPassword !== passwordConfirmation) return toast.error("Konfirmasi kata sandi belum sama."); if (selectedTenant) createAdmin.mutate({ tenantId: selectedTenant.id, name: adminName, email, initialPassword }); }}><div><Label>Usaha</Label><Select value={tenantId} onValueChange={setTenantId}><SelectTrigger><SelectValue placeholder="Pilih usaha" /></SelectTrigger><SelectContent>{tenants.data?.map(tenant => <SelectItem key={tenant.id} value={String(tenant.id)}>{tenant.name}</SelectItem>)}</SelectContent></Select></div><div><Label>Nama Admin Utama</Label><Input required value={adminName} onChange={event => setAdminName(event.target.value)} placeholder="Nama penanggung jawab" /></div><div><Label>Email admin utama</Label><Input required type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="admin@brand.com" /></div><div className="grid gap-3 sm:grid-cols-2"><div><Label>Kata sandi awal</Label><Input required type="password" minLength={8} value={initialPassword} onChange={event => setInitialPassword(event.target.value)} placeholder="Minimal 8 karakter" /></div><div><Label>Konfirmasi sandi awal</Label><Input required type="password" minLength={8} value={passwordConfirmation} onChange={event => setPasswordConfirmation(event.target.value)} placeholder="Ulangi kata sandi" /></div></div><p className="rounded-xl bg-[#f2fbf9] p-3 text-xs leading-5 text-[#58736d]">Admin Utama akan diminta membuat kata sandi pribadi saat pertama kali masuk.</p><Button className="w-full" disabled={!selectedTenant?.defaultBranchId || createAdmin.isPending}>Buat Admin Utama</Button></form>
        </CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-6">
          <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-2xl bg-[#e8f8f4] text-primary"><Tag className="h-5 w-5" /></div><div><h2 className="font-display text-xl font-extrabold">Katalog paket</h2><p className="text-xs text-muted-foreground">Atur level, durasi, kuota, harga normal, dan harga promo.</p></div></div>
          <form className="mt-5 space-y-3" onSubmit={event => { event.preventDefault(); submitPlan(); }}>
            <div><Label>Nama paket</Label><Input required value={planForm.name} onChange={event => setPlanForm({ ...planForm, name: event.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3"><div><Label>Level</Label><Select value={planForm.tier} onValueChange={(tier: Tier) => setPlanForm({ ...planForm, tier })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{(["bronze", "silver", "gold", "platinum"] as Tier[]).map(tier => <SelectItem key={tier} value={tier}>{tierLabel(tier)}</SelectItem>)}</SelectContent></Select></div><div><Label>Durasi hari</Label><Input type="number" min="1" value={planForm.durationDays} onChange={event => setPlanForm({ ...planForm, durationDays: event.target.value })} /></div></div>
            <div className="grid grid-cols-2 gap-3"><div><Label>Maksimal outlet</Label><Input type="number" min="1" value={planForm.branchLimit} onChange={event => setPlanForm({ ...planForm, branchLimit: event.target.value })} /></div><div><Label>Maksimal kasir</Label><Input type="number" min="1" value={planForm.cashierLimit} onChange={event => setPlanForm({ ...planForm, cashierLimit: event.target.value })} /></div></div>
            <div className="grid grid-cols-2 gap-3"><div><Label>Harga normal</Label><Input type="number" min="0" value={planForm.regularPrice} onChange={event => setPlanForm({ ...planForm, regularPrice: event.target.value })} /></div><div><Label>Harga promo</Label><Input type="number" min="0" value={planForm.salePrice} onChange={event => setPlanForm({ ...planForm, salePrice: event.target.value })} placeholder="Opsional" /></div></div>
            <div><Label>Ketersediaan</Label><Select value={planForm.availability} onValueChange={(availability: Availability) => setPlanForm({ ...planForm, availability })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="available">Tersedia</SelectItem><SelectItem value="coming_soon">Coming soon</SelectItem><SelectItem value="archived">Diarsipkan</SelectItem></SelectContent></Select></div>
            <div className="flex gap-2"><Button className="flex-1" disabled={savePlan.isPending}>{planForm.id ? "Simpan perubahan" : "Tambah paket"}</Button>{planForm.id && <Button type="button" variant="outline" onClick={() => setPlanForm(emptyPlan())}>Batal</Button>}</div>
          </form>
        </CardContent></Card>
      </div>
      <div className="space-y-6">
        <Card className="border-0 shadow-sm"><CardContent className="p-6">
          <div className="flex items-center justify-between gap-3"><div><h2 className="font-display text-2xl font-extrabold">Pelanggan terdaftar</h2><p className="text-sm text-muted-foreground">Pilih paket per usaha; pilihan tenant lain tidak ikut berubah.</p></div><Badge variant="secondary">{tenants.data?.length || 0} usaha</Badge></div>
          <div className="mt-5 space-y-3">{tenants.data?.map(tenant => {
            const selectedPlanId = tenantPlanSelections[tenant.id] || String(tenant.activePlan?.id || "");
            const active = tenant.status === "active" && tenant.subscriptionStatus !== "suspended";
            const adminUserId = tenant.admin?.adminUserId;
            return <div className="rounded-2xl border border-[#e2f2ee] p-4" key={tenant.id}>
              <div className="flex flex-wrap items-start justify-between gap-3"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[#e7fbf7] text-primary"><Building2 className="h-5 w-5" /></div><div><p className="font-extrabold">{tenant.name}</p><p className="text-xs text-muted-foreground">{tenant.admin?.adminEmail || "Admin utama belum ditentukan"}</p><p className="mt-1 text-xs font-semibold text-primary">{tenant.activePlan?.name || "Trial Bronze"}</p></div></div><Badge className={tenant.subscriptionStatus === "active" ? "bg-[#e0f8ed] text-[#18734f]" : tenant.subscriptionStatus === "trial" ? "bg-[#fff4d6] text-[#a86f00]" : "bg-[#fee9e8] text-[#b3362d]"}>{tenant.subscriptionStatus === "trial" ? `Trial hingga ${dateLabel(tenant.trialEndsAt)}` : tenant.subscriptionStatus === "active" ? `Aktif hingga ${dateLabel(tenant.subscriptionEndsAt)}` : tenant.subscriptionStatus}</Badge></div>
              <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]"><Select value={selectedPlanId} onValueChange={value => setTenantPlanSelections(current => ({ ...current, [tenant.id]: value }))}><SelectTrigger><SelectValue placeholder="Pilih paket untuk usaha ini" /></SelectTrigger><SelectContent>{availablePlans.map(plan => <SelectItem key={plan.id} value={String(plan.id)}>{plan.name} · {plan.branchLimit} outlet · {plan.cashierLimit} kasir</SelectItem>)}</SelectContent></Select><Button onClick={() => selectedPlanId && setSubscription.mutate({ tenantId: tenant.id, planId: Number(selectedPlanId) })} disabled={!selectedPlanId || setSubscription.isPending}><PackageCheck className="mr-1.5 h-4 w-4" />Berikan paket</Button></div>
              <div className="mt-3 flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => editTenantName(tenant)}><Pencil className="mr-1.5 h-3.5 w-3.5" />Edit usaha</Button><Button size="sm" variant="outline" onClick={() => setTenantStatus.mutate({ tenantId: tenant.id, status: active ? "suspended" : "active" })}><Ban className="mr-1.5 h-3.5 w-3.5" />{active ? "Nonaktifkan usaha" : "Aktifkan usaha"}</Button><Button size="sm" variant="outline" onClick={() => resetAdmin(adminUserId)}><KeyRound className="mr-1.5 h-3.5 w-3.5" />Reset password admin</Button>{adminUserId && <><Button size="sm" variant="outline" onClick={() => editTenantAdmin(tenant)}><Pencil className="mr-1.5 h-3.5 w-3.5" />Edit admin</Button><Button size="sm" variant="ghost" onClick={() => setUserStatus.mutate({ userId: adminUserId, status: "inactive" })}>Nonaktifkan admin</Button><Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => removeTenantAdmin(tenant)}><Trash2 className="mr-1.5 h-3.5 w-3.5" />Hapus admin</Button></>}<Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => { setTenantToDelete(tenant); setDeleteConfirmation(""); }}><Trash2 className="mr-1.5 h-3.5 w-3.5" />Hapus usaha</Button></div>
            </div>;
          }) || <p className="py-10 text-center text-muted-foreground">Belum ada usaha.</p>}</div>
        </CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-6">
          <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-2xl bg-[#e8f8f4] text-primary"><PackageCheck className="h-5 w-5" /></div><div><h2 className="font-display text-xl font-extrabold">Daftar paket</h2><p className="text-xs text-muted-foreground">Paket yang pernah digunakan akan diarsipkan saat dihapus.</p></div></div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">{plans.data?.map(plan => <div className="rounded-2xl border p-4" key={plan.id}><div className="flex items-start justify-between gap-2"><div><p className="font-bold">{plan.name}</p><p className="text-xs text-muted-foreground">{tierLabel(plan.tier)} · {plan.durationDays} hari</p></div><Badge variant={plan.availability === "available" ? "secondary" : "outline"}>{plan.availability === "coming_soon" ? "Coming soon" : plan.availability === "archived" ? "Arsip" : "Aktif"}</Badge></div><p className="mt-3 text-xs font-semibold text-muted-foreground">{plan.branchLimit} outlet · {plan.cashierLimit} kasir</p>{plan.regularPrice !== "0.00" && <><p className="mt-3 text-sm text-muted-foreground line-through">{formatRupiah(plan.regularPrice)}</p><p className="font-display text-2xl font-extrabold text-primary">{formatRupiah(plan.salePrice ?? plan.regularPrice)}</p></>}<div className="mt-4 flex gap-2"><Button size="sm" variant="outline" onClick={() => editPlan(plan)}><Pencil className="mr-1.5 h-3.5 w-3.5" />Edit</Button><Button size="sm" variant="ghost" className="text-destructive" onClick={() => { if (window.confirm(`Hapus paket ${plan.name}?`)) deletePlan.mutate({ id: plan.id }); }}><Trash2 className="mr-1.5 h-3.5 w-3.5" />Hapus</Button></div></div>)}</div>
        </CardContent></Card>
      </div>
    </div>
    <Dialog open={!!tenantToDelete} onOpenChange={open => { if (!open) { setTenantToDelete(null); setDeleteConfirmation(""); } }}><DialogContent><DialogHeader><DialogTitle>Hapus usaha secara permanen?</DialogTitle><DialogDescription>Seluruh cabang, produk, stok, transaksi, laporan, undangan, dan akun yang hanya terkait dengan usaha ini akan dihapus. Tindakan ini tidak dapat dibatalkan.</DialogDescription></DialogHeader><div className="space-y-3"><Label htmlFor="delete-tenant-confirmation">Ketik <strong>{tenantToDelete?.name}</strong> untuk melanjutkan</Label><Input id="delete-tenant-confirmation" value={deleteConfirmation} onChange={event => setDeleteConfirmation(event.target.value)} placeholder={tenantToDelete?.name || "Nama usaha"} /></div><DialogFooter><Button variant="outline" onClick={() => { setTenantToDelete(null); setDeleteConfirmation(""); }}>Batal</Button><Button variant="destructive" disabled={!tenantToDelete || deleteConfirmation.trim() !== tenantToDelete.name.trim() || deleteTenant.isPending} onClick={() => tenantToDelete && deleteTenant.mutate({ tenantId: tenantToDelete.id, confirmationName: deleteConfirmation })}>{deleteTenant.isPending ? "Menghapus…" : "Hapus usaha permanen"}</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}
