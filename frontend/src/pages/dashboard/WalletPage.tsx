import { useState, useEffect } from "react";
import { Wallet as WalletIcon } from "lucide-react";
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
} from "@/components/ui/dialog";
import {
  listBusinesses,
  listWithdrawals,
  requestWithdrawal,
  walletBalance,
  totalWalletBalance,
  useCurrentUser,
} from "@/lib/store";
import { toast } from "@/hooks/use-toast";
import type { Business, Withdrawal } from "@/lib/api";

const fmtNGN = (n: number) => `₦${n.toLocaleString()}`;

export default function WalletPage() {
  const user = useCurrentUser();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [accountNumber, setAccountNumber] = useState<string>("");
  const [bank, setBank] = useState<string>("");
  const [withdrawalId, setWithdrawalId] = useState<string>("");
  const [code, setCode] = useState<string>("");
  const [step, setStep] = useState<"form" | "verify">("form");
  const [open, setOpen] = useState(false);
   const [wallet, setWallet] = useState({ earned: 0, available: 0, withdrawn: 0 });
   const [totalWallet, setTotalWallet] = useState({ earned: 0, available: 0, withdrawn: 0 });
   const [history, setHistory] = useState<Withdrawal[]>([]);
   const [loading, setLoading] = useState(true);

   useEffect(() => {
     if (!user) return;

     listBusinesses()
       .then((bizList) => {
         setBusinesses(bizList);
         if (bizList.length > 0 && !selected) {
           setSelected(bizList[0].id);
         }
       })
       .catch(console.error)
       .finally(() => setLoading(false));
   }, [user]);

    useEffect(() => {
      if (!user) return;
      totalWalletBalance()
        .then((wallet) => {
          console.log("[WalletPage] Initial totalWallet:", wallet);
          setTotalWallet(wallet);
        })
        .catch((err) => console.error("Failed to fetch total wallet:", err));
    }, [user]);

    // Refresh wallet and history when storage event fires (e.g., after a tip is created)
    useEffect(() => {
      const handler = () => {
        console.log("[WalletPage] refresh event received (ttt:store/storage/focus), refreshing...");
        totalWalletBalance()
          .then((wallet) => {
            console.log("[WalletPage] totalWallet:", wallet);
            setTotalWallet(wallet);
          })
          .catch((err) => console.error("Failed to fetch total wallet:", err));
        if (selected) {
          Promise.all([
            walletBalance(selected).then(setWallet).catch(console.error),
            listWithdrawals().then(setHistory).catch(console.error),
          ]);
        }
      };
      window.addEventListener("ttt:store", handler);
      window.addEventListener("storage", handler);
      window.addEventListener("focus", handler);
      return () => {
        window.removeEventListener("ttt:store", handler);
        window.removeEventListener("storage", handler);
        window.removeEventListener("focus", handler);
      };
    }, [selected]);

   useEffect(() => {
     if (!selected) return;

     Promise.all([walletBalance(selected), listWithdrawals()])
       .then(([w, h]) => {
         setWallet(w);
         setHistory(h);
       })
       .catch(console.error);
   }, [selected]);

   const active = businesses.find((b) => b.id === selected);

   const displayName = user?.fullName || "";
   const showVerification = bank && accountNumber.length === 10;

   const onWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(amount);
    if (!selected || !amt || amt <= 0) {
      toast({ title: "Enter a valid amount", variant: "destructive" });
      return;
    }
    if (!bank) {
      toast({ title: "Select a bank", variant: "destructive" });
      return;
    }
    if (!/^\d{10}$/.test(accountNumber)) {
      toast({ title: "Enter a valid 10-digit account number", variant: "destructive" });
      return;
    }
    if (amt > wallet.available) {
      toast({ title: "Amount exceeds available balance", variant: "destructive" });
      return;
    }
    try {
      const res = await requestWithdrawal(selected, amt, accountNumber, bank);
      setWithdrawalId(res.withdrawalId);
      setStep("verify");
      toast({ title: "Check your email", description: "A verification code has been sent to your email." });
    } catch (err) {
      toast({ title: "Failed", description: (err as Error).message, variant: "destructive" });
    }
  };

  const onConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!withdrawalId || !code) {
      toast({ title: "Enter the verification code", variant: "destructive" });
      return;
    }
    try {
      await confirmWithdrawal(withdrawalId, code);
      toast({ title: "Withdrawal submitted", description: "Your withdrawal is being processed." });
      setAmount("");
      setAccountNumber("");
      setCode("");
      setWithdrawalId("");
      setStep("form");
       setOpen(false);
       const [w, h] = await Promise.all([walletBalance(selected), listWithdrawals()]);
       setWallet(w);
       setHistory(h);
       totalWalletBalance().then(setTotalWallet).catch(console.error);
    } catch (err) {
      toast({ title: "Failed", description: (err as Error).message, variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (businesses.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed p-12 text-center">
        <WalletIcon className="mx-auto h-10 w-10 text-muted-foreground" />
        <p className="mt-3 text-sm text-muted-foreground">Add a business first to start earning tips.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Wallet</h1>
          <p className="text-sm text-muted-foreground">Tips your team has earned.</p>
        </div>
        <div className="w-56">
          <Select value={selected} onValueChange={setSelected}>
            <SelectTrigger>
              <SelectValue placeholder="Select business" />
            </SelectTrigger>
            <SelectContent>
              {businesses.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

       <div className="grid gap-4 md:grid-cols-3">
         <div className="rounded-xl bg-gradient-hero p-6 text-primary-foreground shadow-elegant md:col-span-2">
           <span className="text-xs uppercase tracking-wider text-primary-foreground/60">
             Total Available
           </span>
           <div className="mt-2 text-4xl font-bold">{fmtNGN(totalWallet.available)}</div>
           <div className="mt-4 flex gap-6 text-xs text-primary-foreground/70">
             <span>Total Earned: {fmtNGN(totalWallet.earned)}</span>
             <span>Total Withdrawn: {fmtNGN(totalWallet.withdrawn)}</span>
           </div>
         </div>
        <Dialog open={open} onOpenChange={(v) => {
          setOpen(v);
          if (!v) {
            setStep("form");
            setAmount("");
            setAccountNumber("");
            setBank("");
            setCode("");
            setWithdrawalId("");
          }
        }}>
          <DialogTrigger asChild>
            <Button className="w-full bg-gradient-primary shadow-elegant">Withdraw</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{step === "form" ? "Withdraw funds" : "Verify withdrawal"}</DialogTitle>
              <DialogDescription>
                {step === "form"
                  ? "Fill in your bank details to withdraw."
                  : "Enter the verification code sent to your email."}
              </DialogDescription>
            </DialogHeader>
            {step === "form" ? (
              <form onSubmit={onWithdraw} className="space-y-4">
                <div>
                  <Label htmlFor="bank">Bank Name</Label>
                  <Select value={bank} onValueChange={setBank}>
                    <SelectTrigger id="bank">
                      <SelectValue placeholder="Select bank" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GTBank">GTBank</SelectItem>
                      <SelectItem value="Access Bank">Access Bank</SelectItem>
                      <SelectItem value="Zenith Bank">Zenith Bank</SelectItem>
                      <SelectItem value="UBA">UBA</SelectItem>
                      <SelectItem value="First Bank">First Bank</SelectItem>
                      <SelectItem value="Fidelity Bank">Fidelity Bank</SelectItem>
                      <SelectItem value="Sterling Bank">Sterling Bank</SelectItem>
                      <SelectItem value="Union Bank">Union Bank</SelectItem>
                      <SelectItem value="Wema Bank">Wema Bank</SelectItem>
                      <SelectItem value="Polaris Bank">Polaris Bank</SelectItem>
                      <SelectItem value="Ecobank">Ecobank</SelectItem>
                      <SelectItem value="Stanbic IBTC">Stanbic IBTC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="accountNumber">Account Number</Label>
                  <Input
                    id="accountNumber"
                    type="text"
                    maxLength={10}
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))}
                    placeholder="Enter 10-digit account number"
                   />
                 </div>
                 {showVerification && (
                   <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
                     <p className="font-medium text-primary">Verification</p>
                     <p className="mt-1 text-muted-foreground">
                       Account Name: <span className="font-semibold text-foreground">{displayName}</span>
                     </p>
                     <p className="text-xs text-muted-foreground/70 mt-1">
                       Bank: {bank} | Account: {accountNumber}
                     </p>
                   </div>
                 )}
                 <div>
                   <Label htmlFor="amount">Amount (NGN)</Label>
                  <Input
                    id="amount"
                    type="number"
                    min={1}
                    max={wallet.available}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="text-xs text-muted-foreground">
                  Note: A 3% processing fee will be collected from your withdrawal amount.
                </div>
                <Button type="submit" className="w-full bg-gradient-primary shadow-elegant">
                  Withdraw
                </Button>
              </form>
            ) : (
              <form onSubmit={onConfirm} className="space-y-4">
                <div>
                  <Label htmlFor="code">Verification Code</Label>
                  <Input
                    id="code"
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Enter code from email"
                  />
                </div>
                <Button type="submit" className="w-full bg-gradient-primary shadow-elegant">
                  Confirm
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    setStep("form");
                    setCode("");
                    setWithdrawalId("");
                  }}
                >
                  Cancel
                </Button>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-card">
        <h2 className="font-semibold">Withdrawal history</h2>
        {history.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No withdrawals yet.</p>
        ) : (
          <ul className="mt-4 divide-y">
                {history
                  .slice()
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map((w) => (
                    <li key={w.id} className="flex items-center justify-between py-3">
                      <div>
                        <p className="font-medium">{fmtNGN(w.amount)}</p>
                        {w.business?.name && (
                          <p className="text-xs text-muted-foreground">{w.business.name}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {new Date(w.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                          w.status === "APPROVED"
                            ? "bg-accent text-accent-foreground"
                            : w.status === "REJECTED"
                              ? "bg-destructive/10 text-destructive"
                              : "bg-warning/10 text-warning"
                        }`}
                      >
                        {w.status.toLowerCase()}
                      </span>
                    </li>
                  ))}
          </ul>
        )}
      </div>
    </div>
  );
}