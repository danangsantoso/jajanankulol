import PageHeading from "@/components/PageHeading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { JajanankuLogoMark } from "@/components/AppBrand";
import { compressProductImage } from "@/lib/productImageCompression";
import { trpc } from "@/lib/trpc";
import { Bluetooth, Check, FileText, ImagePlus, Loader2, Printer, Save, Sparkles, X } from "lucide-react";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";

type ReceiptForm = { template: "simple" | "standard" | "complete"; paperWidth: "58" | "70"; autoPrint: "yes" | "no"; receiptFooter: string };

const templates: Array<{ id: ReceiptForm["template"]; title: string; description: string; details: string[] }> = [
  { id: "simple", title: "Simple", description: "Ringkas untuk kebutuhan cepat.", details: ["Item & jumlah", "Harga per baris", "Total belanja"] },
  { id: "standard", title: "Standar", description: "Detail transaksi dengan logo.", details: ["Logo & nama toko", "Total & jenis pembayaran", "Nominal diterima & kembalian"] },
  { id: "complete", title: "Lengkap", description: "Identitas toko paling lengkap.", details: ["Semua fitur Standar", "Alamat usaha", "Ucapan terima kasih"] },
];

export default function ReceiptSettingsPage() {
  const settings = trpc.receiptSettings.get.useQuery();
  const utils = trpc.useUtils();
  const [form, setForm] = useState<ReceiptForm>({ template: "standard", paperWidth: "58", autoPrint: "no", receiptFooter: "Terima kasih sudah berbelanja." });
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  useEffect(() => { if (settings.data) setForm({ template: settings.data.template, paperWidth: settings.data.paperWidth, autoPrint: settings.data.autoPrint, receiptFooter: settings.data.receiptFooter }); }, [settings.data]);
  useEffect(() => { if (settings.data) setLogoPreviewUrl(settings.data.businessLogoUrl); }, [settings.data]);
  const update = trpc.receiptSettings.update.useMutation({
    onSuccess: async () => { await utils.receiptSettings.get.invalidate(); toast.success("Pengaturan struk berhasil disimpan."); },
    onError: error => toast.error(error.message),
  });
  const uploadLogo = trpc.businessLogo.upload.useMutation({
    onSuccess: async uploaded => {
      setLogoPreviewUrl(uploaded.url);
      await Promise.all([utils.receiptSettings.get.invalidate(), utils.businessProfile.get.invalidate()]);
      toast.success("Logo usaha berhasil diunggah ke struk.");
    },
    onError: error => toast.error(error.message),
  });
  const removeLogo = trpc.businessLogo.remove.useMutation({
    onSuccess: async () => {
      setLogoPreviewUrl(null);
      await Promise.all([utils.receiptSettings.get.invalidate(), utils.businessProfile.get.invalidate()]);
      toast.success("Logo usaha dihapus. Struk akan memakai logo Jajananku.");
    },
    onError: error => toast.error(error.message),
  });
  const selectLogo = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const compressed = await compressProductImage(file);
      setLogoPreviewUrl(compressed.previewUrl);
      await uploadLogo.mutateAsync({ dataUrl: compressed.dataUrl });
    } catch (error) {
      setLogoPreviewUrl(settings.data?.businessLogoUrl ?? null);
      toast.error(error instanceof Error ? error.message : "Logo usaha tidak dapat diproses.");
    }
  };
  if (settings.isLoading) return <div className="grid min-h-[52vh] place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!settings.data) return <div className="mx-auto max-w-5xl"><PageHeading eyebrow="Pengaturan" title="Struk belum tersedia" description="Muat ulang halaman untuk mengambil pengaturan struk usaha." /></div>;
  const selected = templates.find(item => item.id === form.template)!;
  return <div className="mx-auto max-w-6xl">
    <PageHeading eyebrow="Pengaturan operasional" title="Printer & struk" description="Pilih tampilan struk dan siapkan printer Bluetooth melalui dialog cetak perangkat." />
    <div className="mb-6 flex gap-3 rounded-2xl border border-[#b9eadf] bg-[#edfcf8] p-4 text-sm text-[#176b60]"><Bluetooth className="mt-0.5 h-5 w-5 shrink-0" /><p><strong>Printer Bluetooth:</strong> pasangkan printer termal terlebih dahulu melalui pengaturan Bluetooth Android, iPhone, atau komputer. Saat tombol cetak ditekan, pilih printer tersebut pada dialog cetak perangkat.</p></div>
    <div className="grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
      <Card className="border-0 shadow-sm"><CardContent className="p-6 sm:p-7"><div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary"><FileText className="h-5 w-5" /></div><div><h2 className="font-display text-xl font-extrabold">Layout struk</h2><p className="text-sm text-muted-foreground">Pilih satu tampilan untuk seluruh transaksi toko.</p></div></div>
        <div className="mt-6 grid gap-3 md:grid-cols-3">{templates.map(item => <button type="button" key={item.id} onClick={() => setForm(current => ({ ...current, template: item.id }))} className={`rounded-2xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${form.template === item.id ? "border-primary bg-primary/5 shadow-sm" : "hover:border-primary/35 hover:bg-muted/40"}`} aria-pressed={form.template === item.id}><div className="flex items-center justify-between gap-2"><h3 className="font-display text-lg font-extrabold">{item.title}</h3>{form.template === item.id && <span className="grid h-5 w-5 place-items-center rounded-full bg-primary text-primary-foreground"><Check className="h-3.5 w-3.5" /></span>}</div><p className="mt-1 text-xs leading-5 text-muted-foreground">{item.description}</p><ul className="mt-4 space-y-1.5 text-xs font-semibold text-[#426c63]">{item.details.map(detail => <li key={detail}>• {detail}</li>)}</ul></button>)}</div>
        <div className="mt-8 grid gap-6 border-t pt-6 sm:grid-cols-2"><div className="space-y-3"><Label>Lebar kertas termal</Label><div className="grid grid-cols-2 gap-2">{(["58", "70"] as const).map(width => <button type="button" key={width} onClick={() => setForm(current => ({ ...current, paperWidth: width }))} className={`rounded-xl border px-4 py-3 text-sm font-extrabold transition ${form.paperWidth === width ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"}`}>{width} mm</button>)}</div><p className="text-xs text-muted-foreground">Pilih sesuai lebar gulungan printer Anda.</p></div><div className="space-y-3"><Label htmlFor="autoPrint">Cetak otomatis setelah pembayaran</Label><div className="flex items-center justify-between rounded-xl border p-3"><div><p className="text-sm font-bold">Cetak langsung</p><p className="text-xs text-muted-foreground">Membuka dialog printer setelah transaksi lunas.</p></div><Switch id="autoPrint" checked={form.autoPrint === "yes"} onCheckedChange={checked => setForm(current => ({ ...current, autoPrint: checked ? "yes" : "no" }))} /></div></div></div>
        <div className="mt-6 space-y-2"><Label>Logo usaha pada struk</Label><div className="flex items-center gap-3 rounded-2xl border border-dashed bg-muted/30 p-3"><div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-xl border bg-white">{logoPreviewUrl ? <img src={logoPreviewUrl} alt="Logo usaha" className="h-full w-full object-contain p-1.5" onError={() => setLogoPreviewUrl(null)} /> : <JajanankuLogoMark className="h-14 w-14" />}</div><div className="min-w-0 flex-1"><p className="text-sm font-bold">Logo untuk struk Standar & Lengkap</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Pilih logo persegi atau mendekati persegi. File akan diperkecil menjadi 512 × 512 px dan dikompres agar cetak tetap cepat.</p><div className="mt-3 flex flex-wrap gap-2"><label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground"><ImagePlus className="h-4 w-4" />{uploadLogo.isPending ? "Mengunggah…" : "Unggah logo"}<input className="sr-only" accept="image/jpeg,image/png,image/webp" disabled={uploadLogo.isPending || removeLogo.isPending} onChange={event => { void selectLogo(event); }} type="file" /></label>{logoPreviewUrl && <Button type="button" variant="ghost" size="sm" disabled={uploadLogo.isPending || removeLogo.isPending} onClick={() => removeLogo.mutate()}><X className="mr-1 h-4 w-4" />Hapus logo</Button>}</div></div></div><p className="text-xs text-muted-foreground">Template Simple tidak menampilkan logo. Jika belum diunggah, struk memakai logo Jajananku.</p></div>
        <div className="mt-6 space-y-2"><Label htmlFor="receiptFooter">Ucapan terima kasih</Label><Textarea id="receiptFooter" rows={3} value={form.receiptFooter} onChange={event => setForm(current => ({ ...current, receiptFooter: event.target.value }))} disabled={form.template !== "complete"} /><p className="text-xs text-muted-foreground">Hanya dicetak pada layout Lengkap.</p></div>
        <Button className="mt-7 h-11" disabled={update.isPending} onClick={() => update.mutate(form)}><Save className="mr-2 h-4 w-4" />{update.isPending ? "Menyimpan…" : "Simpan pengaturan struk"}</Button>
      </CardContent></Card>
      <Card className="h-fit border-0 shadow-sm"><CardContent className="p-6"><div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#fff1d9] text-[#b76b00]"><Printer className="h-5 w-5" /></div><div><h2 className="font-display text-xl font-extrabold">Ringkasan aktif</h2><p className="text-sm text-muted-foreground">Pratinjau konfigurasi struk.</p></div></div><div className="mt-6 rounded-2xl border bg-[#fffcf6] p-5 font-mono text-xs text-[#283a36] shadow-inner"><div className="text-center">{form.template !== "simple" && <div className="mx-auto mb-2 h-11 w-11 overflow-hidden rounded-lg border bg-white">{logoPreviewUrl ? <img src={logoPreviewUrl} alt="Logo usaha pada struk" className="h-full w-full object-contain p-1" onError={() => setLogoPreviewUrl(null)} /> : <JajanankuLogoMark className="h-full w-full" />}</div>}<p className="font-bold">{form.template === "simple" ? "RINCIAN BELANJA" : settings.data.businessName.toUpperCase()}</p>{form.template !== "simple" && <p className="mt-1 text-[10px]">{settings.data.branchName}</p>}</div><div className="my-4 border-t border-dashed border-[#9ab6ad]" /><p>2 × Jajanan favorit <span className="float-right">Rp20.000</span></p><p className="mt-2">1 × Minuman <span className="float-right">Rp5.000</span></p><div className="my-4 border-t border-dashed border-[#9ab6ad]" /><p className="font-bold">TOTAL <span className="float-right">Rp25.000</span></p>{form.template !== "simple" && <><p className="mt-2">Pembayaran <span className="float-right">Tunai</span></p><p className="mt-1">Kembalian <span className="float-right">Rp5.000</span></p></>}{form.template === "complete" && <p className="mt-5 text-center leading-5">{form.receiptFooter}</p>}</div><dl className="mt-5 space-y-3 text-sm"><div className="flex items-center justify-between"><dt className="text-muted-foreground">Template</dt><dd><Badge variant="secondary">{selected.title}</Badge></dd></div><div className="flex items-center justify-between"><dt className="text-muted-foreground">Kertas</dt><dd className="font-bold">{form.paperWidth} mm</dd></div><div className="flex items-center justify-between"><dt className="text-muted-foreground">Cetak otomatis</dt><dd className="font-bold">{form.autoPrint === "yes" ? "Aktif" : "Manual"}</dd></div></dl><div className="mt-5 flex gap-2 rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground"><Sparkles className="h-4 w-4 shrink-0 text-primary" />Struk akan mengikuti transaksi dan cabang aktif saat dicetak.</div></CardContent></Card>
    </div>
  </div>;
}
