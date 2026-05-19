// Page removed as requested.
import { Search, DollarSign, CheckCircle, XCircle, AlertCircle, TrendingDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { adminApi } from "@/lib/admin";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: "bg-green-100 text-green-800",
  PENDING: "bg-yellow-100 text-yellow-800",
  APPROVED: "bg-blue-100 text-blue-800",
  REJECTED: "bg-red-100 text-red-800",
};

const STATUS_OPTIONS = ["PENDING", "APPROVED", "REJECTED", "COMPLETED"];

export default function AdminWithdrawals() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [businessFilter, setBusinessFilter] = useState("");
  const [businessWallet, setBusinessWallet] = useState<any>(null);
  const [selectedBusiness, setSelectedBusiness] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-withdrawals", search, statusFilter],
    queryFn: () => adminApi.getWithdrawals(),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updateWithdrawalStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-withdrawals"] });
      toast({ title: "Withdrawal updated", description: "Withdrawal status updated successfully." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const withdrawals = data?.withdrawals ?? [];

  const filteredWithdrawals = withdrawals.filter((w: any) => {
    let match = true;
    if (search && !w.business?.name.toLowerCase().includes(search.toLowerCase())) match = false;
    if (statusFilter && w.status !== statusFilter) match = false;
    if (businessFilter && w.businessId !== businessFilter) match = false;
    return match;
  });

  const fetchBusinessWallet = async (businessId: string) => {
    try {
      const data = await getBusinessWithdrawals(businessId);
      setBusinessWallet(data.wallet);
      setSelectedBusiness(businessId);
    } catch (err) {
      toast({ title: "Error", description: "Failed to fetch wallet data.", variant: "destructive" });
    }
  };

  const fmtNGN = (n: number) => `₦${n.toLocaleString()}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Withdrawals</h1>
          <p className="text-sm text-muted-foreground">Monitor and manage withdrawal requests</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 max-w-sm">
          <Search className="relative left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by business name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Wallet summary for selected business */}
      {businessWallet && selectedBusiness && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Total Earned</p>
              <p className="text-xl font-bold text-emerald-600">{fmtNGN(businessWallet.totalEarned ?? 0)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Total Withdrawn</p>
              <p className="text-xl font-bold text-orange-600">{fmtNGN(businessWallet.totalWithdrawn ?? 0)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Available Balance</p>
              <p className="text-xl font-bold">{fmtNGN(businessWallet.availableBalance ?? 0)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-14 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Business</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Bank</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredWithdrawals.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No withdrawals found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredWithdrawals.map((w: any) => (
                      <TableRow key={w.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-1">
                            <TrendingDown className="h-3 w-3 text-muted-foreground" />
                            {w.business?.name || w.businessId}
                          </div>
                        </TableCell>
                        <TableCell>{w.accountName || "—"}<br /><span className="text-xs text-muted-foreground">{w.accountNumber}</span></TableCell>
                        <TableCell>{w.bankName}</TableCell>
                        <TableCell className="font-medium">₦{w.amount?.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge className={STATUS_COLORS[w.status] || "bg-gray-100"}>
                            {w.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{new Date(w.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => fetchBusinessWallet(w.businessId)}
                            >
                              <DollarSign className="h-3 w-3" />
                            </Button>
                            <select
                              value={w.status}
                              onChange={(e) => updateMutation.mutate({ id: w.id, status: e.target.value })}
                              className="flex h-8 rounded-md border border-input bg-transparent px-2 text-sm"
                              disabled={updateMutation.isPending}
                            >
                              {STATUS_OPTIONS.map((s) => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </select>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}