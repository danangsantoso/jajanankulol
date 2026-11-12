import { Download, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "./ui/button";

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function InstallPrompt() {
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    const capturePrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as InstallEvent);
    };
    window.addEventListener("beforeinstallprompt", capturePrompt);
    return () => window.removeEventListener("beforeinstallprompt", capturePrompt);
  }, []);

  if (!installEvent || dismissed) return null;
  return (
    <aside className="no-print fixed bottom-4 left-4 right-4 z-50 mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-2xl md:left-auto">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground"><Download className="h-5 w-5" /></div>
      <p className="min-w-0 flex-1 text-sm leading-snug">Pasang <strong>Jajananku</strong> agar kasir lebih cepat diakses dari perangkat ini.</p>
      <Button size="sm" onClick={async () => { await installEvent.prompt(); setInstallEvent(null); }}>Pasang</Button>
      <button aria-label="Tutup" onClick={() => setDismissed(true)} className="rounded-md p-1 text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
    </aside>
  );
}
