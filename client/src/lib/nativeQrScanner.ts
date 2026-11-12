import type { ManagedQrScanner } from "./qrScannerLifecycle";

type BarcodeResult = { rawValue: string };
type BarcodeDetectorInstance = { detect: (source: ImageBitmapSource) => Promise<BarcodeResult[]> };
type BarcodeDetectorConstructor = new (options: { formats: string[] }) => BarcodeDetectorInstance;

function getBarcodeDetectorConstructor() {
  return (globalThis as typeof globalThis & { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector;
}

export function supportsNativeQrScanner() {
  return Boolean(getBarcodeDetectorConstructor() && navigator.mediaDevices?.getUserMedia);
}

export async function startNativeQrScanner(reader: HTMLElement, onDecoded: (value: string) => void): Promise<ManagedQrScanner | null> {
  const BarcodeDetector = getBarcodeDetectorConstructor();
  if (!BarcodeDetector || !navigator.mediaDevices?.getUserMedia) return null;

  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
    audio: false,
  });
  const video = document.createElement("video");
  video.autoplay = true;
  video.muted = true;
  video.playsInline = true;
  video.className = "h-full w-full object-cover";
  video.srcObject = stream;
  reader.replaceChildren(video);
  await video.play();

  const detector = new BarcodeDetector({ formats: ["qr_code"] });
  let frameId = 0;
  let stopped = false;
  let detected = false;
  const scanFrame = async () => {
    if (stopped || detected) return;
    try {
      const matches = await detector.detect(video);
      const value = matches[0]?.rawValue?.trim();
      if (value) {
        detected = true;
        onDecoded(value);
        return;
      }
    } catch {
      // Frame belum siap atau detektor gagal membaca satu frame; lanjutkan pemindaian.
    }
    if (!stopped) frameId = window.requestAnimationFrame(() => { void scanFrame(); });
  };
  frameId = window.requestAnimationFrame(() => { void scanFrame(); });

  const stop = async () => {
    if (stopped) return;
    stopped = true;
    window.cancelAnimationFrame(frameId);
    stream.getTracks().forEach(track => track.stop());
    video.pause();
    video.srcObject = null;
    reader.replaceChildren();
  };
  return { stop, clear: stop };
}
