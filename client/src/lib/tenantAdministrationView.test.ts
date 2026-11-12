import { describe, expect, it } from "vitest";
import { branchEmptyMessage, teamPanelState } from "./tenantAdministrationView";

describe("model tampilan administrasi tenant", () => {
  it("menampilkan state kosong cabang ketika tenant belum memiliki lokasi", () => {
    expect(branchEmptyMessage(0)).toBe("Belum ada cabang. Tambahkan cabang pertama untuk mulai beroperasi.");
    expect(branchEmptyMessage(1)).toBeNull();
  });

  it("menentukan state kosong pengguna dan undangan secara terpisah", () => {
    expect(teamPanelState(0, 0)).toMatchObject({ showMemberEmpty: true, showInvitationEmpty: true });
    expect(teamPanelState(2, 1)).toMatchObject({ showMemberEmpty: false, showInvitationEmpty: false });
  });
});
