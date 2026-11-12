import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeading from "@/components/PageHeading";
import { formatRupiah } from "@/lib/format";
import { getPromotionTimeline, groupPromotionsByTimeline, type PromotionTimeline } from "@/lib/promotionStatus";
import { trpc } from "@/lib/trpc";
import { CalendarClock, Layers3, Percent, Save, Tag, Trash2 } from "lucide-react";
import React, { FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type PromoMode = "discount" | "bundle";
type PromoStatus = "active" | "inactive";
type SelectedItem = { productId: number; quantity: number };
type PromoTab = "active" | "history";
type PromoForEdit = {
  id: number;
  name: string;
  type: PromoMode;
  status: PromoStatus;
  discountType: "percentage" | "fixed" | null;
  discountValue: number | null;
  bundlePrice: number | null;
  startsAt: Date | string;
  endsAt: Date | string;
  items: Array<{ productId: number; productName: string; quantity: number }>;
};

const localDateTime = (date: Date) => new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
const formatPeriod = (start: Date | string, end: Date | string) => `${new Date(start).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })} — ${new Date(end).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}`;

function StatusChip({ status }: { status: PromotionTimeline }) {
  const config = {
    active: ["Aktif sekarang", "bg-emerald-100 text-emerald-700"],
    scheduled: ["Terjadwal", "bg-sky-100 text-sky-700"],
    ended: ["Berakhir", "bg-muted text-muted-foreground"],
    inactive: ["Dinonaktifkan", "bg-amber-100 text-amber-700"],
  } as const;
  const [label, className] = config[status];
  return <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${className}`}>{label}</span>;
}

export default function PromotionsPage() {
  const utils = trpc.useUtils();
  const workspace = trpc.workspace.current.useQuery();
  const [branchId, setBranchId] = useState<number | null>(null);
  const [tab, setTab] = useState<PromoTab>("active");
  const [editingPromoId, setEditingPromoId] = useState<number | null>(null);
  const [mode, setMode] = useState<PromoMode>("discount");
  const [status, setStatus] = useState<PromoStatus>("active");
  const [name, setName] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState("10");
  const [bundlePrice, setBundlePrice] = useState("");
  const [startsAt, setStartsAt] = useState(() => localDateTime(new Date()));
  const [endsAt, setEndsAt] = useState(() => localDateTime(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)));
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);

  const branches = workspace.data?.branches ?? [];
  useEffect(() => { if (branchId === null && workspace.data?.branchId) setBranchId(workspace.data.branchId); }, [branchId, workspace.data?.branchId]);
  const activeBranchId = branchId ?? workspace.data?.branchId;
  const products = trpc.products.all.useQuery({ branchId: activeBranchId });
  const promos = trpc.promotions.list.useQuery({ branchId: activeBranchId });
  const activeProducts = useMemo(() => (products.data ?? []).filter(product => product.status === "active"), [products.data]);
  const groups = useMemo(() => groupPromotionsByTimeline(promos.data ?? []), [promos.data]);
  const visiblePromos = tab === "active" ? [...groups.active, ...groups.scheduled] : [...groups.ended, ...groups.inactive];

  const resetForm = () => {
    setEditingPromoId(null); setName(""); setMode("discount"); setStatus("active"); setDiscountType("percentage"); setDiscountValue("10"); setBundlePrice(""); setSelectedItems([]);
    setStartsAt(localDateTime(new Date())); setEndsAt(localDateTime(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)));
  };
  const save = trpc.promotions.save.useMutation({
    onSuccess: () => { toast.success(editingPromoId ? "Promo berhasil diperbarui." : "Promo berhasil disimpan."); resetForm(); utils.promotions.list.invalidate(); },
    onError: error => toast.error(error.message),
  });
  const remove = trpc.promotions.delete.useMutation({ onSuccess: () => { toast.success("Promo dihapus."); if (editingPromoId) resetForm(); utils.promotions.list.invalidate(); }, onError: error => toast.error(error.message) });
  const toggleProduct = (productId: number) => setSelectedItems(current => current.some(item => item.productId === productId) ? current.filter(item => item.productId !== productId) : [...current, { productId, quantity: 1 }]);
  const setItemQuantity = (productId: number, quantity: number) => setSelectedItems(current => current.map(item => item.productId === productId ? { ...item, quantity: Math.max(1, Math.min(99, quantity || 1)) } : item));
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!activeBranchId) return toast.error("Pilih cabang terlebih dahulu.");
    save.mutate({ id: editingPromoId ?? undefined, name: name.trim(), type: mode, status, discountType: mode === "discount" ? discountType : null, discountValue: mode === "discount" ? Number(discountValue) : null, bundlePrice: mode === "bundle" ? Number(bundlePrice) : null, startsAt: new Date(startsAt), endsAt: new Date(endsAt), branchId: activeBranchId, items: selectedItems });
  };
  const beginEdit = (promo: PromoForEdit) => {
    setEditingPromoId(promo.id); setName(promo.name); setMode(promo.type); setStatus(promo.status); setDiscountType(promo.discountType ?? "percentage"); setDiscountValue(String(promo.discountValue ?? "")); setBundlePrice(String(promo.bundlePrice ?? ""));
    setStartsAt(localDateTime(new Date(promo.startsAt))); setEndsAt(localDateTime(new Date(promo.endsAt))); setSelectedItems(promo.items.map(item => ({ productId: item.productId, quantity: item.quantity })));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const deactivate = (promo: PromoForEdit) => save.mutate({ id: promo.id, name: promo.name, type: promo.type, status: "inactive", discountType: promo.discountType, discountValue: promo.discountValue, bundlePrice: promo.bundlePrice, startsAt: new Date(promo.startsAt), endsAt: new Date(promo.endsAt), branchId: activeBranchId, items: promo.items.map(item => ({ productId: item.productId, quantity: item.quantity })) });

  return <div className="mx-auto max-w-7xl"><PageHeading eyebrow="Penjualan" title="Promo & bundling" description="Buat penawaran baru, kelola promo yang berjalan, dan lihat riwayat promo setelah masa berlakunya selesai." />
    <Card className="mb-5 border-0 shadow-sm"><CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-extrabold">Lokasi promo</p><p className="mt-1 text-xs text-muted-foreground">Promo hanya berlaku untuk produk dan transaksi pada cabang ini.</p></div><div className="flex items-center gap-3"><Label htmlFor="promotion-branch" className="text-sm font-semibold">Cabang</Label><Select value={String(activeBranchId ?? "")} onValueChange={value => { setBranchId(Number(value)); resetForm(); }} disabled={branches.length < 2}><SelectTrigger id="promotion-branch" className="w-[220px] bg-white"><SelectValue placeholder="Pilih cabang" /></SelectTrigger><SelectContent>{branches.map(branch => <SelectItem key={branch.id} value={String(branch.id)}>{branch.name}</SelectItem>)}</SelectContent></Select></div></CardContent></Card>
    <div className="grid gap-5 xl:grid-cols-[420px_1fr]"><Card className="h-fit border-0 shadow-sm"><CardContent className="p-5"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary"><Tag className="h-5 w-5" /></div><div><p className="font-extrabold">{editingPromoId ? "Edit promo" : "Buat promo baru"}</p><p className="text-xs text-muted-foreground">{editingPromoId ? "Ubah detail dan simpan pada promo yang sama" : "Diskon atau paket hemat berbatas waktu"}</p></div></div>{editingPromoId && <Button type="button" size="sm" variant="outline" onClick={resetForm}>Batal</Button>}</div>
        {editingPromoId && <div className="mt-4 rounded-xl bg-primary/10 px-3 py-2 text-sm font-semibold text-primary">Anda sedang mengubah promo ini. Simpan untuk menerapkan perubahan.</div>}
        <form onSubmit={submit} className="mt-5 space-y-4"><div className="grid grid-cols-2 rounded-xl bg-muted p-1"><button type="button" onClick={() => setMode("discount")} className={`rounded-lg px-3 py-2 text-sm font-bold ${mode === "discount" ? "bg-card text-primary shadow-sm" : "text-muted-foreground"}`}><Percent className="mr-1 inline h-4 w-4" />Diskon</button><button type="button" onClick={() => setMode("bundle")} className={`rounded-lg px-3 py-2 text-sm font-bold ${mode === "bundle" ? "bg-card text-primary shadow-sm" : "text-muted-foreground"}`}><Layers3 className="mr-1 inline h-4 w-4" />Bundling</button></div>
          <div className="grid gap-2"><Label htmlFor="promo-name">Nama promo</Label><Input id="promo-name" value={name} onChange={event => setName(event.target.value)} placeholder={mode === "discount" ? "Contoh: Diskon akhir pekan" : "Contoh: Paket roti + minum"} required /></div>
          {mode === "discount" ? <div className="grid grid-cols-2 gap-3"><div className="grid gap-2"><Label>Jenis diskon</Label><Select value={discountType} onValueChange={value => setDiscountType(value as "percentage" | "fixed")}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="percentage">Persentase (%)</SelectItem><SelectItem value="fixed">Nominal (Rp)</SelectItem></SelectContent></Select></div><div className="grid gap-2"><Label htmlFor="discount-value">Nilai diskon</Label><Input id="discount-value" min="1" type="number" value={discountValue} onChange={event => setDiscountValue(event.target.value)} required /></div></div> : <div className="grid gap-2"><Label htmlFor="bundle-price">Harga bundling</Label><Input id="bundle-price" min="1" type="number" value={bundlePrice} onChange={event => setBundlePrice(event.target.value)} placeholder="Contoh: 25000" required /></div>}
          <div className="grid grid-cols-2 gap-3"><div className="grid gap-2"><Label htmlFor="promo-start">Mulai</Label><Input id="promo-start" type="datetime-local" value={startsAt} onChange={event => setStartsAt(event.target.value)} required /></div><div className="grid gap-2"><Label htmlFor="promo-end">Berakhir</Label><Input id="promo-end" type="datetime-local" value={endsAt} onChange={event => setEndsAt(event.target.value)} required /></div></div>
          <div className="grid gap-2"><Label>Status promo</Label><Select value={status} onValueChange={value => setStatus(value as PromoStatus)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Aktif</SelectItem><SelectItem value="inactive">Nonaktif</SelectItem></SelectContent></Select></div>
          <div className="grid gap-2"><Label>Produk {mode === "bundle" ? "bundling" : "yang didiskon"}</Label><div className="max-h-64 divide-y overflow-y-auto rounded-xl border">{activeProducts.length ? activeProducts.map(product => { const selected = selectedItems.find(item => item.productId === product.id); return <label key={product.id} className="flex cursor-pointer items-center gap-3 p-3 hover:bg-muted/50"><input aria-label={`Pilih ${product.name}`} checked={Boolean(selected)} type="checkbox" onChange={() => toggleProduct(product.id)} /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold">{product.name}</span><span className="text-xs text-muted-foreground">{formatRupiah(product.salePrice)}</span></span>{mode === "bundle" && selected && <Input aria-label={`Jumlah ${product.name}`} className="h-8 w-16" min="1" max="99" type="number" value={selected.quantity} onChange={event => setItemQuantity(product.id, Number(event.target.value))} onClick={event => event.stopPropagation()} />}</label>; }) : <p className="p-4 text-sm text-muted-foreground">Belum ada produk aktif pada cabang ini.</p>}</div></div>
          <Button className="w-full" disabled={save.isPending || !activeProducts.length || !selectedItems.length} type="submit"><Save className="mr-2 h-4 w-4" />{editingPromoId ? "Simpan perubahan" : "Simpan promo"}</Button></form></CardContent></Card>
      <Card className="border-0 shadow-sm"><CardContent className="p-0"><div className="flex flex-col gap-4 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-extrabold">Pengelolaan promo</p><p className="mt-1 text-xs text-muted-foreground">Kelola promo aktif atau buka riwayat promo yang telah selesai.</p></div><CalendarClock className="h-5 w-5 text-primary" /></div><div className="flex gap-4 border-b px-5 pt-4"><button type="button" onClick={() => setTab("active")} className={`border-b-2 pb-3 text-sm font-bold ${tab === "active" ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>Aktif & terjadwal <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs">{groups.active.length + groups.scheduled.length}</span></button><button type="button" onClick={() => setTab("history")} className={`border-b-2 pb-3 text-sm font-bold ${tab === "history" ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>Riwayat berakhir <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs">{groups.ended.length + groups.inactive.length}</span></button></div><div className="divide-y">{promos.isLoading ? <p className="p-8 text-center text-sm text-muted-foreground">Memuat promo…</p> : visiblePromos.length ? visiblePromos.map(promo => { const timeline = getPromotionTimeline(promo); return <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between" key={promo.id}><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-extrabold">{promo.name}</p><StatusChip status={timeline} /><span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">{promo.type === "discount" ? promo.discountType === "percentage" ? `${promo.discountValue}% diskon` : `${formatRupiah(promo.discountValue || 0)} diskon` : `Paket ${formatRupiah(promo.bundlePrice || 0)}`}</span></div><p className="mt-2 text-xs text-muted-foreground">{formatPeriod(promo.startsAt, promo.endsAt)}</p><p className="mt-3 text-sm text-muted-foreground">{promo.items.map(item => `${item.quantity > 1 ? `${item.quantity}× ` : ""}${item.productName}`).join(" + ")}</p></div><div className="flex shrink-0 gap-2"><Button type="button" size="sm" variant="outline" onClick={() => beginEdit(promo)}>Edit</Button>{timeline === "active" && <Button type="button" size="sm" variant="outline" onClick={() => deactivate(promo)} disabled={save.isPending}>Nonaktifkan</Button>}<Button type="button" size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => { if (window.confirm(`Hapus promo ${promo.name}?`)) remove.mutate({ id: promo.id, branchId: activeBranchId }); }}><Trash2 className="mr-1.5 h-4 w-4" />Hapus</Button></div></div>; }) : <div className="p-12 text-center"><Tag className="mx-auto h-10 w-10 text-muted-foreground" /><p className="mt-4 font-semibold">{tab === "active" ? "Belum ada promo aktif" : "Riwayat promo masih kosong"}</p><p className="mt-1 text-sm text-muted-foreground">{tab === "active" ? "Buat promo atau jadwalkan penawaran untuk cabang ini." : "Promo yang berakhir atau dinonaktifkan akan tersimpan di sini."}</p></div>}</div></CardContent></Card></div></div>;
}
