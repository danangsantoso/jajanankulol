import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeading from "@/components/PageHeading";
import { formatRupiah } from "@/lib/format";
import { trpc } from "@/lib/trpc";
import { ArrowDownRight, ArrowUpRight, ClipboardList, History, Minus, PackagePlus, Plus, ShoppingBag } from "lucide-react";
import React, { FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const movementLabels = { initial: "Stok awal", restock: "Tambah stok", adjustment: "Penyesuaian", sale: "Penjualan" } as const;

export default function StockPage() {
  const utils = trpc.useUtils();
  const workspace = trpc.workspace.current.useQuery();
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [note, setNote] = useState("");
  const [mode, setMode] = useState<"restock" | "adjustment">("restock");
  const branches = workspace.data?.branches ?? [];
  useEffect(() => { if (!selectedBranchId && workspace.data?.branchId) setSelectedBranchId(workspace.data.branchId); }, [selectedBranchId, workspace.data?.branchId]);
  const branchId = selectedBranchId ?? workspace.data?.branchId;
  const selectedBranch = useMemo(() => branches.find(branch => branch.id === branchId), [branchId, branches]);
  const productsQuery = trpc.products.all.useQuery({ branchId });
  const history = trpc.stock.history.useQuery({ branchId });
  const adjust = trpc.products.adjustStock.useMutation({
    onSuccess: () => {
      toast.success(mode === "restock" ? "Stok berhasil ditambahkan." : "Penyesuaian stok berhasil dicatat.");
      setQuantity("1");
      setNote("");
      utils.products.all.invalidate();
      utils.stock.history.invalidate();
    },
    onError: error => toast.error(error.message),
  });

  const activeProducts = (productsQuery.data ?? []).filter(product => product.status === "active");
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const parsedProductId = Number(productId);
    const parsedQuantity = Number(quantity);
    if (!parsedProductId) return toast.error("Pilih produk terlebih dahulu.");
    if (!Number.isInteger(parsedQuantity) || parsedQuantity <= 0) return toast.error("Jumlah unit harus berupa bilangan bulat lebih dari nol.");
    const delta = mode === "restock" ? parsedQuantity : -parsedQuantity;
    adjust.mutate({ id: parsedProductId, delta, note: note.trim() || undefined, branchId: branchId ?? undefined });
  };

  return <div className="mx-auto max-w-7xl">
    <PageHeading eyebrow="Inventaris" title="Stok & riwayat unit" description="Tambahkan stok barang yang sudah ada, catat pengurangan manual, dan telusuri seluruh pergerakan unit per cabang." />
    <Card className="mb-5 border-0 shadow-sm"><CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-extrabold">Lokasi stok</p><p className="mt-1 text-xs text-muted-foreground">Setiap perubahan dan riwayat stok mengikuti cabang yang dipilih.</p></div><div className="flex items-center gap-3"><Label htmlFor="stock-branch" className="whitespace-nowrap text-sm font-semibold">Cabang</Label><Select value={String(branchId ?? "")} onValueChange={value => setSelectedBranchId(Number(value))} disabled={!workspace.data?.isTenantAdmin || branches.length < 2}><SelectTrigger id="stock-branch" className="w-[220px] bg-white"><SelectValue placeholder="Pilih cabang" /></SelectTrigger><SelectContent>{branches.map(branch => <SelectItem key={branch.id} value={String(branch.id)}>{branch.name}</SelectItem>)}</SelectContent></Select></div></CardContent></Card>
    <div className="grid gap-5 xl:grid-cols-[390px_1fr]">
      <Card className="h-fit border-0 shadow-sm"><CardContent className="p-5"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary"><PackagePlus className="h-5 w-5" /></div><div><p className="font-extrabold">Catat pergerakan stok</p><p className="text-xs text-muted-foreground">{selectedBranch?.name ?? "Pilih cabang"}</p></div></div><form onSubmit={submit} className="mt-5 space-y-4"><div className="grid grid-cols-2 rounded-xl bg-muted p-1"><button type="button" onClick={() => setMode("restock")} className={`rounded-lg px-3 py-2 text-sm font-bold ${mode === "restock" ? "bg-card text-primary shadow-sm" : "text-muted-foreground"}`}><Plus className="mr-1 inline h-4 w-4" />Tambah</button><button type="button" onClick={() => setMode("adjustment")} className={`rounded-lg px-3 py-2 text-sm font-bold ${mode === "adjustment" ? "bg-card text-destructive shadow-sm" : "text-muted-foreground"}`}><Minus className="mr-1 inline h-4 w-4" />Kurangi</button></div><div className="grid gap-2"><Label htmlFor="stock-product">Produk</Label><Select value={productId} onValueChange={setProductId}><SelectTrigger id="stock-product"><SelectValue placeholder="Pilih barang yang sudah ada" /></SelectTrigger><SelectContent>{activeProducts.map(product => <SelectItem key={product.id} value={String(product.id)}>{product.name} · {product.stock} unit</SelectItem>)}</SelectContent></Select></div><div className="grid gap-2"><Label htmlFor="stock-quantity">Jumlah unit {mode === "restock" ? "ditambahkan" : "dikurangi"}</Label><Input id="stock-quantity" min="1" type="number" value={quantity} onChange={event => setQuantity(event.target.value)} /></div><div className="grid gap-2"><Label htmlFor="stock-note">Catatan (opsional)</Label><Input id="stock-note" maxLength={255} value={note} onChange={event => setNote(event.target.value)} placeholder={mode === "restock" ? "Contoh: Belanja dari supplier" : "Contoh: Barang rusak"} /></div><Button className="w-full" disabled={adjust.isPending || !activeProducts.length} type="submit">{mode === "restock" ? <><ArrowUpRight className="mr-2 h-4 w-4" />Tambah stok barang</> : <><ArrowDownRight className="mr-2 h-4 w-4" />Catat pengurangan stok</>}</Button></form></CardContent></Card>
      <Card className="border-0 shadow-sm"><CardContent className="p-0"><div className="flex items-center justify-between border-b px-5 py-4"><div><p className="font-extrabold">Riwayat pergerakan stok</p><p className="mt-1 text-xs text-muted-foreground">Maksimal 200 mutasi terbaru · {selectedBranch?.name ?? "Memuat cabang…"}</p></div><History className="h-5 w-5 text-primary" /></div><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-5 py-3">Waktu</th><th className="px-5 py-3">Produk</th><th className="px-5 py-3">Jenis</th><th className="px-5 py-3">Perubahan</th><th className="px-5 py-3">Stok akhir</th><th className="px-5 py-3">Catatan</th></tr></thead><tbody>{history.isLoading ? <tr><td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">Memuat riwayat stok…</td></tr> : history.data?.length ? history.data.map(item => <tr className="border-b last:border-0" key={item.id}><td className="whitespace-nowrap px-5 py-4 text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}</td><td className="px-5 py-4"><p className="font-bold">{item.productName}</p><p className="mt-1 text-xs text-muted-foreground">{item.productCategory}</p></td><td className="px-5 py-4"><Badge variant={item.type === "sale" || item.quantity < 0 ? "destructive" : "secondary"}>{movementLabels[item.type]}</Badge></td><td className={`px-5 py-4 font-extrabold ${item.quantity > 0 ? "text-emerald-700" : "text-destructive"}`}>{item.quantity > 0 ? "+" : ""}{item.quantity} unit</td><td className="px-5 py-4 font-semibold">{item.previousStock} → {item.resultingStock}</td><td className="max-w-56 px-5 py-4 text-xs text-muted-foreground">{item.note || item.createdByName || "—"}</td></tr>) : <tr><td colSpan={6} className="px-5 py-14 text-center"><ClipboardList className="mx-auto mb-3 h-9 w-9 text-muted-foreground" /><p className="font-semibold">Belum ada riwayat stok</p><p className="mt-1 text-sm text-muted-foreground">Stok awal, tambah stok, pengurangan, dan penjualan akan muncul di sini.</p></td></tr>}</tbody></table></div></CardContent></Card>
    </div>
  </div>;
}
