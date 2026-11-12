import PageHeading from "@/components/PageHeading";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatRupiah } from "@/lib/format";
import { trpc } from "@/lib/trpc";
import { BarChart3, Banknote, CircleDollarSign, Landmark, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";

function toDateInput(date: Date) { return date.toISOString().slice(0, 10); }

export default function FinanceReportPage() {
  const today = useMemo(() => new Date(), []);
  const [from, setFrom] = useState(() => toDateInput(new Date(today.getFullYear(), today.getMonth(), 1)));
  const [to, setTo] = useState(() => toDateInput(today));
  const workspace = trpc.workspace.current.useQuery();
  const [branch, setBranch] = useState("all");
  const params = useMemo(() => ({ from: `${from}T00:00:00.000Z`, to: `${to}T23:59:59.999Z`, branchId: branch === "all" ? null : Number(branch) }), [from, to, branch]);
  const { data, isFetching, refetch } = trpc.analytics.finance.useQuery(params);
  const cards = [
    { label: "Omzet", value: data?.revenue, icon: CircleDollarSign, tone: "bg-primary text-primary-foreground" },
    { label: "Modal / HPP", value: data?.cost, icon: Landmark, tone: "bg-secondary text-secondary-foreground" },
    { label: "Laba bersih", value: data?.profit, icon: BarChart3, tone: "bg-accent text-accent-foreground" },
  ];
  return <div className="mx-auto max-w-7xl"><PageHeading eyebrow="Kinerja keuangan" title="Laporan laba-rugi" description="Rangkuman dasar penjualan berdasarkan periode untuk memantau omzet, modal produk, laba, serta penerimaan per metode bayar." />
    <Card className="border-0 shadow-sm"><CardContent className="flex flex-wrap items-end gap-4 p-5">{workspace.data?.isTenantAdmin && <label className="grid gap-2 text-sm font-semibold">Cabang<select className="h-10 rounded-md border bg-background px-3" value={branch} onChange={event => setBranch(event.target.value)}><option value="all">Semua cabang</option>{workspace.data.branches.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}<label className="grid gap-2 text-sm font-semibold">Dari<Input value={from} onChange={event => setFrom(event.target.value)} type="date" /></label><label className="grid gap-2 text-sm font-semibold">Sampai<Input value={to} onChange={event => setTo(event.target.value)} type="date" /></label><Button variant="outline" onClick={() => refetch()} disabled={isFetching}><RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />Perbarui laporan</Button></CardContent></Card>
    <section className="mt-5 grid gap-4 md:grid-cols-3">{cards.map(card => { const Icon = card.icon; return <Card className="border-0 shadow-sm" key={card.label}><CardContent className="flex items-center justify-between p-5"><div><p className="text-sm font-medium text-muted-foreground">{card.label}</p><p className="mt-2 text-2xl font-bold tracking-tight">{formatRupiah(card.value)}</p></div><div className={`grid h-11 w-11 place-items-center rounded-2xl ${card.tone}`}><Icon className="h-5 w-5" /></div></CardContent></Card>})}</section>
    <section className="mt-5 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]"><Card className="border-0 shadow-sm"><CardContent className="p-5"><h2 className="font-display text-xl font-bold">Komposisi pembayaran</h2><p className="mt-1 text-sm text-muted-foreground">Penerimaan lunas menurut metode pembayaran.</p><div className="mt-6 space-y-5"><PaymentRow label="Tunai" value={data?.paymentBreakdown.cash || 0} total={data?.revenue || 0} /><PaymentRow label="QRIS" value={data?.paymentBreakdown.qris || 0} total={data?.revenue || 0} /></div></CardContent></Card><Card className="border-0 bg-primary text-primary-foreground shadow-sm"><CardContent className="p-6"><div className="flex items-start justify-between"><div><p className="text-sm font-medium text-primary-foreground/70">Ringkasan periode</p><h2 className="mt-1 font-display text-3xl font-bold">{data?.transactions || 0} transaksi</h2></div><Banknote className="h-8 w-8 opacity-80" /></div><div className="mt-10 border-t border-primary-foreground/20 pt-5"><div className="flex justify-between text-sm"><span className="text-primary-foreground/70">Margin laba</span><strong>{data?.revenue ? `${Math.round(((data.profit || 0) / data.revenue) * 100)}%` : "0%"}</strong></div><p className="mt-5 text-xs leading-5 text-primary-foreground/70">Laba bersih dihitung dari omzet dikurangi HPP setiap unit yang benar-benar terjual pada periode terpilih.</p></div></CardContent></Card></section>
  </div>;
}

function PaymentRow({ label, value, total }: { label: string; value: number; total: number }) {
  const percentage = total ? Math.round((value / total) * 100) : 0;
  return <div><div className="mb-2 flex items-center justify-between text-sm"><span className="font-semibold">{label}</span><span className="text-muted-foreground">{formatRupiah(value)} · {percentage}%</span></div><div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${percentage}%` }} /></div></div>;
}
