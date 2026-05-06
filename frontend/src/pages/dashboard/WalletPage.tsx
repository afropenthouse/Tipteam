import { Wallet as WalletIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";

const fmtNGN = (n: number) => `₦${n.toLocaleString()}`;

interface Business {
  id: string;
  name: string;
  email: string;
}

interface WalletBalance {
  totalEarned: number;
  totalWithdrawn: number;
  availableBalance: number;
}

interface Withdrawal {
  id: string;
  amount: number;
  accountNumber: string;
  bankName: string;
  status: string;
  createdAt: string;
}

interface Bank {
  name: string;
  code: string;
}

export default function WalletPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>("");
  const [wallet, setWallet] = useState<WalletBalance>({
    totalEarned: 0,
    totalWithdrawn: 0,
    availableBalance: 0,
  });
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [accountName, setAccountName] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [bankCode, setBankCode] = useState<string>("");
  const [accountNumber, setAccountNumber] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const { toast } = useToast();

  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
  const token = localStorage.getItem("ttt:token");

  useEffect(() => {
    fetchBusinesses();
    fetchBanks();
    fetchAllWalletData();
    
    // Listen for store updates (e.g., after a tip is made)
    const handleStoreUpdate = () => {
      fetchAllWalletData();
    };
    window.addEventListener("ttt:store", handleStoreUpdate);
    return () => window.removeEventListener("ttt:store", handleStoreUpdate);
  }, []);

  useEffect(() => {
    if (selectedBusinessId) {
      fetchWalletData();
      fetchWithdrawals();
    }
  }, [selectedBusinessId]);

  const fetchBusinesses = async () => {
    try {
      const res = await fetch(`${apiUrl}/withdrawals/my-businesses`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setBusinesses(data.businesses);
      }
    } catch (error) {
      console.error("Failed to fetch businesses:", error);
    }
  };

  const fetchBanks = async () => {
    try {
      const res = await fetch(`${apiUrl}/paystack/banks`);
      if (res.ok) {
        const data = await res.json();
        setBanks(data.banks || []);
      }
    } catch (error) {
      console.error("Failed to fetch banks:", error);
    }
  };

  // Fetch combined wallet data for all businesses
  const fetchAllWalletData = async () => {
    try {
      const res = await fetch(`${apiUrl}/withdrawals/summary`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setWallet(data.wallet || { totalEarned: 0, totalWithdrawn: 0, availableBalance: 0 });
      }
    } catch (error) {
      console.error("Failed to fetch all wallet data:", error);
    }
  };

  const fetchWalletData = async () => {
    if (!selectedBusinessId) return;
    try {
      const res = await fetch(`${apiUrl}/withdrawals/balance/${selectedBusinessId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setWallet(data);
      }
    } catch (error) {
      console.error("Failed to fetch wallet data:", error);
    }
  };

  const fetchWithdrawals = async () => {
    if (selectedBusinessId) {
      try {
        const res = await fetch(`${apiUrl}/withdrawals/history/${selectedBusinessId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setWithdrawals(data.withdrawals || []);
        }
      } catch (error) {
        console.error("Failed to fetch withdrawals:", error);
      }
    } else {
      // Fetch all withdrawals across all businesses
      try {
        const res = await fetch(`${apiUrl}/withdrawals/history/all`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setWithdrawals(data.withdrawals || []);
        }
      } catch (error) {
        console.error("Failed to fetch all withdrawals:", error);
      }
    }
  };

  const resolveAccount = async () => {
    if (!bankCode || !accountNumber || accountNumber.length !== 10) return;
    
    setResolving(true);
    setAccountName("");
    
    try {
      const res = await fetch(
        `${apiUrl}/paystack/resolve-account?bankCode=${bankCode}&accountNumber=${accountNumber}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (res.ok) {
        const data = await res.json();
        setAccountName(data.accountName);
      } else {
        const error = await res.json();
        toast({ title: "Error", description: error.error || "Failed to resolve account", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to resolve account", variant: "destructive" });
    } finally {
      setResolving(false);
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedBusinessId || !accountName || !amount) {
      toast({ title: "Error", description: "All fields are required", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${apiUrl}/withdrawals/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          businessId: selectedBusinessId,
          accountNumber,
          bankCode,
          bankName: banks.find(b => b.code === bankCode)?.name || "",
          accountName,
          amount: parseInt(amount),
        }),
      });

      const data = await res.json();
      
      if (res.ok) {
        toast({ title: "Success", description: "Withdrawal request submitted successfully" });
        setAccountNumber("");
        setBankCode("");
        setAccountName("");
        setAmount("");
        fetchAllWalletData();
        fetchWithdrawals();
      } else {
        throw new Error(data.error || "Failed to create withdrawal");
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to create withdrawal", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const fee = Math.ceil(parseInt(amount) * 0.03) || 0;
  const totalDeduction = (parseInt(amount) || 0) + fee;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Wallet</h1>
        <p className="text-sm text-muted-foreground">Tips your team has earned.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl bg-gradient-hero p-6 text-primary-foreground shadow-elegant md:col-span-2">
          <span className="text-xs uppercase tracking-wider text-primary-foreground/60">
            Total Available
          </span>
          <div className="mt-2 text-4xl font-bold">{fmtNGN(wallet.availableBalance)}</div>
          <div className="mt-4 flex gap-6 text-xs text-primary-foreground/70">
            <span>Total Earned: {fmtNGN(wallet.totalEarned)}</span>
            <span>Total Withdrawn: {fmtNGN(wallet.totalWithdrawn)}</span>
          </div>
        </div>
        
        {businesses.length > 0 && (
          <Dialog>
            <DialogTrigger asChild>
              <Button className="w-full bg-gradient-primary shadow-elegant">
                Withdraw
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Withdraw funds</DialogTitle>
                <DialogDescription>Fill in your bank details to withdraw.</DialogDescription>
              </DialogHeader>
              <form className="space-y-4" onSubmit={handleWithdraw}>
                <div>
                  <Label htmlFor="business">Select Business</Label>
                  <Select value={selectedBusinessId} onValueChange={setSelectedBusinessId}>
                    <SelectTrigger id="business">
                      <SelectValue placeholder="Select business to withdraw from" />
                    </SelectTrigger>
                    <SelectContent>
                      {businesses.map((biz) => (
                        <SelectItem key={biz.id} value={biz.id}>
                          {biz.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="bank">Bank Name</Label>
                  <Select value={bankCode} onValueChange={(v) => { setBankCode(v); setAccountName(""); }}>
                    <SelectTrigger id="bank">
                      <SelectValue placeholder="Select bank" />
                    </SelectTrigger>
                    <SelectContent>
                      {banks.map((bank) => (
                        <SelectItem key={bank.code} value={bank.code}>
                          {bank.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="accountNumber">Account Number</Label>
                  <div className="flex gap-2">
                    <Input
                      id="accountNumber"
                      type="text"
                      maxLength={10}
                      placeholder="Enter 10-digit account number"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))}
                      onBlur={resolveAccount}
                    />
                    {resolving && <Loader2 className="h-4 w-4 animate-spin self-center" />}
                  </div>
                  {accountName && (
                    <p className="mt-1 text-xs text-green-600">Account Name: {accountName}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="amount">Amount (NGN)</Label>
                  <Input 
                    id="amount" 
                    type="number" 
                    min={1} 
                    placeholder="0" 
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                  {amount && (
                    <div className="mt-1 text-xs text-muted-foreground">
                      <p>Processing fee (3%): {fmtNGN(fee)}</p>
                      <p>Total deduction: {fmtNGN(totalDeduction)}</p>
                    </div>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  Note: A 3% processing fee will be deducted from your withdrawal amount.
                </div>
                <DialogFooter>
                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-primary shadow-elegant"
                    disabled={submitting || !selectedBusinessId || !accountName || !amount}
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Withdraw
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-card">
        <h2 className="font-semibold">Withdrawal history</h2>
        {withdrawals.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No withdrawals yet.</p>
        ) : (
          <div className="mt-4 space-y-2">
            {withdrawals.map((w) => (
              <div key={w.id} className="flex justify-between items-center py-2 border-b">
                <div>
                  <p className="font-medium">{fmtNGN(w.amount)}</p>
                  <p className="text-xs text-muted-foreground">{w.bankName} - {w.accountNumber}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded ${
                  w.status === "COMPLETED" ? "bg-green-100 text-green-800" :
                  w.status === "PENDING" ? "bg-yellow-100 text-yellow-800" :
                  "bg-red-100 text-red-800"
                }`}>
                  {w.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}