import PageHeading from "@/components/PageHeading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ReceiptDocument, printReceipt, type ReceiptData } from "@/components/ReceiptDocument";
import { formatDateTime, formatRupiah } from "@/lib/format";
import { trpc } from "@/lib/trpc";
import { ExternalLink, Image, Loader2, Printer, ReceiptText } from "lucide-react";
import { useState } from "react";

export default function TransactionsPage() {
  const workspace = trpc.workspace.current.useQuery();
  const settings = trpc.receiptSettings.get.useQuery();
  const utils = trpc.useUtils();
  const [branch, setBranch] = useState("all");
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [printingId, setPrintingId] = useState<number | null>(null);
  const { data: transactions, isLoading } = trpc.analytics.transactions.useQuery({ branchId: branch === "all" ? null : Number(branch) });
  const preparePrint = async (transactionId: number) => {
    if (!settings.data) return;
    setPrintingId(transactionId);
    try {
      const data = await utils.analytics.receipt.fetch({ transactionId });
      setReceipt(data);
      window.setTimeout(printReceipt, 60);
    } catch (error) { /* tRPC errors are surfaced locally to avoid interrupting table navigation */ }
    finally { setPrintingId(null); }
  };
  return <div className="mx-auto max-w-7xl"><PageHeading eyebrow="Audit penjualan" title="Riwayat transaksi" description="Daftar transaksi lunas terbaru untuk penelusuran operasional, rekonsiliasi kas, dan pengecekan bukti QRIS." />
    {workspace.data?.isTenantAdmin && <div className="mb-4 flex justify-end"><label className="grid gap-2 text-sm font-semibold">Cabang<select className="h-10 min-w-52 rounded-md border bg-background px-3" value={branch} onChange={event => setBranch(event.target.value)}><option value="all">Semua cabang</option>{workspace.data.branches.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div>}
    <Card className="border-0 shadow-sm"><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-y bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-5 py-3 font-semibold">Nomor nota</th><th className="px-5 py-3 font-semibold">Kasir</th><th className="px-5 py-3 font-semibold">Metode</th><th className="px-5 py-3 font-semibold">Bukti QRIS</th><th className="px-5 py-3 font-semibold">Waktu lunas</th><th className="px-5 py-3 text-right font-semibold">Total</th><th className="px-5 py-3 text-right font-semibold">Struk</th></tr></thead><tbody>{isLoading ? <tr><td colSpan={7} className="px-5 py-10 text-center text-muted-foreground">Memuat transaksi…</td></tr> : transactions?.length ? transactions.map(transaction => <tr className="border-b last:border-0" key={transaction.id}><td className="px-5 py-4 font-semibold">{transaction.receiptNo}</td><td className="px-5 py-4 text-muted-foreground">{transaction.cashierName || "Kasir"}</td><td className="px-5 py-4"><Badge variant="secondary">{transaction.paymentMethod === "cash" ? "Tunai" : "QRIS"}</Badge></td><td className="px-5 py-4">{transaction.paymentMethod === "qris" ? transaction.paymentProofUrl ? <a href={transaction.paymentProofUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-1.5 text-xs font-bold text-primary hover:bg-primary/15"><Image className="h-3.5 w-3.5" />Lihat foto<ExternalLink className="h-3 w-3" /></a> : <span className="text-xs font-medium text-destructive">Belum tersedia</span> : <span className="text-xs text-muted-foreground">—</span>}</td><td className="px-5 py-4 text-muted-foreground">{formatDateTime(transaction.paidAt)}</td><td className="px-5 py-4 text-right font-bold">{formatRupiah(transaction.total)}</td><td className="px-5 py-4 text-right"><Button size="sm" variant="outline" onClick={() => void preparePrint(transaction.id)} disabled={!settings.data || printingId === transaction.id}>{printingId === transaction.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Printer className="mr-1.5 h-4 w-4" />Cetak</>}</Button></td></tr>) : <tr><td colSpan={7} className="px-5 py-16 text-center"><ReceiptText className="mx-auto mb-3 h-8 w-8 text-muted-foreground" /><p className="font-semibold">Belum ada transaksi</p><p className="mt-1 text-sm text-muted-foreground">Transaksi yang dilunasi akan muncul di sini.</p></td></tr>}</tbody></table></div></CardContent></Card>
    {receipt && settings.data && <ReceiptDocument receipt={receipt} settings={settings.data} />}
  </div>;
}
