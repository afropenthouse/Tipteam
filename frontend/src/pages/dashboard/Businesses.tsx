import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Plus, Store, Filter, Trash2, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { listBusinesses, deleteBusiness, useCurrentUser } from "@/lib/store";
import type { Business } from "@/lib/api";

export default function Businesses() {
  const user = useCurrentUser();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBusiness, setSelectedBusiness] = useState<string>("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [businessToDelete, setBusinessToDelete] = useState<Business | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (user) {
      listBusinesses()
        .then(setBusinesses)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [user]);

  const handleDeleteClick = (business: Business) => {
    setBusinessToDelete(business);
    setDeleteConfirmation("");
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!businessToDelete || deleteConfirmation !== "delete") return;
    
    setIsDeleting(true);
    try {
      await deleteBusiness(businessToDelete.id);
      setBusinesses(businesses.filter(b => b.id !== businessToDelete.id));
      setDeleteDialogOpen(false);
      setBusinessToDelete(null);
      setDeleteConfirmation("");
    } catch (error) {
      console.error("Failed to delete business:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Filter businesses based on selection
  const filteredBusinesses = selectedBusiness === "all" 
    ? businesses 
    : businesses.filter(b => b.id === selectedBusiness);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Businesses</h1>
          <p className="text-sm text-muted-foreground">Manage your locations and their QR codes.</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedBusiness} onValueChange={setSelectedBusiness}>
            <SelectTrigger className="w-48">
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
          <Button asChild className="bg-gradient-primary shadow-elegant">
            <Link to="/dashboard/businesses/new">
              <Plus className="h-4 w-4" /> Add business
            </Link>
          </Button>
        </div>
      </div>

      {filteredBusinesses.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-12 text-center">
          <Store className="mx-auto h-10 w-10 text-muted-foreground" />
          <h2 className="mt-3 font-semibold">
            {selectedBusiness === "all" ? "No businesses yet" : "No businesses found"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {selectedBusiness === "all" 
              ? "Add your first to start collecting feedback."
              : "Try selecting a different business or create a new one."
            }
          </p>
          <Button asChild className="mt-4 bg-gradient-primary">
            <Link to="/dashboard/businesses/new">Create business</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredBusinesses.map((b) => (
            <div
              key={b.id}
              className="group rounded-xl border bg-card p-5 shadow-card transition hover:border-primary/50 hover:shadow-elegant relative"
            >
              <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    window.location.href = `/dashboard/businesses/${b.id}`;
                  }}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleDeleteClick(b);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <Link
                to={`/dashboard/businesses/${b.id}`}
                className="block"
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
            </div>
          ))}
        </div>
      )}
      
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Business</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{businessToDelete?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              To confirm deletion, please type <span className="font-mono bg-muted px-1 py-0.5 rounded">delete</span> in the box below:
            </p>
            <Input
              value={deleteConfirmation}
              onChange={(e) => setDeleteConfirmation(e.target.value)}
              placeholder="Type 'delete' to confirm"
              className="w-full"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setBusinessToDelete(null);
                setDeleteConfirmation("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteConfirmation !== "delete" || isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete Business"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}