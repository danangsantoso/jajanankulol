export function branchEmptyMessage(branchCount: number) {
  return branchCount === 0 ? "Belum ada cabang. Tambahkan cabang pertama untuk mulai beroperasi." : null;
}

export function teamPanelState(memberCount: number, invitationCount: number) {
  return {
    showMemberEmpty: memberCount === 0,
    showInvitationEmpty: invitationCount === 0,
    memberMessage: "Belum ada pengguna aktif.",
    invitationMessage: "Belum ada undangan yang menunggu.",
  };
}
