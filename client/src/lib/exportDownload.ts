export type ExportSaveResult = "downloaded" | "shared" | "cancelled";

const isShareCancellation = (error: unknown) => error instanceof DOMException && error.name === "AbortError";

export async function saveExportBlob(blob: Blob, filename: string, title: string): Promise<ExportSaveResult> {
  const file = new File([blob], filename, { type: blob.type || "application/octet-stream" });
  const sharePayload = { files: [file], title };
  const canShareFiles = typeof navigator.share === "function" && (typeof navigator.canShare !== "function" || navigator.canShare(sharePayload));

  if (canShareFiles) {
    try {
      await navigator.share(sharePayload);
      return "shared";
    } catch (error) {
      if (isShareCancellation(error)) return "cancelled";
    }
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
  return "downloaded";
}
