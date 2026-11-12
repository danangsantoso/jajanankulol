export function canCreateBranchForPackage(activeBranchCount: number, branchLimit: number) {
  return activeBranchCount < branchLimit;
}

export function packageBranchLimitMessage(branchLimit: number) {
  return `Paket usaha ini mendukung maksimal ${branchLimit} cabang aktif.`;
}
