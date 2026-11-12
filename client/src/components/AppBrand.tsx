import { cn } from "@/lib/utils";
import React from "react";

export const JAJANANKU_MAIN_LOGO_URL = "/manus-storage/jajananku-main-logo_dea6d69a.png";

export function JajanankuLogoMark({ className }: { className?: string }) {
  return <img data-brand-mark="jajananku" src={JAJANANKU_MAIN_LOGO_URL} alt="" aria-hidden="true" draggable="false" className={cn("h-full w-full object-cover", className)} />;
}

export function AppBrand({ compact = false }: { compact?: boolean }) {
  return <div className="flex items-center gap-3"><div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl shadow-sm"><JajanankuLogoMark /></div>{!compact && <div className="leading-none"><p className="font-display text-lg font-bold tracking-tight text-primary">Jajananku</p><p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">POS Jajanan</p></div>}</div>;
}
