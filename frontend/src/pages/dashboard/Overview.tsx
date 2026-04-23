import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Star, MessageSquareWarning, Wallet, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { listBusinesses, listFeedback, useCurrentUser, walletBalance } from "@/lib/store";
import type { Business, Feedback } from "@/lib/api";

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

  const totals = businesses.reduce(
    (acc, b) => {
      const wallet = walletData[b.id] || { earned: 0, available: 0 };
      acc.earned += wallet.earned;
      acc.available += wallet.available;
      return acc;
    },
    { earned: 0, available: 0 },
  );
  const avg =
    feedback.length > 0
      ? (feedback.reduce((s, f) => s + f.rating, 0) / feedback.length).toFixed(1)
      : "—";
  const feedbackCountByBusiness = feedback.reduce(
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
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
          <p className="text-sm text-muted-foreground">
            Snapshot of your businesses, feedback and tips.
          </p>
        </div>
        <Button asChild className="bg-gradient-primary shadow-elegant">
          <Link to="/dashboard/businesses/new">Add business</Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border bg-card p-5 shadow-card">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">{s.label}</span>
              <s.icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="mt-3 text-2xl font-bold">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-6 shadow-card">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Your businesses</h2>
            <Link to="/dashboard/businesses" className="text-xs text-primary hover:underline">
              View all <ArrowRight className="ml-0.5 inline h-3 w-3" />
            </Link>
          </div>
          {businesses.length === 0 ? (
            <div className="mt-6 rounded-lg border border-dashed p-8 text-center">
              <p className="text-sm text-muted-foreground">No businesses yet.</p>
              <Button asChild size="sm" className="mt-3 bg-gradient-primary">
                <Link to="/dashboard/businesses/new">Create one</Link>
              </Button>
            </div>
          ) : (
            <ul className="mt-4 divide-y">
              {businesses.slice(0, 5).map((b) => (
                <li key={b.id} className="flex items-center justify-between py-3">
                  <div>
                    <Link to={`/dashboard/businesses/${b.id}`} className="font-medium hover:text-primary">
                      {b.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">{b.address}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{feedbackCountByBusiness[b.id] || 0} reviews</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-card">
          <h2 className="font-semibold">Recent feedback</h2>
          {feedback.length === 0 ? (
            <p className="mt-6 text-sm text-muted-foreground">No reviews yet. Share your QR code.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {feedback.slice(0, 5).map((f) => (
                <li key={f.id} className="rounded-lg bg-muted/50 p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-3.5 w-3.5 ${i < f.rating ? "fill-warning text-warning" : "text-muted-foreground/30"}`}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(f.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {f.experience && <p className="mt-1 text-sm">{f.experience}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
