import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Plus, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { listBusinesses, useCurrentUser } from "@/lib/store";
import type { Business } from "@/lib/api";

export default function Businesses() {
  const user = useCurrentUser();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      listBusinesses()
        .then(setBusinesses)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
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
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Businesses</h1>
          <p className="text-sm text-muted-foreground">Manage your locations and their QR codes.</p>
        </div>
        <Button asChild className="bg-gradient-primary shadow-elegant">
          <Link to="/dashboard/businesses/new">
            <Plus className="h-4 w-4" /> Add business
          </Link>
        </Button>
      </div>

      {businesses.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-12 text-center">
          <Store className="mx-auto h-10 w-10 text-muted-foreground" />
          <h2 className="mt-3 font-semibold">No businesses yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">Add your first to start collecting feedback.</p>
          <Button asChild className="mt-4 bg-gradient-primary">
            <Link to="/dashboard/businesses/new">Create business</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {businesses.map((b) => (
            <Link
              key={b.id}
              to={`/dashboard/businesses/${b.id}`}
              className="group rounded-xl border bg-card p-5 shadow-card transition hover:border-primary/50 hover:shadow-elegant"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground">
                <Store className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold group-hover:text-primary">{b.name}</h3>
              <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{b.address}</p>
              <div className="mt-4 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Active</span>
                <div className="flex items-center gap-1 text-primary group-hover:text-primary/80">
                  <span className="font-medium">View QR</span>
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}