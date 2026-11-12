import LabelSheet from "@/components/LabelSheet";
import PageHeading from "@/components/PageHeading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatRupiah } from "@/lib/format";
import { saveExportBlob } from "@/lib/exportDownload";
import { canvasToBlob, renderLabelPages, stackCanvasPages } from "@/lib/labelCanvasExport";
import { buildLabelCopies, getLabelExportFilename } from "@/lib/labelExport";
import { defaultLabelSize, getLabelSizePreset, labelSizePresets, type LabelSize } from "@/lib/labelSizing";
import { trpc } from "@/lib/trpc";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import { AlertCircle, CheckSquare2, Download, FileImage, FileText, Layers3, Loader2, Minus, Plus, Printer, QrCode, RefreshCw, Square } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

export default function QrLabelsPage() {
  const workspace = trpc.workspace.current.useQuery();
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const branchChoices = workspace.data?.branches ?? [];
  useEffect(() => {
    if (!selectedBranchId && workspace.data?.branchId) setSelectedBranchId(workspace.data.branchId);
  }, [selectedBranchId, workspace.data?.branchId]);
  const activeQrBranchId = selectedBranchId ?? workspace.data?.branchId;
  const selectedBranch = useMemo(() => branchChoices.find(branch => branch.id === activeQrBranchId), [activeQrBranchId, branchChoices]);
  const { data: products, isLoading, isError, refetch } = trpc.products.all.useQuery({ branchId: activeQrBranchId });
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [copies, setCopies] = useState<Record<number, number>>({});
  const [images, setImages] = useState<Record<number, string>>({});
  const [exporting, setExporting] = useState<"jpg" | "pdf" | null>(null);
  const [labelSize, setLabelSize] = useState<LabelSize>(defaultLabelSize);
  const activeProducts = useMemo(() => products?.filter(product => product.status === "active") || [], [products]);
  const selectedProducts = activeProducts.filter(product => selectedIds.includes(product.id));
  const labels = useMemo(() => buildLabelCopies(selectedProducts, copies), [copies, selectedProducts]);
  const selectedLabelSize = getLabelSizePreset(labelSize);

  useEffect(() => {
    setSelectedIds([]);
    setCopies({});
  }, [activeQrBranchId]);

  useEffect(() => {
    let isCurrent = true;
    if (!activeProducts.length) { setImages({}); return () => { isCurrent = false; }; }
    Promise.all(activeProducts.map(async product => [product.id, await QRCode.toDataURL(product.qrCode, { margin: 1, width: 280, color: { dark: "#075f59", light: "#FFFFFF" } })] as const))
      .then(entries => { if (isCurrent) setImages(Object.fromEntries(entries)); })
      .catch(() => { if (isCurrent) toast.error("Kode QR belum dapat dibuat. Silakan muat ulang halaman."); });
    return () => { isCurrent = false; };
  }, [activeProducts]);

  const toggle = (id: number) => setSelectedIds(ids => ids.includes(id) ? ids.filter(current => current !== id) : [...ids, id]);
  const toggleAll = () => setSelectedIds(selectedIds.length === activeProducts.length ? [] : activeProducts.map(product => product.id));
  const setCopyCount = (id: number, delta: number) => setCopies(current => ({ ...current, [id]: Math.max(1, Math.min(99, (current[id] ?? 1) + delta)) }));
  const readyForExport = labels.length > 0 && labels.every(label => images[label.id]);

  const exportJpg = async () => {
    if (!readyForExport) return;
    try {
      setExporting("jpg");
      const pages = await renderLabelPages(labels, images, labelSize);
      const blob = await canvasToBlob(stackCanvasPages(pages), "image/jpeg", 0.98);
      if (!blob.size) throw new Error("Berkas JPG kosong");
      const result = await saveExportBlob(blob, getLabelExportFilename("jpg"), "Label QR Jajananku");
      if (result === "cancelled") toast.message("Penyimpanan JPG dibatalkan.");
      else toast.success(result === "shared" ? "JPG siap disimpan melalui pilihan perangkat." : "Lembar label berhasil diunduh sebagai JPG.");
    } catch { toast.error("JPG tidak dapat dibuat. Coba ulangi setelah semua QR termuat."); } finally { setExporting(null); }
  };

  const exportPdf = async () => {
    if (!readyForExport) return;
    try {
      setExporting("pdf");
      const pages = await renderLabelPages(labels, images, labelSize);
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      pages.forEach((page, index) => {
        if (index) pdf.addPage();
        pdf.addImage(page.toDataURL("image/png"), "PNG", 0, 0, 210, 297, undefined, "FAST");
      });
      const result = await saveExportBlob(pdf.output("blob"), getLabelExportFilename("pdf"), "Label QR Jajananku");
      if (result === "cancelled") toast.message("Penyimpanan PDF dibatalkan.");
      else toast.success(result === "shared" ? "PDF siap disimpan melalui pilihan perangkat." : "Lembar label berhasil diunduh sebagai PDF.");
    } catch { toast.error("PDF tidak dapat dibuat. Coba ulangi setelah semua QR termuat."); } finally { setExporting(null); }
  };

  if (isLoading) return <div className="mx-auto grid min-h-[52vh] max-w-7xl place-items-center text-center"><div><Loader2 className="mx-auto h-7 w-7 animate-spin text-primary" /><p className="mt-3 text-sm font-semibold text-muted-foreground">Memuat produk untuk label QR…</p></div></div>;
  if (isError) return <div className="mx-auto grid min-h-[52vh] max-w-7xl place-items-center text-center"><div className="max-w-sm rounded-3xl border bg-card p-8 shadow-sm"><AlertCircle className="mx-auto h-9 w-9 text-destructive" /><h1 className="mt-4 font-display text-xl font-extrabold">Label QR belum dapat dimuat</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">Coba ambil ulang data produk. Jika masalah berlanjut, pastikan cabang aktif sudah dipilih.</p><Button className="mt-5" onClick={() => void refetch()}><RefreshCw className="mr-2 h-4 w-4" />Muat ulang label</Button></div></div>;
  return <div className="mx-auto max-w-7xl"><PageHeading eyebrow="Identifikasi produk" title="Label QR siap cetak" description="Pilih cabang, atur ukuran dan jumlah salinan, lalu cetak atau simpan label produk cabang tersebut sebagai JPG maupun PDF." action={<div className="flex flex-wrap gap-2"><Button variant="outline" onClick={exportJpg} disabled={!readyForExport || !!exporting}><FileImage className="mr-2 h-4 w-4" />{exporting === "jpg" ? "Menyimpan…" : "Simpan JPG"}</Button><Button variant="outline" onClick={exportPdf} disabled={!readyForExport || !!exporting}><FileText className="mr-2 h-4 w-4" />{exporting === "pdf" ? "Menyimpan…" : "Simpan PDF"}</Button><Button onClick={() => window.print()} disabled={!labels.length}><Printer className="mr-2 h-4 w-4" />Cetak {labels.length || ""} label</Button></div>} />
    <Card className="no-print mb-5 border-0 shadow-sm"><CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between"><div><p className="text-sm font-extrabold">Cabang produk untuk label QR</p><p className="mt-1 text-xs text-muted-foreground">Daftar produk, pratinjau, cetak, JPG, dan PDF selalu mengikuti cabang ini.</p></div><div className="flex items-center gap-3"><Label htmlFor="qr-branch" className="whitespace-nowrap text-sm font-semibold">Cabang</Label><Select value={String(activeQrBranchId ?? "")} onValueChange={value => setSelectedBranchId(Number(value))} disabled={!workspace.data?.isTenantAdmin || branchChoices.length < 2}><SelectTrigger id="qr-branch" aria-label="Cabang produk untuk Cetak QR" className="w-[230px] bg-white"><SelectValue placeholder="Pilih cabang" /></SelectTrigger><SelectContent>{branchChoices.map(branch => <SelectItem key={branch.id} value={String(branch.id)}>{branch.name}</SelectItem>)}</SelectContent></Select></div></CardContent></Card>
    <Card className="no-print mb-5 border-0 shadow-sm"><CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-extrabold">Ukuran label sebelum diunduh</p><p className="mt-1 text-xs text-muted-foreground">Ukuran ini diterapkan pada pratinjau, cetak, JPG, dan PDF untuk {selectedBranch?.name ?? "cabang yang dipilih"}.</p></div><div className="flex items-center gap-3"><Label htmlFor="label-size" className="whitespace-nowrap text-sm font-semibold">Ukuran</Label><Select value={labelSize} onValueChange={value => setLabelSize(value as LabelSize)}><SelectTrigger id="label-size" aria-label="Ukuran label QR" className="w-[210px] bg-white"><SelectValue /></SelectTrigger><SelectContent>{labelSizePresets.map(size => <SelectItem value={size.id} key={size.id}>{size.name} · {size.dimensions}</SelectItem>)}</SelectContent></Select></div></CardContent></Card>
    <div className="no-print grid gap-5 lg:grid-cols-[0.92fr_1.08fr]"><Card className="border-0 shadow-sm"><CardContent className="p-0"><div className="border-b p-5"><div className="flex items-start justify-between gap-4"><div><h2 className="font-display text-xl font-bold">Produk & jumlah label</h2><p className="mt-1 text-sm text-muted-foreground">Pilih produk {selectedBranch?.name ? `di ${selectedBranch.name}` : "cabang aktif"}, lalu atur jumlah label yang ingin dicetak.</p></div><Button size="sm" variant="outline" onClick={toggleAll} disabled={!activeProducts.length}>{selectedIds.length === activeProducts.length ? <Square className="mr-2 h-4 w-4" /> : <CheckSquare2 className="mr-2 h-4 w-4" />}{selectedIds.length === activeProducts.length ? "Batal pilih" : "Pilih semua"}</Button></div></div><div className="max-h-[570px] divide-y overflow-auto">{activeProducts.map(product => { const chosen = selectedIds.includes(product.id); return <div className={`flex items-center gap-3 px-5 py-4 transition ${chosen ? "bg-[#f0fffb]" : "hover:bg-muted/50"}`} key={product.id}><input aria-label={`Pilih ${product.name}`} type="checkbox" className="h-4 w-4 accent-primary" checked={chosen} onChange={() => toggle(product.id)} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{product.name}</p><p className="mt-1 font-mono text-[11px] text-muted-foreground">{product.qrCode}</p></div><div className="hidden text-right sm:block"><p className="text-xs font-bold text-primary">{formatRupiah(product.salePrice)}</p><p className="mt-1 text-xs text-muted-foreground">{product.stock} stok</p></div>{chosen && <div className="flex items-center rounded-xl border bg-white p-1"><button aria-label={`Kurangi label ${product.name}`} onClick={() => setCopyCount(product.id, -1)} className="grid h-7 w-7 place-items-center rounded-lg hover:bg-muted"><Minus className="h-3.5 w-3.5" /></button><span className="w-8 text-center text-sm font-extrabold">{copies[product.id] ?? 1}</span><button aria-label={`Tambah label ${product.name}`} onClick={() => setCopyCount(product.id, 1)} className="grid h-7 w-7 place-items-center rounded-lg bg-[#e2faf5] text-primary hover:bg-[#cff4ed]"><Plus className="h-3.5 w-3.5" /></button></div>}</div>; })}{!activeProducts.length && <p className="p-8 text-center text-sm text-muted-foreground">Belum ada produk aktif untuk dibuatkan label pada {selectedBranch?.name ?? "cabang ini"}.</p>}</div></CardContent></Card><Card className="border-0 shadow-sm"><CardContent className="p-5"><div className="flex items-start justify-between gap-4"><div><h2 className="font-display text-xl font-bold">Pratinjau lembar label</h2><p className="mt-1 text-sm text-muted-foreground">{selectedLabelSize.name} {selectedLabelSize.dimensions}, tersusun {selectedLabelSize.columns} kolom pada A4. {selectedLabelSize.description}</p></div><Badge className="bg-[#e2faf5] text-primary hover:bg-[#e2faf5]"><Layers3 className="mr-1 h-3.5 w-3.5" />{labels.length} label</Badge></div><div className="mt-5 max-h-[570px] overflow-auto rounded-2xl border bg-[#edf8f5] p-4"><div className="label-preview-sheet">{labels.length ? <LabelSheet labels={labels} images={images} size={labelSize} /> : <div className="grid min-h-64 place-items-center rounded-xl border border-dashed bg-white p-6 text-center text-sm text-muted-foreground"><div><QrCode className="mx-auto h-9 w-9 text-primary/50" /><p className="mt-3 font-semibold text-foreground">Belum ada label dipilih</p><p className="mt-1">Pilih produk di panel sebelah kiri untuk memulai.</p></div></div>}</div></div><p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><Download className="h-3.5 w-3.5" />Ukuran pilihan dipakai sama pada hasil JPG, PDF siap cetak A4, dan dialog cetak.</p></CardContent></Card></div>
  </div>;
}
