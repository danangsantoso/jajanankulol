export type ManagedQrScanner = { stop: () => Promise<unknown>; clear?: () => unknown };

export async function safelyStopQrScanner(scanner: ManagedQrScanner | null) {
  if (!scanner) return;
  try { await scanner.stop(); } catch { /* A scanner that failed to start may not be stoppable. */ }
  try { await scanner.clear?.(); } catch { /* Clear is best effort and must not break the POS. */ }
}
