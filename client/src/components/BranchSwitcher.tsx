import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Building2 } from "lucide-react";
import { toast } from "sonner";

export default function BranchSwitcher() {
  const workspace = trpc.workspace.current.useQuery();
  const utils = trpc.useUtils();
  const switchBranch = trpc.workspace.switchBranch.useMutation({
    onSuccess: async () => { await utils.workspace.current.invalidate(); await utils.products.invalidate(); await utils.analytics.invalidate(); toast.success("Cabang aktif diperbarui."); },
    onError: error => toast.error(error.message),
  });
  if (!workspace.data) return null;
  const { branches, branchId, branchName, tenantName } = workspace.data;
  return <div className="flex min-w-0 items-center gap-2 rounded-xl border border-primary/10 bg-white/60 px-2 py-1.5"><Building2 className="h-4 w-4 shrink-0 text-primary" /><div className="min-w-0"><p className="truncate text-[10px] font-bold uppercase tracking-wider text-primary/70">{tenantName}</p><Select value={String(branchId)} onValueChange={value => switchBranch.mutate({ branchId: Number(value) })} disabled={switchBranch.isPending || branches.length < 2}><SelectTrigger className="h-5 min-w-[128px] border-0 bg-transparent px-0 text-xs font-bold shadow-none focus:ring-0"><SelectValue>{branchName}</SelectValue></SelectTrigger><SelectContent>{branches.map(branch => <SelectItem key={branch.id} value={String(branch.id)}>{branch.name}</SelectItem>)}</SelectContent></Select></div></div>;
}
