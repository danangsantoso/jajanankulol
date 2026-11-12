import { describe, expect, it } from "vitest";
import { filterRecordsToScope, isRecordInScope } from "./tenantIsolation";

describe("isolasi data tenant dan cabang", () => {
  const activeScope = { tenantId: 1, branchId: 10 };
  const records = [
    { id: 1, tenantId: 1, branchId: 10, name: "Produk cabang aktif" },
    { id: 2, tenantId: 1, branchId: 20, name: "Produk cabang lain" },
    { id: 3, tenantId: 2, branchId: 10, name: "Produk tenant lain" },
    { id: 4, tenantId: null, branchId: null, name: "Data lama tidak tercakup" },
  ];

  it("hanya menerima data pada tenant dan cabang aktif yang sama", () => {
    expect(isRecordInScope(records[0], activeScope)).toBe(true);
    expect(isRecordInScope(records[1], activeScope)).toBe(false);
    expect(isRecordInScope(records[2], activeScope)).toBe(false);
  });

  it("menghapus produk, transaksi, atau laporan lintas tenant dan lintas cabang", () => {
    expect(filterRecordsToScope(records, activeScope)).toEqual([records[0]]);
  });
});
