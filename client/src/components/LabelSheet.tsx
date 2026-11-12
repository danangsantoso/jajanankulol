import { formatRupiah } from "@/lib/format";
import type { LabelCopy } from "@/lib/labelExport";
import type { LabelSize } from "@/lib/labelSizing";
import React from "react";

type LabelSheetProps = { labels: LabelCopy<{ id: number; name: string; qrCode: string; salePrice: string }>[]; images: Record<number, string>; size?: LabelSize };

export default function LabelSheet({ labels, images, size = "standard" }: LabelSheetProps) {
  return <div className="label-sheet-grid" data-label-size={size}>{labels.map(label => <article className="label-card" key={`${label.id}-${label.copyIndex}`}><div className="label-qr-wrap">{images[label.id] ? <img src={images[label.id]} alt={`QR ${label.name}`} /> : <div className="label-qr-skeleton" />}</div><div className="label-copy"><p className="label-brand">JAJANANKU</p><h2>{label.name}</h2><p className="label-price">{formatRupiah(label.salePrice)}</p><p className="label-code">{label.qrCode}</p></div></article>)}</div>;
}
