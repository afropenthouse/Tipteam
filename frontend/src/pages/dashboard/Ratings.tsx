import { useState, useEffect } from "react";
import { Star } from "lucide-react";
import { listBusinesses, listFeedback, useCurrentUser } from "@/lib/store";
import type { Feedback } from "@/lib/api";

export default function Ratings() {
  const user = useCurrentUser();
  const [allFeedback, setAllFeedback] = useState<(Feedback & { businessName: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    listBusinesses()
      .then((bizList) => {
        const businessNameById = new Map(bizList.map((business) => [business.id, business.name]));
        return Promise.all(bizList.map((b) => listFeedback(b.id))).then((feedbackArrays) =>
            feedbackArrays
              .flat()
              .map((f) => ({
                ...f,
                businessName: businessNameById.get(f.businessId) || "Unknown business",
              }))
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        );
      })
      .then((combined) => {
        setAllFeedback(combined);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Ratings & feedback</h1>
        <p className="text-sm text-muted-foreground">All reviews across your businesses.</p>
      </div>

      {allFeedback.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-12 text-center text-sm text-muted-foreground">
          No ratings yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card shadow-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Business</th>
                <th className="px-4 py-3 text-left">Rating</th>
                <th className="px-4 py-3 text-left">Experience</th>
                <th className="px-4 py-3 text-left">When</th>
              </tr>
            </thead>
            <tbody>
              {allFeedback.map((f) => (
                <tr key={f.id} className="border-t">
                  <td className="px-4 py-3 font-medium">{f.businessName}</td>
                  <td className="px-4 py-3">
                    <div className="flex">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-3.5 w-3.5 ${i < f.rating ? "fill-warning text-warning" : "text-muted-foreground/30"}`}
                        />
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{f.experience || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(f.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
