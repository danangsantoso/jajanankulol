import PageHeading from "@/components/PageHeading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProductImage } from "@/components/ProductImage";
import { trpc } from "@/lib/trpc";
import { ArchiveRestore, History, Loader2, PackageX, Trash2 } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const actionLabel = { archived: "Diarsipkan", restored: "Diaktifkan kembali", deleted: "Dihapus permanen" } as const;

export default function ProductArchivePage() {
  const utils = trpc.useUtils();
  const workspace = trpc.workspace.current.useQuery();
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const branches = workspace.data?.branches ?? [];
  useEffect(() => { if (!selectedBranchId && workspace.data?.branchId) setSelectedBranchId(workspace.data.branchId); }, [selectedBranchId, workspace.data?.branchId]);
  const branchId = selectedBranchId ?? workspace.data?.branchId;
  const selectedBranch = useMemo(() => branches.find(branch => branch.id === branchId), [branchId, branches]);
  const archive = trpc.products.archived.useQuery({ branchId });
  const lifecycle = trpc.products.lifecycle.useQuery({ branchId });
  const invalidate = () => { void utils.products.all.invalidate(); void utils.products.archived.invalidate(); void utils.products.lifecycle.invalidate(); void utils.stock.history.invalidate(); };
  const restore = trpc.products.restore.useMutation({ onSuccess: () => { toast.success("Produk kembali aktif dan tersedia di katalog."); invalidate(); }, onError: error => toast.error(error.message) });
  const remove = trpc.products.delete.useMutation({ onSuccess: () => { toast.success("Produk dihapus permanen dan tindakannya tercatat."); invalidate(); }, onError: error => toast.error(error.message) });
  const canDelete = !!workspace.data?.isTenantAdmin;
  const requestDelete = (product: NonNullable<typeof archive.data>[number]) => {
    if (product.stock !== 0) return toast.error("Kosongkan stok produk hingga 0 unit sebelum menghapus permanen.");
    if (window.confirm(`Hapus permanen ${product.name}? Tindakan ini tidak dapat dibatalkan.`)) remove.mutate({ id: product.id, branchId: branchId ?? undefined });
  };

  return <div className="mx-auto max-w-7xl">
    <PageHeading eyebrow="Inventaris" title="Arsip Produk" description={workspace.data?.isBranchAdmin ? `Pulihkan produk pada ${workspace.data.branchName} dan lihat riwayatnya.` : "Pulihkan produk yang diarsipkan, atau hapus permanen produk bersaldo stok nol."} />
    <Card className="mb-5 border-0 shadow-sm"><CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-extrabold">Lokasi arsip</p><p className="mt-1 text-xs text-muted-foreground">Arsip dan riwayat mengikuti cabang yang dipilih.</p></div><div className="flex items-center gap-3"><Label htmlFor="archive-branch" className="whitespace-nowrap text-sm font-semibold">Cabang</Label><Select value={String(branchId ?? "")} onValueChange={value => setSelectedBranchId(Number(value))} disabled={!workspace.data?.isTenantAdmin || branches.length < 2}><SelectTrigger id="archive-branch" className="w-[220px] bg-white"><SelectValue placeholder="Pilih cabang" /></SelectTrigger><SelectContent>{branches.map(branch => <SelectItem key={branch.id} value={String(branch.id)}>{branch.name}</SelectItem>)}</SelectContent></Select></div></CardContent></Card>
    <div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
      <Card className="border-0 shadow-sm"><CardContent className="p-0"><div className="border-b bg-[#f0fffb] px-5 py-4"><p className="font-extrabold">Produk diarsipkan</p><p className="mt-1 text-xs text-muted-foreground">{selectedBranch?.name ?? "Memuat cabang…"} · Produk arsip tidak tampil di POS atau Cetak QR.</p></div><div className="divide-y">{archive.isLoading ? <div className="flex justify-center p-10 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div> : archive.data?.length ? archive.data.map(product => <div key={product.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center"><ProductImage src={product.imageUrl} alt={`Foto ${product.name}`} className="h-14 w-14 shrink-0 rounded-xl border" /><div className="min-w-0 flex-1"><p className="font-extrabold">{product.name}</p><div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground"><Badge variant="secondary">{product.category || "Lainnya"}</Badge><span>Stok {product.stock} unit</span><code>{product.qrCode}</code></div></div><div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={() => restore.mutate({ id: product.id, branchId: branchId ?? undefined })} disabled={restore.isPending}><ArchiveRestore className="mr-1 h-4 w-4" />Aktifkan</Button>{canDelete && <Button variant="outline" size="sm" className="border-destructive/30 text-destructive hover:bg-destructive/10" onClick={() => requestDelete(product)} disabled={remove.isPending || product.stock !== 0} title={product.stock !== 0 ? "Stok harus 0 untuk menghapus" : "Hapus permanen"}><Trash2 className="mr-1 h-4 w-4" />Hapus</Button>}</div></div>) : <div className="p-14 text-center"><PackageX className="mx-auto mb-3 h-9 w-9 text-muted-foreground" /><p className="font-semibold">Belum ada produk diarsipkan</p><p className="mt-1 text-sm text-muted-foreground">Produk yang diarsipkan dari menu Produk akan muncul di sini.</p></div>}</div></CardContent></Card>
      <Card className="border-0 shadow-sm"><CardContent className="p-0"><div className="flex items-center justify-between border-b px-5 py-4"><div><p className="font-extrabold">Riwayat arsip</p><p className="mt-1 text-xs text-muted-foreground">Maksimal 200 tindakan terbaru.</p></div><History className="h-5 w-5 text-primary" /></div><div className="divide-y">{lifecycle.isLoading ? <div className="flex justify-center p-10 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div> : lifecycle.data?.length ? lifecycle.data.map(event => <div key={event.id} className="p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-bold">{event.productName}</p><p className="mt-1 text-xs text-muted-foreground">{event.productQrCode}</p></div><Badge variant={event.action === "deleted" ? "destructive" : "secondary"}>{actionLabel[event.action]}</Badge></div><p className="mt-2 text-xs text-muted-foreground">Stok saat tindakan: {event.stockAtAction} unit · {event.createdByName || "Pengguna"} · {new Date(event.createdAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}</p></div>) : <div className="p-14 text-center"><History className="mx-auto mb-3 h-9 w-9 text-muted-foreground" /><p className="font-semibold">Belum ada riwayat arsip</p><p className="mt-1 text-sm text-muted-foreground">Aksi arsip, pemulihan, dan penghapusan akan tercatat di sini.</p></div>}</div></CardContent></Card>
    </div>
  </div>;
}
