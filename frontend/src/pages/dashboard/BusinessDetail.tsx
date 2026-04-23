import { useState, useEffect, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Download, MapPin, Mail, Phone, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getBusiness, listFeedback, walletBalance } from "@/lib/store";
import { toast } from "@/hooks/use-toast";
import type { Business, Feedback } from "@/lib/api";

const fmtNGN = (n: number) => `₦${n.toLocaleString()}`;

export default function BusinessDetail() {
  const { id } = useParams<{ id: string }>();
  const [business, setBusiness] = useState<Business | null>(null);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [wallet, setWallet] = useState({ earned: 0, available: 0, withdrawn: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    Promise.all([getBusiness(id), listFeedback(id)])
      .then(([biz, fb]) => {
        setBusiness(biz || null);
        setFeedback(fb);
      })
      .catch(console.error)
      .finally(() => setLoading(false));

    walletBalance(id).then(setWallet).catch(console.error);
  }, [id]);

  const rateUrl = useMemo(
    () => (id ? `${window.location.origin}/rate/${id}` : ""),
    [id],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="rounded-2xl border border-dashed p-12 text-center">
        <p className="text-sm text-muted-foreground">Business not found.</p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/dashboard/businesses">Back to businesses</Link>
        </Button>
      </div>
    );
  }

  const copy = async () => {
    await navigator.clipboard.writeText(rateUrl);
    toast({ title: "Link copied", description: "Share it with your customers." });
  };

  const download = () => {
    const svg = document.getElementById("biz-qr");
    if (!svg) return;
    const xml = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([xml], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${business.name}-qr.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const avg =
    feedback.length > 0
      ? (feedback.reduce((s, f) => s + f.rating, 0) / feedback.length).toFixed(1)
      : "—";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{business.name}</h1>
          <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {business.address}</span>
            <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" /> {business.email}</span>
            <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" /> {business.phone}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border bg-card p-5 shadow-card">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">Reviews</span>
          <div className="mt-2 text-2xl font-bold">{feedback.length}</div>
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-card">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">Avg rating</span>
          <div className="mt-2 text-2xl font-bold">★ {avg}</div>
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-card">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">Tips earned</span>
          <div className="mt-2 text-2xl font-bold">{fmtNGN(wallet.earned)}</div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="rounded-2xl border bg-gradient-mint p-6 shadow-card">
          <h2 className="font-semibold text-accent-foreground">Your QR code</h2>
          <p className="mt-1 text-xs text-accent-foreground/80">
            Customers scan this to leave feedback and tip your team.
          </p>
          <div className="mt-5 flex flex-col items-center gap-4 rounded-xl bg-card p-6">
            <QRCodeSVG id="biz-qr" value={rateUrl} size={200} level="H" includeMargin />
            <div className="w-full break-all rounded-md bg-muted px-3 py-2 text-center text-xs text-muted-foreground">
              {rateUrl}
            </div>
            <div className="flex w-full gap-2">
              <Button onClick={copy} variant="outline" className="flex-1">
                <Copy className="h-4 w-4" /> Copy link
              </Button>
              <Button onClick={download} className="flex-1 bg-gradient-primary">
                <Download className="h-4 w-4" /> Download
              </Button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-6 shadow-card">
          <h2 className="font-semibold">Recent feedback</h2>
          {feedback.length === 0 ? (
            <p className="mt-6 text-sm text-muted-foreground">
              No feedback yet. Share your QR to get the first review.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {feedback
                .slice()
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .slice(0, 8)
                .map((f) => (
                  <li key={f.id} className="rounded-lg border p-3">
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
                        {new Date(f.createdAt).toLocaleString()}
                      </span>
                    </div>
                    {f.experience && <p className="mt-2 text-sm">{f.experience}</p>}
                    {f.complaint && (
                      <p className="mt-1 text-xs text-destructive">Complaint: {f.complaint}</p>
                    )}
                    {f.tipAmount > 0 && (
                      <p className="mt-1 text-xs font-medium text-primary">
                        Tipped {fmtNGN(f.tipAmount)}
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