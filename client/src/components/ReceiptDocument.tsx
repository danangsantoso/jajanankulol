import { createPortal } from "react-dom";
import React from "react";
import { formatRupiah } from "@/lib/format";

export type ReceiptSettings = {
  template: "simple" | "standard" | "complete";
  paperWidth: "58" | "70";
  autoPrint: "yes" | "no";
  receiptFooter: string;
  businessName: string;
  businessAddress: string | null;
  businessLogoUrl?: string | null;
  branchName: string;
};

export type ReceiptData = {
  receiptNo: string;
  subtotal: number;
  discountTotal?: number;
  promotionSummary?: string | null;
  total: number;
  paymentMethod: "cash" | "qris";
  amountReceived: number | null;
  changeAmount: number;
  paidAt: Date | string;
  cashierName?: string | null;
  branchName?: string | null;
  items: Array<{ productName: string; quantity: number; unitPrice: number; lineTotal: number }>;
};

export function printReceipt() {
  document.body.classList.add("printing-receipt");
  const clear = () => document.body.classList.remove("printing-receipt");
  window.addEventListener("afterprint", clear, { once: true });
  window.setTimeout(() => window.print(), 40);
  window.setTimeout(clear, 1500);
}

const formatReceiptTime = (value: Date | string) => new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

export function ReceiptDocument({ receipt, settings }: { receipt: ReceiptData; settings: ReceiptSettings }) {
  if (typeof document === "undefined") return null;
  const withBrand = settings.template !== "simple";
  const complete = settings.template === "complete";
  const branchName = receipt.branchName || settings.branchName;
  return createPortal(
    <section className="receipt-print-root" aria-hidden="true">
      <article className="receipt-print-document" data-paper-width={settings.paperWidth}>
        {withBrand && <header className="receipt-brand"><img className="receipt-logo" src={settings.businessLogoUrl || "/manus-storage/jajananku-logo_5fd59c99.png"} alt="" onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = "/manus-storage/jajananku-logo_5fd59c99.png"; }} /><div><h1>{settings.businessName}</h1><p>{branchName}</p></div></header>}
        {complete && settings.businessAddress && <p className="receipt-address">{settings.businessAddress}</p>}
        <div className="receipt-meta"><span>{receipt.receiptNo}</span><span>{formatReceiptTime(receipt.paidAt)}</span></div>
        {receipt.cashierName && <p className="receipt-cashier">Kasir: {receipt.cashierName}</p>}
        <div className="receipt-divider" />
        <div className="receipt-items">{receipt.items.map((item, index) => <div className="receipt-item" key={`${item.productName}-${index}`}><div><strong>{item.productName}</strong><span>{item.quantity} × {formatRupiah(item.unitPrice)}</span></div><b>{formatRupiah(item.lineTotal)}</b></div>)}</div>
        {settings.template !== "simple" && <><div className="receipt-divider" /><dl className="receipt-totals">{(receipt.discountTotal || 0) > 0 && <><div><dt>Subtotal</dt><dd>{formatRupiah(receipt.subtotal)}</dd></div><div><dt>Promo</dt><dd>-{formatRupiah(receipt.discountTotal || 0)}</dd></div>{receipt.promotionSummary && <p className="receipt-promotion-summary">{receipt.promotionSummary}</p>}</>}<div><dt>Total</dt><dd>{formatRupiah(receipt.total)}</dd></div><div><dt>Pembayaran</dt><dd>{receipt.paymentMethod === "cash" ? "Tunai" : "QRIS"}</dd></div>{receipt.paymentMethod === "cash" && <><div><dt>Diterima</dt><dd>{formatRupiah(receipt.amountReceived ?? 0)}</dd></div><div><dt>Kembalian</dt><dd>{formatRupiah(receipt.changeAmount)}</dd></div></>}</dl></>}
        {complete && <><div className="receipt-divider" /><p className="receipt-footer">{settings.receiptFooter}</p></>}
      </article>
    </section>, document.body,
  );
}
