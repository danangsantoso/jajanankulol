import { Button } from "@/components/ui/button";
import { formatRupiah } from "@/lib/format";
import { trpc } from "@/lib/trpc";
import { ArrowRight, BarChart3, Building2, CheckCircle2, CircleDollarSign, Download, MessageCircle, ScanLine, Share, Sparkles, Store, UsersRound } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";

const tierTone = { bronze: "bg-[#fff0df] text-[#9a5c20]", silver: "bg-[#edf3f5] text-[#53676e]", gold: "bg-[#fff4c8] text-[#9a6b00]", platinum: "bg-[#eee9ff] text-[#6752a4]" } as const;
type Tier = keyof typeof tierTone;
type ActiveTier = "bronze" | "silver" | "gold";
type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};
type PublicPlan = {
  id: number;
  name: string;
  tier: Tier;
  durationDays: number;
  branchLimit: number;
  cashierLimit: number;
  regularPrice: number | string;
  salePrice: number | string | null;
  availability: "available" | "coming_soon" | "archived";
};

const activeTiers: ActiveTier[] = ["bronze", "silver", "gold"];
const tierLabel = (tier: Tier) => tier[0].toUpperCase() + tier.slice(1);
const durationLabel = (days: number) => days === 365 ? "12 bulan" : `${Math.round(days / 30)} bulan`;
const packageFeatures = ["Kasir scan QR, pembayaran tunai & QRIS", "Stok dan katalog barang per outlet", "Dashboard omzet serta laporan laba-rugi dasar", "Admin Utama, Admin Cabang, dan Kasir sesuai kebutuhan usaha"];

export default function LandingPage() {
  const [, setLocation] = useLocation();
  const settings = trpc.platform.publicSettings.useQuery();
  const plans = trpc.platform.plans.useQuery();
  const [selectedPlanIds, setSelectedPlanIds] = useState<Partial<Record<ActiveTier, number>>>({});
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showInstallHelp, setShowInstallHelp] = useState(false);
  const number = settings.data?.whatsappNumber?.replace(/\D/g, "");
  const message = settings.data?.whatsappMessage || "Halo Jajananku, saya ingin mengetahui solusi POS untuk usaha saya.";
  const whatsappUrl = number ? `https://wa.me/${number}?text=${encodeURIComponent(message)}` : undefined;
  const allPlans = (plans.data ?? []) as PublicPlan[];
  const platinumPlan = allPlans.find(plan => plan.tier === "platinum" && plan.availability === "coming_soon");

  useEffect(() => {
    const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
    const displayModeStandalone = window.matchMedia?.("(display-mode: standalone)").matches;
    setIsInstalled(Boolean(displayModeStandalone || navigatorWithStandalone.standalone));

    const captureInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", captureInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", captureInstallPrompt);
  }, []);

  const selectPlan = (plan: PublicPlan) => {
    if (!number) {
      setLocation("/login");
      return;
    }
    const salePrice = plan.salePrice ?? plan.regularPrice;
    const packageMessage = `Halo Jajananku, saya ingin memilih ${plan.name} (${durationLabel(plan.durationDays)}), promo ${formatRupiah(salePrice)} untuk ${plan.branchLimit} outlet dan ${plan.cashierLimit} akun kasir. Mohon informasi pendaftaran dan pembayaran.`;
    window.open(`https://wa.me/${number}?text=${encodeURIComponent(packageMessage)}`, "_blank", "noopener,noreferrer");
  };

  const installApplication = async () => {
    if (isInstalled) {
      setShowInstallHelp(true);
      return;
    }

    if (!installPrompt) {
      setShowInstallHelp(true);
      return;
    }

    await installPrompt.prompt();
    const result = await installPrompt.userChoice;
    setInstallPrompt(null);
    setShowInstallHelp(true);
    if (result.outcome === "accepted") setIsInstalled(true);
  };

  return <div className="min-h-screen overflow-hidden bg-[#f7fffd] text-[#103d37]">
    <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 md:px-8"><div className="flex items-center gap-3"><img src="/manus-storage/jajananku-logo_5fd59c99.png" className="h-11 w-11 rounded-2xl object-cover shadow-sm" /><span className="font-display text-2xl font-extrabold tracking-tight text-[#0c796e]">Jajananku</span></div><div className="flex items-center gap-1"><Button variant="ghost" className="hidden font-bold text-[#47766e] sm:inline-flex" onClick={() => document.getElementById("paket")?.scrollIntoView({ behavior: "smooth" })}>Paket & harga</Button><Button variant="ghost" className="font-bold text-[#0c796e]" onClick={() => setLocation("/login")}>Masuk aplikasi</Button></div></header>
    <main>
      <section className="mx-auto grid max-w-7xl items-center gap-10 px-5 pb-20 pt-12 md:grid-cols-[1.1fr_.9fr] md:px-8 md:pb-28 md:pt-20">
        <div><div className="inline-flex rounded-full bg-[#dff8f3] px-4 py-2 text-xs font-extrabold uppercase tracking-[.15em] text-[#0c796e]">POS UMKM yang tumbuh bersama Anda</div><h1 className="mt-6 max-w-3xl font-display text-5xl font-extrabold leading-[.98] tracking-tight text-[#0b5149] md:text-7xl">Kelola banyak brand dan cabang, tetap terasa <span className="text-[#f2b82e]">ringan.</span></h1><p className="mt-6 max-w-xl text-lg leading-relaxed text-[#5d7b74]">Jajananku menyatukan kasir, stok, QR item, pembayaran QRIS, dan laporan untuk setiap UMKM—dengan akses aman per usaha dan per cabang.</p><div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap"><Button className="h-12 rounded-2xl bg-[#0c796e] px-6 text-base font-extrabold hover:bg-[#09645c]" onClick={() => setLocation("/login")}>Daftar & coba gratis 3 hari <ArrowRight className="ml-2 h-4 w-4" /></Button><Button variant="outline" className="h-12 rounded-2xl border-[#b8e8df] px-6 text-base font-extrabold text-[#0c796e] hover:bg-[#eafbf7]" onClick={installApplication}><Download className="mr-2 h-5 w-5" />{isInstalled ? "Aplikasi terpasang" : "Unduh aplikasi"}</Button>{whatsappUrl ? <a href={whatsappUrl} target="_blank" rel="noreferrer"><Button variant="outline" className="h-12 w-full rounded-2xl border-[#b8e8df] px-6 text-base font-extrabold text-[#0c796e] hover:bg-[#eafbf7]"><MessageCircle className="mr-2 h-5 w-5" />Hubungi via WhatsApp</Button></a> : <Button variant="outline" disabled className="h-12 rounded-2xl px-6 font-bold">WhatsApp segera tersedia</Button>}</div>{showInstallHelp && <div aria-live="polite" className="mt-4 max-w-xl rounded-2xl border border-[#b8e8df] bg-[#effcf9] p-4 text-sm leading-relaxed text-[#3f6f67]"><p className="font-extrabold text-[#0c796e]">{isInstalled ? "Jajananku sudah terpasang di perangkat ini." : "Pasang Jajananku dari menu browser."}</p>{!isInstalled && <><p className="mt-1">Di Chrome Android, buka menu ⋮ lalu pilih <strong>Install aplikasi</strong> atau <strong>Tambahkan ke layar utama</strong>.</p><div aria-label="Petunjuk pemasangan iPhone dan iPad" className="mt-3 flex items-center gap-3 rounded-xl border border-[#c7ece4] bg-white/80 p-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#dff8f3] text-[#0c796e]" aria-label="Ikon Bagikan Safari"><Share aria-hidden="true" className="h-6 w-6" /></span><p><strong>iPhone/iPad:</strong> ketuk ikon <strong>Bagikan</strong> <span className="inline-flex align-text-bottom text-[#0c796e]"><Share aria-hidden="true" className="h-4 w-4" /></span> di Safari, pilih <strong>Tambahkan ke Layar Utama</strong>, lalu ketuk <strong>Tambah</strong>.</p></div></>}</div>}<div className="mt-10 flex flex-wrap gap-x-5 gap-y-3 text-sm font-bold text-[#47766e]"><span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#0c796e]" />Trial gratis 3 hari</span><span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#0c796e]" />Paket per usaha</span><span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#0c796e]" />PWA siap kasir</span></div></div>
        <div className="relative mx-auto max-w-md"><div className="absolute -inset-8 rounded-[3rem] bg-[#42d1c0]/25 blur-3xl" /><div className="relative rounded-[3rem] bg-gradient-to-br from-[#59d6c9] to-[#1cb3aa] p-7 shadow-[0_30px_80px_rgba(12,121,110,.28)]"><img src="/manus-storage/jajananku-logo_5fd59c99.png" className="mx-auto w-56 rounded-[2rem] shadow-2xl" /><div className="mt-7 rounded-3xl bg-white/90 p-5"><div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#e7fbf7] text-[#0c796e]"><Store className="h-5 w-5" /></div><div><p className="font-extrabold">Satu platform, banyak usaha</p><p className="text-sm text-[#638079]">Paket dan masa aktif terpisah per usaha</p></div></div></div></div></div>
      </section>
      <section className="border-y border-[#dff2ee] bg-white/70"><div className="mx-auto grid max-w-7xl gap-5 px-5 py-12 md:grid-cols-3 md:px-8">{[{ icon: Store, title: "Usaha terpisah", text: "Setiap brand memiliki paket, masa aktif, produk, stok, transaksi, dan laporan yang terisolasi." }, { icon: Building2, title: "Cabang terkendali", text: "Admin Utama mengelola outlet; Admin Cabang hanya melihat omzet dan stok cabangnya." }, { icon: ScanLine, title: "Kasir cepat", text: "Scan QR, bukti QRIS, dan transaksi berada dalam alur POS yang ringkas." }].map(feature => { const Icon = feature.icon; return <div className="rounded-3xl p-5" key={feature.title}><div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#e7fbf7] text-[#0c796e]"><Icon className="h-5 w-5" /></div><h2 className="mt-5 font-display text-2xl font-extrabold">{feature.title}</h2><p className="mt-2 leading-relaxed text-[#66827b]">{feature.text}</p></div>; })}</div></section>
      {allPlans.length ? <section id="paket" className="mx-auto max-w-7xl px-5 py-20 md:px-8"><div className="max-w-3xl"><p className="text-xs font-extrabold uppercase tracking-[.16em] text-[#0c796e]">Paket langganan</p><h2 className="mt-2 font-display text-4xl font-extrabold">Tiga level paket, durasi fleksibel.</h2><p className="mt-3 text-[#66827b]">Pilih level sesuai kapasitas usaha, lalu tentukan lama langganan dari dropdown pada kartu. Harga dan promo akan berubah otomatis.</p></div><div className="mt-8 grid gap-4 rounded-[2rem] border border-[#d7eee9] bg-white p-5 shadow-sm md:grid-cols-2 md:p-7"><div><p className="text-xs font-extrabold uppercase tracking-[.14em] text-[#0c796e]">Termasuk di setiap paket aktif</p><h3 className="mt-2 font-display text-2xl font-extrabold">Fitur operasional Jajananku</h3><p className="mt-2 max-w-xl text-sm leading-6 text-[#66827b]">Perbedaan tiap level hanya pada kapasitas outlet dan akun kasir aktif—fitur inti POS tetap tersedia.</p></div><ul className="grid gap-3 text-sm font-semibold text-[#476f67] sm:grid-cols-2">{packageFeatures.map(feature => <li key={feature} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#0c796e]" />{feature}</li>)}</ul></div><div className="mt-8 grid gap-5 lg:grid-cols-3">{activeTiers.map(tier => {
        const options = allPlans.filter(plan => plan.tier === tier && plan.availability === "available").sort((a, b) => a.durationDays - b.durationDays);
        const fallbackPlan = options[0];
        if (!fallbackPlan) return null;
        const selectedPlan = options.find(plan => plan.id === selectedPlanIds[tier]) ?? fallbackPlan;
        const salePrice = selectedPlan.salePrice ?? selectedPlan.regularPrice;
        const savings = Number(selectedPlan.regularPrice) - Number(salePrice);
        return <article className="flex flex-col rounded-3xl border border-[#d7eee9] bg-white p-6 shadow-sm" key={tier}><div className="flex items-start justify-between gap-3"><div><span className={`inline-flex rounded-full px-3 py-1 text-xs font-extrabold uppercase tracking-wider ${tierTone[tier]}`}>{tierLabel(tier)}</span><h3 className="mt-3 font-display text-2xl font-extrabold">Paket {tierLabel(tier)}</h3><p className="mt-1 text-sm text-[#66827b]">{selectedPlan.branchLimit} outlet dan {selectedPlan.cashierLimit} kasir aktif.</p></div><Building2 className="h-6 w-6 text-[#0c796e]" /></div><label className="mt-6 block text-sm font-extrabold text-[#315e56]" htmlFor={`duration-${tier}`}>Pilih lama langganan<select id={`duration-${tier}`} aria-label={`Durasi paket ${tierLabel(tier)}`} className="mt-2 h-11 w-full rounded-xl border border-[#b8e8df] bg-[#fbfffe] px-3 font-semibold text-[#103d37] outline-none ring-[#0c796e] focus:ring-2" value={selectedPlan.id} onChange={event => setSelectedPlanIds(current => ({ ...current, [tier]: Number(event.target.value) }))}>{options.map(plan => <option key={plan.id} value={plan.id}>{durationLabel(plan.durationDays)} · {formatRupiah(plan.salePrice ?? plan.regularPrice)}</option>)}</select></label><div className="mt-5 rounded-2xl bg-[#f8fcfb] p-4"><p className="text-xs font-bold uppercase tracking-[.12em] text-[#78958e]">Harga promo · {durationLabel(selectedPlan.durationDays)}</p><p className="mt-1 font-display text-3xl font-extrabold text-[#0c796e]">{formatRupiah(salePrice)}</p><p className="mt-1 text-sm text-[#7a958e]">Normal <span className="line-through">{formatRupiah(selectedPlan.regularPrice)}</span></p>{savings > 0 && <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#e0f7f1] px-2.5 py-1 text-xs font-extrabold text-[#0c796e]"><CircleDollarSign className="h-3.5 w-3.5" />Hemat {formatRupiah(savings)}</p>}</div><ul className="mt-5 space-y-2 text-sm text-[#56766f]"><li className="flex gap-2"><ScanLine className="mt-0.5 h-4 w-4 shrink-0 text-[#0c796e]" />Kasir QR & pembayaran QRIS</li><li className="flex gap-2"><BarChart3 className="mt-0.5 h-4 w-4 shrink-0 text-[#0c796e]" />Laporan omzet dan laba-rugi dasar</li></ul><Button className="mt-6 w-full rounded-2xl" onClick={() => selectPlan(selectedPlan)}>{number ? "Pilih & hubungi" : "Pilih paket"}</Button></article>;
      })}</div>{platinumPlan && <aside className="mt-7 flex flex-col gap-3 rounded-3xl border border-dashed border-[#c9bdf1] bg-[#faf8ff] p-5 text-[#514477] sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><span aria-label="Paket Platinum Coming Soon" className="grid h-11 w-11 place-items-center rounded-2xl bg-[#6752a4] text-white"><Sparkles className="h-5 w-5" /></span><div><p className="font-display text-lg font-extrabold">Platinum · Coming Soon</p><p className="text-sm text-[#70628f]">Rencana kapasitas hingga {platinumPlan.branchLimit} outlet dan {platinumPlan.cashierLimit} kasir. Belum dapat dipilih.</p></div></div><span className="inline-flex w-fit rounded-full bg-[#eee9ff] px-3 py-1.5 text-xs font-extrabold uppercase tracking-wider text-[#6752a4]">Coming Soon</span></aside>}</section> : null}
    </main>
    <footer className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-8 text-sm text-[#68867f] md:flex-row md:items-center md:justify-between md:px-8"><span>© {new Date().getFullYear()} Jajananku</span><span>POS ramah UMKM, siap berkembang.</span></footer>
  </div>;
}
