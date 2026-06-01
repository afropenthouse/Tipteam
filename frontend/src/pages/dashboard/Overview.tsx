import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Star, MessageSquareWarning, Wallet, Store, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listBusinesses, listFeedback, useCurrentUser, walletBalance } from "@/lib/store";
import type { Business, Feedback } from "@/lib/api";

// Utility function to mask phone numbers
const maskPhoneNumber = (phone: string) => {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  let masked = '';
  if (cleaned.length <= 3) masked = cleaned;
  else if (cleaned.length <= 6) masked = cleaned.slice(0, 3) + '***' + cleaned.slice(3);
  else if (cleaned.length <= 8) masked = cleaned.slice(0, 4) + '****' + cleaned.slice(4);
  else masked = cleaned.slice(0, 2) + '******' + cleaned.slice(2);
  return masked;
};

type WalletData = {
  earned: number;
  available: number;
  withdrawn: number;
};

const fmtNGN = (n: number) => `₦${n.toLocaleString()}`;

export default function Overview() {
  const user = useCurrentUser();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [walletData, setWalletData] = useState<Record<string, WalletData>>({});
  const [loading, setLoading] = useState(true);
  const [selectedBusiness, setSelectedBusiness] = useState<string>("all");

  useEffect(() => {
    if (user) {
      listBusinesses().then(async (businesses) => {
        setBusinesses(businesses);

        // Fetch feedback for all businesses
        const allFeedback = await Promise.all(
          businesses.map(b => listFeedback(b.id))
        );
        setFeedback(allFeedback.flat().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));

        // Fetch wallet data for all businesses
        const walletPromises = businesses.map(async (b) => {
          try {
            const wallet = await walletBalance(b.id);
            return { businessId: b.id, wallet };
          } catch (error) {
            console.error(`Failed to fetch wallet for business ${b.id}:`, error);
            return { businessId: b.id, wallet: { earned: 0, available: 0, withdrawn: 0 } };
          }
        });

        const walletResults = await Promise.all(walletPromises);
        const walletMap = walletResults.reduce((acc, { businessId, wallet }) => {
          acc[businessId] = wallet;
          return acc;
        }, {} as Record<string, WalletData>);

        setWalletData(walletMap);
      }).catch(console.error).finally(() => setLoading(false));
    }
  }, [user]);

  // Filter businesses based on selection
  const filteredBusinesses = selectedBusiness === "all" 
    ? businesses 
    : businesses.filter(b => b.id === selectedBusiness);

  const totals = filteredBusinesses.reduce(
    (acc, b) => {
      const wallet = walletData[b.id] || { earned: 0, available: 0 };
      acc.earned += wallet.earned;
      acc.available += wallet.available;
      return acc;
    },
    { earned: 0, available: 0 },
  );
  // Filter feedback based on selected business
  const filteredFeedback = selectedBusiness === "all" 
    ? feedback 
    : feedback.filter(f => f.businessId === selectedBusiness);

  const avg =
    filteredFeedback.length > 0
      ? (filteredFeedback.reduce((s, f) => s + f.rating, 0) / filteredFeedback.length).toFixed(1)
      : "—";
  const feedbackCountByBusiness = filteredFeedback.reduce(
    (acc, item) => {
      acc[item.businessId] = (acc[item.businessId] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const stats = [
    { label: "Businesses", value: businesses.length, icon: Store },
    { label: "Avg rating", value: avg, icon: Star },
    { label: "Feedback", value: feedback.length, icon: MessageSquareWarning },
    { label: "Tip wallet", value: fmtNGN(totals.available), icon: Wallet },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 px-4 sm:px-0">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Overview</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Snapshot of your businesses, feedback and tips.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <Select value={selectedBusiness} onValueChange={setSelectedBusiness}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Select business" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Businesses</SelectItem>
              {businesses.map((business) => (
                <SelectItem key={business.id} value={business.id}>
                  {business.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button asChild className="w-full sm:w-auto bg-gradient-primary shadow-elegant">
            <Link to="/dashboard/businesses/new">Add business</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border bg-card p-4 sm:p-5 shadow-card">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs uppercase tracking-wider text-muted-foreground">{s.label}</span>
              <s.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
            </div>
            <div className="mt-2 sm:mt-3 text-lg sm:text-2xl font-bold truncate">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-4 sm:p-6 shadow-card overflow-hidden">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm sm:text-base">Your businesses</h2>
            <Link to="/dashboard/businesses" className="text-[10px] sm:text-xs text-primary hover:underline flex items-center">
              View all <ArrowRight className="ml-0.5 h-3 w-3" />
            </Link>
          </div>
          {filteredBusinesses.length === 0 ? (
            <div className="mt-6 rounded-lg border border-dashed p-6 sm:p-8 text-center">
              <p className="text-sm text-muted-foreground">
                {selectedBusiness === "all" ? "No businesses yet." : "No businesses found."}
              </p>
              <Button asChild size="sm" className="mt-3 bg-gradient-primary">
                <Link to="/dashboard/businesses/new">Create one</Link>
              </Button>
            </div>
          ) : (
            <ul className="mt-4 divide-y">
              {filteredBusinesses.slice(0, 5).map((b) => (
                <li key={b.id} className="flex items-center justify-between py-3 gap-2">
                  <div className="min-w-0 flex-1">
                    <Link to={`/dashboard/businesses/${b.id}`} className="font-medium text-sm sm:text-base hover:text-primary truncate block">
                      {b.name}
                    </Link>
                    <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{b.address}</p>
                  </div>
                  <span className="text-[10px] sm:text-xs text-muted-foreground shrink-0">{feedbackCountByBusiness[b.id] || 0} reviews</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border bg-card p-4 sm:p-6 shadow-card overflow-hidden">
          <h2 className="font-semibold text-sm sm:text-base">Recent feedback</h2>
          {filteredFeedback.length === 0 ? (
            <p className="mt-6 text-sm text-muted-foreground text-center">
              {selectedBusiness === "all" 
                ? "No reviews yet. Share your QR code."
                : "No reviews for this business yet."
              }
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {filteredFeedback.slice(0, 5).map((f) => (
                <li key={f.id} className="rounded-lg bg-muted/50 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-0.5 sm:gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-3 w-3 sm:h-3.5 sm:w-3.5 ${i < f.rating ? "fill-warning text-warning" : "text-muted-foreground/30"}`}
                        />
                      ))}
                    </div>
                    <span className="text-[10px] sm:text-xs text-muted-foreground shrink-0">
                      {new Date(f.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {f.experience && <p className="mt-1.5 text-xs sm:text-sm line-clamp-2">{f.experience}</p>}
                  {f.phone && (
                    <p className="mt-1 text-[10px] sm:text-xs text-muted-foreground">
                      Phone: {f.phone}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
