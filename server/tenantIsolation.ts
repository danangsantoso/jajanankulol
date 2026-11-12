export type TenantBranchScope = { tenantId: number; branchId: number };
export type ScopedRecord = { tenantId: number | null; branchId: number | null };

export function isRecordInScope(record: ScopedRecord, scope: TenantBranchScope) {
  return record.tenantId === scope.tenantId && record.branchId === scope.branchId;
}

export function filterRecordsToScope<T extends ScopedRecord>(records: T[], scope: TenantBranchScope) {
  return records.filter(record => isRecordInScope(record, scope));
}
