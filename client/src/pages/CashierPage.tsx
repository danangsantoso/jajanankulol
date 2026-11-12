import { useAuth } from "@/_core/hooks/useAuth";
import { AppBrand } from "@/components/AppBrand";
import DevicePermissionsDialog from "@/components/DevicePermissionsDialog";
import PaymentProofUploader, { PaymentProof } from "@/components/PaymentProofUploader";
import { ProductImage } from "@/components/ProductImage";
import { ReceiptDocument, printReceipt, type ReceiptData } from "@/components/ReceiptDocument";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatRupiah } from "@/lib/format";
import { filterProductsForCatalog, getProductCategory, listProductCategories } from "@/lib/productCategory";
import { getCameraPermissionState } from "@/lib/devicePermissions";
import { startNativeQrScanner } from "@/lib/nativeQrScanner";
import { safelyStopQrScanner, type ManagedQrScanner } from "@/lib/qrScannerLifecycle";
import { getCameraErrorMessage, getQrCameraAttempts, getQrScannerStartIssue, shouldRetryQrCamera } from "@/lib/qrScannerSupport";
import { trpc } from "@/lib/trpc";
import { Banknote, Camera, CheckCircle2, CircleMinus, CirclePlus, Cookie, CupSoda, Grid2X2, House, IceCreamBowl, ImagePlus, Keyboard, Loader2, LogOut, Package, QrCode, ReceiptText, Sandwich, ScanLine, Search, ShieldCheck, ShoppingBag, Trash2, Utensils, X } from "lucide-react";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";

type ProductRow = { id: number; name: string; category: string; imageUrl?: string | null; qrCode: string; salePrice: string; stock: number };
type CartItem = ProductRow & { quantity: number };

function categoryIcon(category: string) {
  const normalized = category.toLowerCase();
  if (normalized.includes("minum")) return CupSoda;
  if (normalized.includes("roti") || normalized.includes("kue")) return Cookie;
  if (normalized.includes("camil") || normalized.includes("snack")) return IceCreamBowl;
  if (normalized.includes("paket")) return Package;
  if (normalized.includes("makan")) return Utensils;
  return Sandwich;
}

export default function CashierPage() {
  const [, setLocation] = useLocation();
  const { user, loading, logout } = useAuth();
  const utils = trpc.useUtils();
  const { data: products, isLoading, error: productsError, refetch: refetchProducts } = trpc.products.active.useQuery(undefined, { enabled: Boolean(user) });
  const [cart, setCart] = useState<CartItem[]>([]);
  const [manualCode, setManualCode] = useState("");
  const [activeCategory, setActiveCategory] = useState("Semua");
  const [productSearch, setProductSearch] = useState("");
  const [permissionsOpen, setPermissionsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const scannerRef = useRef<ManagedQrScanner | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "qris">("cash");
  const [amountReceived, setAmountReceived] = useState("");
  const [paymentProof, setPaymentProof] = useState<PaymentProof | null>(null);
  const [completedSale, setCompletedSale] = useState<ReceiptData | null>(null);
  const receiptSettings = trpc.receiptSettings.get.useQuery(undefined, { enabled: Boolean(user) });
  const printedReceiptNo = useRef<string | null>(null);
  const checkout = trpc.pos.checkout.useMutation({
    onSuccess: result => {
      setCompletedSale(result);
      setCart([]);
      setAmountReceived("");
      setPaymentProof(null);
      utils.products.active.invalidate();
      utils.analytics.dashboard.invalidate();
      utils.analytics.transactions.invalidate();
      toast.success("Pembayaran berhasil dicatat sebagai lunas.");
    },
    onError: error => toast.error(error.message),
  });

  useEffect(() => {
    if (!completedSale || receiptSettings.data?.autoPrint !== "yes" || printedReceiptNo.current === completedSale.receiptNo) return;
    printedReceiptNo.current = completedSale.receiptNo;
    const timer = window.setTimeout(printReceipt, 120);
    return () => window.clearTimeout(timer);
  }, [completedSale, receiptSettings.data?.autoPrint]);

  useEffect(() => {
    if (!user || typeof window === "undefined") return;
    const standalone = window.matchMedia?.("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (!standalone) return;
    let active = true;
    void getCameraPermissionState().then(state => { if (active && state !== "granted") setPermissionsOpen(true); });
    return () => { active = false; };
  }, [user]);

  const addProduct = useCallback((product: ProductRow) => {
    if (product.stock <= 0) return toast.error(`${product.name} sedang habis.`);
    setCart(current => {
      const existing = current.find(item => item.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) { toast.error(`Stok ${product.name} tidak mencukupi.`); return current; }
        return current.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...current, { ...product, quantity: 1 }];
    });
    toast.success(`${product.name} ditambahkan.`);
  }, []);

  const addByCode = useCallback(async (code: string) => {
    const normalized = code.trim();
    if (!normalized) return;
    try {
      const product = await utils.products.byQr.fetch({ qrCode: normalized });
      if (!product) return toast.error("Kode QR tidak ditemukan atau produk sudah diarsipkan.");
      addProduct(product);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Kode QR tidak dapat dibaca.");
    }
  }, [addProduct, utils.products.byQr]);

  const stopActiveScanner = useCallback(async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    await safelyStopQrScanner(scanner);
  }, []);

  const closeScanner = useCallback(() => {
    setScannerOpen(false);
    void stopActiveScanner();
  }, [stopActiveScanner]);

  useEffect(() => {
    if (!scannerOpen) return;
    let active = true;
    const startScanner = async () => {
      const startIssue = getQrScannerStartIssue(window.isSecureContext, Boolean(navigator.mediaDevices?.getUserMedia));
      if (startIssue) {
        toast.error(startIssue);
        setScannerOpen(false);
        return;
      }
      const reader = document.getElementById("jajananku-qr-reader");
      if (!reader || !active) return;
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (!active || !document.getElementById("jajananku-qr-reader")) return;
        const onDecoded = async (decodedText: string) => {
          if (!active) return;
          active = false;
          await stopActiveScanner();
          setScannerOpen(false);
          await addByCode(decodedText);
        };
        const nativeScanner = await startNativeQrScanner(reader, decodedText => { void onDecoded(decodedText); });
        if (nativeScanner) {
          scannerRef.current = nativeScanner;
          return;
        }
        let lastError: unknown = null;
        for (const cameraAttempt of getQrCameraAttempts()) {
          if (!active) return;
          const scanner = new Html5Qrcode("jajananku-qr-reader");
          scannerRef.current = scanner;
          try {
            await scanner.start(cameraAttempt, { fps: 8, qrbox: { width: 220, height: 220 }, aspectRatio: 1 }, decodedText => { void onDecoded(decodedText); }, () => undefined);
            return;
          } catch (error) {
            lastError = error;
            if (scannerRef.current === scanner) scannerRef.current = null;
            await safelyStopQrScanner(scanner);
            if (!shouldRetryQrCamera(error)) throw error;
          }
        }
        throw lastError;
      } catch (error) {
        await stopActiveScanner();
        if (active) toast.error(getCameraErrorMessage(error));
        setScannerOpen(false);
      }
    };
    const frame = window.requestAnimationFrame(() => { void startScanner(); });
    return () => { active = false; window.cancelAnimationFrame(frame); void stopActiveScanner(); };
  }, [addByCode, scannerOpen, stopActiveScanner]);

  const total = useMemo(() => cart.reduce((sum, item) => sum + Number(item.salePrice) * item.quantity, 0), [cart]);
  const promotionCart = useMemo(() => cart.map(item => ({ productId: item.id, quantity: item.quantity, unitPrice: Number(item.salePrice) })), [cart]);
  const promotionQuote = trpc.promotions.quote.useQuery({ items: promotionCart }, { enabled: Boolean(user && promotionCart.length) });
  const discountTotal = promotionQuote.data?.discountTotal ?? 0;
  const payableTotal = promotionQuote.data?.total ?? total;
  const categories = useMemo(() => listProductCategories(products ?? []), [products]);
  const filteredProducts = useMemo(() => filterProductsForCatalog(products ?? [], activeCategory, productSearch), [activeCategory, productSearch, products]);
  const change = paymentMethod === "cash" && amountReceived ? Math.max(0, Number(amountReceived) - payableTotal) : 0;
  const setQuantity = (id: number, nextQuantity: number) => setCart(current => current.flatMap(item => {
    if (item.id !== id) return [item];
    if (nextQuantity <= 0) return [];
    if (nextQuantity > item.stock) { toast.error(`Stok ${item.name} hanya ${item.stock} unit.`); return [item]; }
    return [{ ...item, quantity: nextQuantity }];
  }));
  const selectPayment = (method: "cash" | "qris") => { setPaymentMethod(method); if (method === "cash") setPaymentProof(null); };
  const completePayment = () => {
    if (!cart.length) return toast.error("Keranjang masih kosong.");
    if (paymentMethod === "cash" && Number(amountReceived) < payableTotal) return toast.error("Nominal tunai belum mencukupi.");
    if (paymentMethod === "qris" && !paymentProof) return toast.error("Unggah foto bukti transfer sebelum melunasi pembayaran QRIS.");
    checkout.mutate({
      paymentMethod,
      amountReceived: paymentMethod === "cash" ? Number(amountReceived) : undefined,
      paymentProofKey: paymentProof?.key,
      paymentProofUrl: paymentProof?.url,
      paymentProofMimeType: paymentProof?.mimeType,
      items: cart.map(item => ({ productId: item.id, quantity: item.quantity })),
    });
  };

  const handleCashierLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    closeScanner();
    try {
      await logout();
      toast.success("Anda telah berhasil keluar dari Kasir.");
      window.setTimeout(() => setLocation("/"), 700);
    } catch (error) {
      setIsLoggingOut(false);
      toast.error(error instanceof Error ? error.message : "Logout tidak dapat diproses. Coba lagi.");
    }
  };

  if (isLoggingOut) return <main className="grid min-h-screen place-items-center bg-background p-5"><div className="w-full max-w-sm rounded-3xl border bg-card p-8 text-center shadow-xl"><div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary"><CheckCircle2 className="h-7 w-7" /></div><p className="mt-6 text-xs font-bold uppercase tracking-[0.16em] text-primary">Sampai jumpa</p><h1 className="mt-2 font-display text-2xl font-bold">Anda telah logout</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">Sesi Kasir telah diakhiri. Anda akan diarahkan ke halaman utama.</p></div></main>;
  if (loading) return <div className="grid min-h-screen place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!user) return <main className="grid min-h-screen place-items-center bg-background p-5"><div className="w-full max-w-md rounded-3xl border bg-card p-8 text-center shadow-xl"><div className="mx-auto w-fit"><AppBrand /></div><p className="mt-8 text-xs font-bold uppercase tracking-[0.16em] text-primary">Akses kasir</p><h1 className="mt-2 font-display text-3xl font-bold">Masuk untuk mulai berjualan</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">Akses kasir menggunakan akun yang telah didaftarkan oleh pengelola Jajananku.</p><Button onClick={() => setLocation("/login")} className="mt-7 w-full" size="lg">Masuk ke kasir</Button></div></main>;

  return <main className="cashier-mobile-content min-h-screen bg-background"><header className="no-print sticky top-0 z-20 border-b bg-card/95 px-3 py-3 backdrop-blur md:px-6"><div className="mx-auto flex max-w-[1600px] items-center justify-between gap-3"><AppBrand /><div className="flex items-center gap-2"><div className="hidden text-right sm:block"><p className="text-sm font-bold">{user.name || "Kasir"}</p><p className="text-xs text-muted-foreground">Mode kasir aktif</p></div><Button type="button" onClick={() => setPermissionsOpen(true)} size="icon" variant="outline" aria-label="Pengaturan izin perangkat"><ShieldCheck className="h-4 w-4" /></Button><Badge className="bg-primary/10 text-primary hover:bg-primary/10">Kasir</Badge>{user.role === "cashier" && <Button type="button" onClick={() => void handleCashierLogout()} size="sm" variant="outline" aria-label="Keluar dari Kasir"><LogOut className="h-4 w-4 sm:mr-1.5" /><span className="hidden sm:inline">Keluar</span></Button>}{user.role === "admin" && <Link href="/"><Button size="sm" variant="outline">Dashboard</Button></Link>}</div></div></header>
    <div className="mx-auto grid max-w-[1600px] gap-4 p-3 sm:p-4 lg:grid-cols-[1fr_410px] lg:gap-5 lg:p-6"><section className="min-w-0"><div className="mb-4 flex flex-col justify-between gap-3 sm:mb-5 sm:flex-row sm:items-end sm:gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary sm:text-[11px]">Point of sale</p><h1 className="mt-1 font-display text-2xl font-bold tracking-tight sm:mt-2 sm:text-3xl">Kasir cepat</h1><p className="mt-1 text-xs text-muted-foreground sm:mt-2 sm:text-sm">Pindai QR produk atau pilih item langsung dari katalog.</p></div><div className="flex flex-wrap gap-2"><Button className="flex-1 sm:flex-none" onClick={() => setScannerOpen(true)}><Camera className="mr-2 h-4 w-4" />Scan kamera</Button><Button className="flex-1 sm:flex-none" variant="outline" onClick={() => document.getElementById("manual-code")?.focus()}><Keyboard className="mr-2 h-4 w-4" />Kode manual</Button></div></div>
      <div className="no-print mb-5 space-y-3 rounded-2xl border bg-card p-3 shadow-sm"><div><label htmlFor="product-search" className="sr-only">Cari produk</label><div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input id="product-search" className="h-11 pl-10 pr-10 text-sm font-semibold" value={productSearch} onChange={event => setProductSearch(event.target.value)} placeholder="Cari nama atau kode produk" />{productSearch && <button type="button" onClick={() => setProductSearch("")} aria-label="Hapus pencarian produk" className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"><X className="h-4 w-4" /></button>}</div></div><div className="flex gap-2 overflow-x-auto pb-1" aria-label="Filter kategori produk">{categories.map(category => { const Icon = category === "Semua" ? Grid2X2 : categoryIcon(category); const selected = activeCategory === category; return <button key={category} onClick={() => setActiveCategory(category)} className={`flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition ${selected ? "border-primary bg-primary text-primary-foreground shadow-sm" : "bg-card hover:border-primary/40 hover:bg-secondary"}`}><Icon className="h-4 w-4" />{category}</button>; })}</div><div className="flex gap-2 border-t pt-3"><Input id="manual-code" value={manualCode} onChange={event => setManualCode(event.target.value)} onKeyDown={event => { if (event.key === "Enter") { addByCode(manualCode); setManualCode(""); } }} placeholder="Masukkan kode QR item" /><Button onClick={() => { addByCode(manualCode); setManualCode(""); }} variant="secondary">Tambah</Button></div></div>
      <section className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 xl:grid-cols-3">{isLoading ? <div className="col-span-full grid min-h-64 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div> : productsError ? <div className="col-span-full rounded-3xl border border-destructive/25 bg-destructive/5 p-8 text-center"><p className="font-semibold text-destructive">Produk belum dapat dimuat</p><p className="mt-1 text-sm text-muted-foreground">{productsError.message || "Periksa koneksi lalu coba kembali."}</p><Button className="mt-4" type="button" variant="outline" onClick={() => void refetchProducts()}>Muat ulang katalog</Button></div> : filteredProducts.length ? filteredProducts.map(product => <button onClick={() => addProduct(product)} className="group min-w-0 overflow-hidden rounded-2xl border bg-card text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50" disabled={product.stock <= 0} key={product.id}><div className="relative aspect-square overflow-hidden bg-secondary"><ProductImage src={product.imageUrl} alt={`Foto ${product.name}`} className="h-full w-full" imageClassName="transition duration-200 group-hover:scale-105" /><Badge className="absolute right-2 top-2 max-w-[72px] truncate bg-card/95 px-1.5 py-0.5 text-[10px] text-foreground shadow-sm sm:max-w-none sm:px-2 sm:text-xs" variant={product.stock > 0 ? "secondary" : "destructive"}>{product.stock > 0 ? `${product.stock} tersedia` : "Habis"}</Badge></div><div className="p-3 sm:p-4"><p className="min-h-10 break-words text-[clamp(0.8rem,3.5vw,1rem)] font-bold leading-5 group-hover:text-primary sm:min-h-12">{product.name}</p><p className="mt-1 truncate text-[11px] font-semibold text-muted-foreground sm:text-xs">{getProductCategory(product)}</p><p className="mt-2 text-xs font-bold text-primary sm:text-sm">{formatRupiah(product.salePrice)}</p></div></button>) : <div className="col-span-full rounded-3xl border border-dashed p-12 text-center"><ShoppingBag className="mx-auto h-10 w-10 text-muted-foreground" /><p className="mt-4 font-semibold">Tidak ada produk yang sesuai</p><p className="mt-1 text-sm text-muted-foreground">Ubah kata kunci atau pilih kategori lain untuk melihat produk.</p></div>}</section>
    </section>
      <aside id="pos-cart" className="no-print h-fit scroll-mt-20 rounded-3xl border bg-card shadow-lg lg:sticky lg:top-5"><div className="flex items-center justify-between border-b p-5"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Pesanan aktif</p><h2 className="mt-1 font-display text-2xl font-bold">Keranjang</h2></div><Badge variant="secondary">{cart.reduce((sum, item) => sum + item.quantity, 0)} item</Badge></div><div className="max-h-[350px] divide-y overflow-y-auto">{cart.length ? cart.map(item => <div className="p-4" key={item.id}><div className="flex gap-3"><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{item.name}</p><p className="mt-1 text-xs text-muted-foreground">{formatRupiah(item.salePrice)} per unit</p></div><button onClick={() => setQuantity(item.id, 0)} className="rounded-lg p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label={`Hapus ${item.name}`}><Trash2 className="h-4 w-4" /></button></div><div className="mt-3 flex items-center justify-between"><div className="flex items-center gap-2 rounded-lg border p-1"><button onClick={() => setQuantity(item.id, item.quantity - 1)} className="grid h-6 w-6 place-items-center rounded hover:bg-muted"><CircleMinus className="h-4 w-4" /></button><span className="w-5 text-center text-sm font-bold">{item.quantity}</span><button onClick={() => setQuantity(item.id, item.quantity + 1)} className="grid h-6 w-6 place-items-center rounded hover:bg-muted"><CirclePlus className="h-4 w-4" /></button></div><p className="text-sm font-bold">{formatRupiah(Number(item.salePrice) * item.quantity)}</p></div></div>) : <div className="grid min-h-48 place-items-center p-6 text-center"><ShoppingBag className="h-9 w-9 text-muted-foreground" /><div><p className="mt-3 font-semibold">Keranjang masih kosong</p><p className="mt-1 text-sm text-muted-foreground">Scan atau pilih produk untuk memulai transaksi.</p></div></div>}</div><div className="border-t p-5"><div className="flex items-end justify-between"><span className="text-sm text-muted-foreground">Subtotal</span><strong className={`font-display text-2xl ${discountTotal ? "text-muted-foreground line-through" : "text-primary"}`}>{formatRupiah(total)}</strong></div>{discountTotal > 0 && <div className="mt-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800"><div className="flex justify-between font-bold"><span>Hemat promo</span><span>-{formatRupiah(discountTotal)}</span></div>{promotionQuote.data?.promotionSummary && <p className="mt-1 text-xs">{promotionQuote.data.promotionSummary}</p>}</div>}<div className="mt-3 flex items-end justify-between"><span className="text-sm font-bold text-foreground">Total pembayaran</span><strong className="font-display text-3xl text-primary">{formatRupiah(payableTotal)}</strong></div><div className="mt-5 grid grid-cols-2 gap-2"><button onClick={() => selectPayment("cash")} className={`rounded-xl border p-3 text-left transition ${paymentMethod === "cash" ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"}`}><Banknote className="h-5 w-5" /><p className="mt-2 text-sm font-bold">Tunai</p></button><button onClick={() => selectPayment("qris")} className={`rounded-xl border p-3 text-left transition ${paymentMethod === "qris" ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"}`}><QrCode className="h-5 w-5" /><p className="mt-2 text-sm font-bold">QRIS</p></button></div>{paymentMethod === "cash" ? <div className="mt-4"><label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Uang diterima</label><Input className="mt-2 text-lg font-bold" min="0" type="number" value={amountReceived} onChange={event => setAmountReceived(event.target.value)} placeholder="0" /><div className="mt-2 flex justify-between text-sm"><span className="text-muted-foreground">Kembalian</span><strong>{formatRupiah(change)}</strong></div></div> : <div className="mt-4"><div className="rounded-xl bg-secondary p-3 text-sm leading-5 text-secondary-foreground"><ImagePlus className="mr-2 inline h-4 w-4" /><strong>Foto bukti transfer wajib.</strong> Unggah bukti sebelum tombol lunasi dapat diproses.</div><PaymentProofUploader value={paymentProof} onChange={setPaymentProof} /></div>}<Button disabled={checkout.isPending || !cart.length || (paymentMethod === "qris" && !paymentProof)} onClick={completePayment} className="mt-5 w-full" size="lg">{checkout.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}{paymentMethod === "qris" && !paymentProof ? "Unggah bukti transfer" : "Lunasi transaksi"}</Button></div></aside></div>
    <nav aria-label="Navigasi kasir" className="cashier-mobile-nav no-print fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 border-t border-border bg-card/95 px-2 pt-2 shadow-[0_-8px_24px_rgba(23,56,50,.10)] backdrop-blur md:hidden"><button type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="flex flex-col items-center gap-1 rounded-xl py-1.5 text-[10px] font-bold text-primary"><House className="h-5 w-5" />Kasir</button><button type="button" onClick={() => setScannerOpen(true)} className="flex flex-col items-center gap-1 rounded-xl py-1.5 text-[10px] font-bold text-muted-foreground"><ScanLine className="h-5 w-5" />Scan</button><button type="button" onClick={() => document.getElementById("pos-cart")?.scrollIntoView({ behavior: "smooth", block: "start" })} className="relative flex flex-col items-center gap-1 rounded-xl py-1.5 text-[10px] font-bold text-muted-foreground"><ShoppingBag className="h-5 w-5" />Keranjang{cart.length > 0 && <span className="absolute left-1/2 top-0 ml-3 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[9px] text-primary-foreground">{cart.reduce((sum, item) => sum + item.quantity, 0)}</span>}</button></nav>
    {scannerOpen && <div className="no-print fixed inset-0 z-50 grid place-items-center bg-foreground/50 p-4"><div className="w-full max-w-md rounded-3xl bg-card p-5 shadow-2xl"><div className="mb-4 flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Pemindaian QR</p><h2 className="mt-1 font-display text-2xl font-bold">Arahkan kamera ke label</h2></div><button onClick={closeScanner} className="rounded-lg p-1 hover:bg-muted" aria-label="Tutup kamera"><X className="h-5 w-5" /></button></div><div id="jajananku-qr-reader" className="min-h-64 overflow-hidden rounded-2xl bg-muted" /><p className="mt-4 text-center text-sm text-muted-foreground">Izinkan akses kamera perangkat. Jika kamera tidak tersedia, tutup jendela ini lalu gunakan kode manual.</p></div></div>}
    <DevicePermissionsDialog open={permissionsOpen} onClose={() => setPermissionsOpen(false)} />
    {completedSale && receiptSettings.data && <ReceiptDocument receipt={{ ...completedSale, cashierName: user.name }} settings={receiptSettings.data} />}
    {completedSale && <div className="no-print fixed inset-0 z-50 grid place-items-center bg-foreground/35 p-4"><div className="w-full max-w-sm rounded-3xl bg-card p-7 text-center shadow-2xl"><div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary"><CheckCircle2 className="h-7 w-7" /></div><p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-primary">Transaksi lunas</p><h2 className="mt-1 font-display text-2xl font-bold">Pembayaran berhasil</h2><p className="mt-4 text-sm text-muted-foreground">Nota <strong className="text-foreground">{completedSale.receiptNo}</strong></p><p className="mt-1 text-2xl font-bold text-primary">{formatRupiah(completedSale.total)}</p>{completedSale.changeAmount > 0 && <p className="mt-2 text-sm text-muted-foreground">Kembalian {formatRupiah(completedSale.changeAmount)}</p>}<p className="mt-4 text-xs leading-5 text-muted-foreground">Pilih printer Bluetooth yang sudah tersambung pada dialog cetak perangkat.</p><Button className="mt-5 w-full" variant="outline" disabled={!receiptSettings.data} onClick={printReceipt}><ReceiptText className="mr-2 h-4 w-4" />{receiptSettings.data ? "Cetak struk" : "Menyiapkan struk…"}</Button><Button className="mt-2 w-full" onClick={() => setCompletedSale(null)}><ReceiptText className="mr-2 h-4 w-4" />Transaksi berikutnya</Button></div></div>}
  </main>;
}
