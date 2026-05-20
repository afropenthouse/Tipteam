import { useState } from "react";
import { Search, Trash2, Star, Phone, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { adminApi } from "@/lib/admin";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function AdminFeedback() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [businessFilter, setBusinessFilter] = useState("");
  const [ratingFilter, setRatingFilter] = useState("");
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const limit = 20;

  const { data, isLoading } = useQuery({
    queryKey: ["admin-feedback", page, search, businessFilter, ratingFilter],
    queryFn: () => adminApi.getFeedback({ page, limit, search, businessId: businessFilter || undefined, rating: ratingFilter ? Number(ratingFilter) : undefined }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteFeedback(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-feedback"] });
      setDeleteId(null);
      setDeleteConfirm("");
      toast({ title: "Feedback deleted", description: "Feedback entry removed successfully." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const feedback = data?.feedback ?? [];
  const total = data?.total ?? 0;
  const pages = data?.pages ?? 1;

  const handleDelete = () => {
    if (deleteConfirm.toLowerCase() === "delete" && deleteId) {
      deleteMutation.mutate(deleteId);
    }
  };

  const renderStars = (rating?: number | null) => {
    if (!rating) return <span className="text-muted-foreground">No rating</span>;
    return (
      <div className="flex gap-0.5">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`h-3.5 w-3.5 ${i < rating ? "fill-warning text-warning" : "text-muted-foreground/30"}`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Feedback & Complaints</h1>
          <p className="text-sm text-muted-foreground">Review and manage customer feedback</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 max-w-sm">
          <Search className="relative left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search feedback..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Input
          placeholder="Filter by business ID"
          value={businessFilter}
          onChange={(e) => setBusinessFilter(e.target.value)}
          className="w-48"
        />
        <select
          value={ratingFilter}
          onChange={(e) => setRatingFilter(e.target.value)}
          className="flex h-9 w-24 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
        >
          <option value="">All ratings</option>
          {[1, 2, 3, 4, 5].map((r) => (
            <option key={r} value={r}>{r} stars</option>
          ))}
        </select>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-16 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Business</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead>Experience</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Tip (₦)</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {feedback.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No feedback found
                        </TableCell>
                      </TableRow>
                    ) : (
                      feedback.map((f: any) => (
                        <TableRow key={f.id}>
                          <TableCell className="font-medium">{f.business?.name || "—"}</TableCell>
                          <TableCell>{renderStars(f.rating)}</TableCell>
                          <TableCell className="max-w-xs truncate">
                            <div className="flex items-center gap-1">
                              {f.experience?.toLowerCase().includes("complaint") && <AlertTriangle className="h-3 w-3 text-red-500 flex-shrink-0" />}
                              <span>{f.experience || "—"}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {f.phone && <><Phone className="inline h-3 w-3 mr-1" />{f.phone}</>}
                          </TableCell>
                          <TableCell className="font-medium">{f.tipAmount?.toLocaleString() ?? 0}</TableCell>
                          <TableCell className="text-muted-foreground">{new Date(f.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:bg-destructive/10"
                              onClick={() => setDeleteId(f.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {total > 0 && (
                <div className="flex items-center justify-between px-6 py-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Showing {feedback.length} of {total} entries
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= pages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this feedback entry?
              Please type <span className="font-bold text-foreground">delete</span> to confirm.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder='Type "delete" here'
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              className="border-destructive/30 focus-visible:ring-destructive"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={deleteConfirm.toLowerCase() !== "delete" || deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Feedback"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}