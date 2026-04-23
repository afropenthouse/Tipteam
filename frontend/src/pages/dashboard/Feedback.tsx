import { useState, useEffect } from "react";
import { listBusinesses, listFeedback, useCurrentUser } from "@/lib/store";
import type { Business, Feedback } from "@/lib/api";

export default function Feedback() {
  const user = useCurrentUser();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [feedback, setFeedback] = useState<(Feedback & { businessName: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    listBusinesses()
      .then((bizList) => {
        const feedbackPromises = bizList.map(async (business) => {
          const feedbacks = await listFeedback(business.id);
          return feedbacks
            .filter((f) => Boolean(f.experience?.trim()))
            .map((f) => ({ ...f, businessName: business.name }));
        });
        return Promise.all(feedbackPromises);
      })
      .then((feedbackArrays) => {
        const combined = feedbackArrays
          .flat()
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setFeedback(combined);
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
        <h1 className="text-2xl font-bold tracking-tight">Feedback & complaints</h1>
        <p className="text-sm text-muted-foreground">What guests are saying about your business.</p>
      </div>

      {feedback.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-12 text-center text-sm text-muted-foreground">
          No feedback yet — share your QR code to start collecting feedback!
        </div>
      ) : (
        <ul className="space-y-3">
          {feedback.map((f) => (
            <li key={f.id} className="rounded-xl border bg-card p-4 shadow-card">
              <div className="flex items-start justify-between">
                <span className="text-sm font-medium">{f.businessName}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(f.createdAt).toLocaleString()}
                </span>
              </div>
              {f.experience && (
                <p className="mt-2 text-sm">{f.experience}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
