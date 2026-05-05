import { useState, useEffect } from "react";
import { Filter } from "lucide-react";
import { listBusinesses, listFeedback, useCurrentUser } from "@/lib/store";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Business, Feedback } from "@/lib/api";

// Function to mask phone number
const maskPhoneNumber = (phone: string) => {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length <= 3) return cleaned;
  if (cleaned.length <= 6) return cleaned.slice(0, 3) + '***' + cleaned.slice(3);
  if (cleaned.length <= 8) return cleaned.slice(0, 4) + '****' + cleaned.slice(4);
  return cleaned.slice(0, 2) + '******' + cleaned.slice(2);
};

export default function Feedback() {
  const user = useCurrentUser();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [feedback, setFeedback] = useState<(Feedback & { businessName: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBusiness, setSelectedBusiness] = useState<string>("all");

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

  // Filter feedback based on selected business
  const filteredFeedback = selectedBusiness === "all" 
    ? feedback 
    : feedback.filter(f => f.businessId === selectedBusiness);

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
        <h1 className="text-2xl font-bold tracking-tight">Feedback & Complaints</h1>
        <p className="text-sm text-muted-foreground">What guests are saying about your business.</p>
      </div>
      
      <div className="mb-6">
        <Select value={selectedBusiness} onValueChange={setSelectedBusiness}>
          <SelectTrigger className="w-64">
            <Filter className="h-4 w-4 mr-2" />
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
      </div>

      {filteredFeedback.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-12 text-center text-sm text-muted-foreground">
          {selectedBusiness === "all" 
            ? "No feedback yet — share your QR code to start collecting feedback!"
            : "No feedback for this business yet."
          }
        </div>
      ) : (
        <ul className="space-y-3">
          {filteredFeedback.map((f) => (
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
              {f.phone && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Phone: {maskPhoneNumber(f.phone)}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
