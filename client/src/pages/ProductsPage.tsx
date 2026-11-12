import PageHeading from "@/components/PageHeading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProductImage } from "@/components/ProductImage";
import { formatRupiah } from "@/lib/format";
import { compressProductImage } from "@/lib/productImageCompression";
import { trpc } from "@/lib/trpc";
import { Archive, Edit3, ImagePlus, Loader2, PackagePlus, Plus, RefreshCw, X } from "lucide-react";
import React, { FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type FormValues = { name: string; category: string; salePrice: string; costPrice: string; stock: string; lowStockThreshold: string };
type PendingProductPhoto = { dataUrl?: string; previewUrl?: string; imageKey?: string | null; imageUrl?: string | null };
const defaultCategories = ["Makanan", "Minuman", "Roti & Kue", "Camilan", "Paket", "Lainnya"];
const emptyForm: FormValues = { name: "", category: "Makanan", salePrice: "10000", costPrice: "0", stock: "0", lowStockThreshold: "5" };

export default function ProductsPage() {
  const utils = trpc.useUtils();
  const workspace = trpc.workspace.current.useQuery();
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [entryMode, setEntryMode] = useState<"new" | "restock">("new");
  const [restockProductId, setRestockProductId] = useState("");
  const [restockQuantity, setRestockQuantity] = useState("1");
  const [restockNote, setRestockNote] = useState("");
  const [form, setForm] = useState<FormValues>(emptyForm);
  const [productPhoto, setProductPhoto] = useState<PendingProductPhoto | undefined>();

  const branchChoices = workspace.data?.branches ?? [];
  useEffect(() => {
    if (!selectedBranchId && workspace.data?.branchId) setSelectedBranchId(workspace.data.branchId);
  }, [selectedBranchId, workspace.data?.branchId]);
  const activeProductBranchId = selectedBranchId ?? workspace.data?.branchId;
  const selectedBranch = useMemo(() => branchChoices.find(branch => branch.id === activeProductBranchId), [activeProductBranchId, branchChoices]);
  const { data: products, isLoading, error: productsError, refetch: refetchProducts } = trpc.products.all.useQuery({ branchId: activeProductBranchId });
  const activeProducts = useMemo(() => (products ?? []).filter(product => product.status === "active"), [products]);
  const canManageCatalog = !!workspace.data && (workspace.data.isTenantAdmin || workspace.data.isBranchAdmin);
  const invalidateStockData = () => {
    utils.products.all.invalidate();
    utils.stock.history.invalidate();
  };
  const closeDialog = () => setIsOpen(false);
  const create = trpc.products.create.useMutation({ onSuccess: () => { toast.success("Produk dan kode QR berhasil dibuat."); invalidateStockData(); closeDialog(); }, onError: error => toast.error(error.message) });
  const update = trpc.products.update.useMutation({ onSuccess: () => { toast.success("Data produk diperbarui."); invalidateStockData(); closeDialog(); }, onError: error => toast.error(error.message) });
  const archive = trpc.products.archive.useMutation({ onSuccess: () => { toast.success("Produk diarsipkan."); invalidateStockData(); }, onError: error => toast.error(error.message) });
  const adjust = trpc.products.adjustStock.useMutation({ onSuccess: () => { toast.success("Stok berhasil diperbarui."); invalidateStockData(); closeDialog(); }, onError: error => toast.error(error.message) });
  const uploadProductImage = trpc.productImages.upload.useMutation();

  const openCreate = () => {
    setEditingId(null);
    setEntryMode("new");
    setRestockProductId("");
    setRestockQuantity("1");
    setRestockNote("");
    setForm(emptyForm);
    setProductPhoto(undefined);
    setIsOpen(true);
  };
  const openEdit = (product: NonNullable<typeof products>[number]) => {
    setEditingId(product.id);
    setEntryMode("new");
    setForm({ name: product.name, category: product.category || "Lainnya", salePrice: String(product.salePrice), costPrice: String(product.costPrice), stock: String(product.stock), lowStockThreshold: String(product.lowStockThreshold) });
    setProductPhoto({ imageKey: product.imageKey, imageUrl: product.imageUrl });
    setIsOpen(true);
  };
  const selectProductPhoto = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const compressed = await compressProductImage(file);
      setProductPhoto(compressed);
      toast.success(`Foto dibuat persegi dan dikompres (${Math.max(1, Math.round(compressed.size / 1024))} KB).`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Foto produk tidak dapat diproses.");
    }
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!activeProductBranchId) return toast.error("Pilih cabang lokasi produk terlebih dahulu.");
    if (!editingId && entryMode === "restock") {
      const id = Number(restockProductId);
      const delta = Number(restockQuantity);
      if (!id) return toast.error("Pilih barang yang sudah ada.");
      if (!Number.isInteger(delta) || delta <= 0) return toast.error("Jumlah tambahan stok harus berupa bilangan bulat lebih dari nol.");
      adjust.mutate({ id, delta, note: restockNote.trim() || "Tambah stok dari menu Produk", branchId: activeProductBranchId });
      return;
    }
    let photoFields: { imageKey?: string | null; imageUrl?: string | null } = {};
    try {
      if (productPhoto?.dataUrl) {
        const uploaded = await uploadProductImage.mutateAsync({ dataUrl: productPhoto.dataUrl });
        photoFields = { imageKey: uploaded.key, imageUrl: uploaded.url };
      } else if (productPhoto?.imageUrl === null) {
        photoFields = { imageKey: null, imageUrl: null };
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Foto produk tidak dapat diunggah.");
      return;
    }
    const payload = { name: form.name, category: form.category.trim() || "Lainnya", salePrice: Number(form.salePrice), costPrice: Number(form.costPrice), lowStockThreshold: Number(form.lowStockThreshold), branchId: activeProductBranchId, ...photoFields };
    if (editingId) update.mutate({ id: editingId, ...payload });
    else create.mutate({ ...payload, stock: Number(form.stock) });
  };
  const updateStock = (id: number) => {
    const raw = window.prompt("Masukkan penyesuaian stok. Gunakan angka positif untuk tambah, negatif untuk kurangi.");
    if (!raw) return;
    const delta = Number(raw);
    if (!Number.isInteger(delta) || delta === 0) return toast.error("Masukkan angka bulat selain nol.");
    adjust.mutate({ id, delta, branchId: activeProductBranchId ?? undefined });
  };

  const isSubmitting = create.isPending || update.isPending || adjust.isPending || uploadProductImage.isPending;
  return <div className="mx-auto max-w-7xl">
    <PageHeading eyebrow="Inventaris" title="Produk jajanan" description={workspace.data?.isBranchAdmin ? `Kelola produk dan stok khusus ${workspace.data.branchName}.` : "Kelola harga, HPP, stok, dan kode QR unik pada cabang aktif."} action={canManageCatalog ? <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Tambah produk</Button> : undefined} />

    <Card className="mb-5 border-0 shadow-sm"><CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-extrabold">Lokasi produk & stok</p><p className="mt-1 text-xs text-muted-foreground">Produk baru dan perubahan stok diterapkan ke cabang yang dipilih.</p></div><div className="flex items-center gap-3"><Label htmlFor="product-branch" className="whitespace-nowrap text-sm font-semibold">Cabang</Label><Select value={String(activeProductBranchId ?? "")} onValueChange={value => setSelectedBranchId(Number(value))} disabled={!workspace.data?.isTenantAdmin || branchChoices.length < 2}><SelectTrigger id="product-branch" aria-label="Lokasi cabang produk dan stok" className="w-[220px] bg-white"><SelectValue placeholder="Pilih cabang" /></SelectTrigger><SelectContent>{branchChoices.map(branch => <SelectItem key={branch.id} value={String(branch.id)}>{branch.name}</SelectItem>)}</SelectContent></Select></div></CardContent></Card>

    <Card className="border-0 shadow-sm"><CardContent className="p-0"><div className="border-b bg-[#f0fffb] px-5 py-3 text-sm font-semibold text-primary">Menampilkan produk aktif dan stok: {selectedBranch?.name ?? "Memuat cabang…"}</div><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-y bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-5 py-3 font-semibold">Produk</th><th className="px-5 py-3 font-semibold">Kategori</th><th className="px-5 py-3 font-semibold">Harga jual</th><th className="px-5 py-3 font-semibold">HPP</th><th className="px-5 py-3 font-semibold">Stok</th><th className="px-5 py-3 font-semibold">QR</th><th className="px-5 py-3 text-right font-semibold">Aksi</th></tr></thead><tbody>{isLoading ? <tr><td className="px-5 py-8 text-center text-muted-foreground" colSpan={7}>Memuat produk…</td></tr> : productsError ? <tr><td className="px-5 py-12 text-center" colSpan={7}><p className="font-semibold text-destructive">Produk belum dapat dimuat</p><p className="mt-1 text-sm text-muted-foreground">{productsError.message || "Periksa koneksi lalu coba kembali."}</p><Button className="mt-4" type="button" variant="outline" onClick={() => void refetchProducts()}>Muat ulang produk</Button></td></tr> : activeProducts.length ? activeProducts.map(product => <tr className="border-b last:border-0" key={product.id}><td className="px-5 py-4"><div className="flex items-center gap-3"><ProductImage src={product.imageUrl} alt={`Foto ${product.name}`} className="h-11 w-11 shrink-0 rounded-xl border" /><div><p className="font-semibold">{product.name}</p><p className="mt-1 text-xs text-muted-foreground">Aktif</p></div></div></td><td className="px-5 py-4"><Badge variant="secondary">{product.category || "Lainnya"}</Badge></td><td className="px-5 py-4 font-medium">{formatRupiah(product.salePrice)}</td><td className="px-5 py-4 text-muted-foreground">{formatRupiah(product.costPrice)}</td><td className="px-5 py-4"><Badge variant={product.stock <= product.lowStockThreshold ? "destructive" : "secondary"}>{product.stock} unit</Badge></td><td className="px-5 py-4"><code className="rounded bg-muted px-2 py-1 text-xs">{product.qrCode}</code></td><td className="px-5 py-4"><div className="flex justify-end gap-1"><Button onClick={() => updateStock(product.id)} size="icon" variant="ghost" title="Atur stok"><RefreshCw className="h-4 w-4" /></Button>{canManageCatalog && <><Button onClick={() => openEdit(product)} size="icon" variant="ghost" title="Ubah produk"><Edit3 className="h-4 w-4" /></Button><Button onClick={() => { if (window.confirm(`Arsipkan ${product.name}?`)) archive.mutate({ id: product.id, branchId: activeProductBranchId ?? undefined }); }} size="icon" variant="ghost" title="Arsipkan"><Archive className="h-4 w-4" /></Button></>}</div></td></tr>) : <tr><td className="px-5 py-12 text-center" colSpan={7}><PackagePlus className="mx-auto mb-3 h-8 w-8 text-muted-foreground" /><p className="font-semibold">Belum ada produk aktif</p><p className="mt-1 text-sm text-muted-foreground">{canManageCatalog ? `Tambahkan jajanan pertama untuk ${selectedBranch?.name ?? "cabang ini"}, atau buka Arsip Produk untuk memulihkan item.` : "Belum ada produk aktif pada cabang ini."}</p></td></tr>}</tbody></table></div></CardContent></Card>

    {isOpen && canManageCatalog && <div className="no-print fixed inset-0 z-50 grid place-items-center bg-foreground/25 p-4"><form onSubmit={event => { void submit(event); }} className="w-full max-w-lg rounded-3xl bg-card p-6 shadow-2xl" role="dialog" aria-modal="true"><div className="flex items-start justify-between gap-5"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">{editingId ? "Perbarui inventaris" : "Kelola inventaris"}</p><h2 className="mt-1 font-display text-2xl font-bold">{editingId ? "Ubah produk" : "Tambah produk atau stok"}</h2></div><button type="button" onClick={closeDialog} className="text-sm font-semibold text-muted-foreground hover:text-foreground">Tutup</button></div>{!editingId && <div className="mt-5 grid grid-cols-2 rounded-2xl bg-muted p-1"><button type="button" onClick={() => setEntryMode("new")} className={`rounded-xl px-3 py-3 text-sm font-bold transition ${entryMode === "new" ? "bg-card text-primary shadow-sm" : "text-muted-foreground"}`}>Barang baru</button><button type="button" onClick={() => setEntryMode("restock")} className={`rounded-xl px-3 py-3 text-sm font-bold transition ${entryMode === "restock" ? "bg-card text-primary shadow-sm" : "text-muted-foreground"}`}>Barang sudah ada</button></div>}{!editingId && entryMode === "restock" ? <div className="mt-6 grid gap-4"><div className="rounded-xl border border-primary/15 bg-primary/5 p-3 text-sm text-primary"><strong>Tambah stok tanpa QR baru.</strong> Pilih barang yang sudah pernah diinput, lalu masukkan jumlah unit tambahan.</div><div className="grid gap-2"><Label htmlFor="existing-product">Barang yang sudah ada</Label><Select value={restockProductId} onValueChange={setRestockProductId}><SelectTrigger id="existing-product"><SelectValue placeholder="Pilih produk" /></SelectTrigger><SelectContent>{activeProducts.map(product => <SelectItem key={product.id} value={String(product.id)}>{product.name} · stok {product.stock}</SelectItem>)}</SelectContent></Select></div><div className="grid gap-2"><Label htmlFor="restock-quantity">Jumlah unit ditambahkan</Label><Input id="restock-quantity" required min="1" type="number" value={restockQuantity} onChange={event => setRestockQuantity(event.target.value)} /></div><div className="grid gap-2"><Label htmlFor="restock-note">Catatan (opsional)</Label><Input id="restock-note" maxLength={255} value={restockNote} onChange={event => setRestockNote(event.target.value)} placeholder="Contoh: Belanja dari supplier" /></div></div> : <div className="mt-6 grid gap-4 sm:grid-cols-2"><div className="sm:col-span-2"><Label htmlFor="product-photo" className="mb-2 block text-sm font-semibold">Foto produk <span className="font-normal text-muted-foreground">(opsional)</span></Label><div className="flex items-center gap-3 rounded-2xl border border-dashed bg-muted/30 p-3"><ProductImage src={productPhoto?.previewUrl ?? productPhoto?.imageUrl} alt="Pratinjau foto produk" className="h-20 w-20 shrink-0 rounded-xl border bg-card" /><div className="min-w-0 flex-1"><p className="text-sm font-bold">Foto persegi untuk POS</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Foto akan diperkecil menjadi 512 × 512 px dan dikompres agar katalog kasir tetap cepat.</p><div className="mt-3 flex flex-wrap gap-2"><label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground"><ImagePlus className="h-4 w-4" />Pilih foto<input id="product-photo" className="sr-only" accept="image/jpeg,image/png,image/webp" disabled={isSubmitting} onChange={event => { void selectProductPhoto(event); }} type="file" /></label>{productPhoto && <Button type="button" variant="ghost" size="sm" onClick={() => setProductPhoto({ imageKey: null, imageUrl: null })}><X className="mr-1 h-4 w-4" />Hapus</Button>}</div></div></div></div><label className="grid gap-2 text-sm font-semibold sm:col-span-2">Nama produk<Input required value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} placeholder="Contoh: Keripik singkong" /></label><label className="grid gap-2 text-sm font-semibold sm:col-span-2">Kategori produk<Input required list="product-category-options" value={form.category} onChange={event => setForm({ ...form, category: event.target.value })} placeholder="Contoh: Makanan" /><datalist id="product-category-options">{defaultCategories.map(category => <option key={category} value={category} />)}</datalist></label><label className="grid gap-2 text-sm font-semibold">Harga jual<Input required min="1" type="number" value={form.salePrice} onChange={event => setForm({ ...form, salePrice: event.target.value })} /></label><label className="grid gap-2 text-sm font-semibold">HPP per unit<Input required min="0" type="number" value={form.costPrice} onChange={event => setForm({ ...form, costPrice: event.target.value })} /></label>{!editingId && <label className="grid gap-2 text-sm font-semibold">Stok awal<Input required min="0" type="number" value={form.stock} onChange={event => setForm({ ...form, stock: event.target.value })} /></label>}<label className="grid gap-2 text-sm font-semibold">Batas stok menipis<Input required min="0" type="number" value={form.lowStockThreshold} onChange={event => setForm({ ...form, lowStockThreshold: event.target.value })} /></label></div>}<div className="mt-7 flex justify-end gap-2"><Button type="button" variant="outline" onClick={closeDialog}>Batal</Button><Button disabled={isSubmitting || (!editingId && entryMode === "restock" && !activeProducts.length)} type="submit">{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{editingId ? "Simpan perubahan" : entryMode === "restock" ? "Tambah stok" : "Buat produk & QR"}</Button></div></form></div>}
  </div>;
}
