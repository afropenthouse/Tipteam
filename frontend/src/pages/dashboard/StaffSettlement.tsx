import { useState, useEffect } from "react";
import { useCurrentUser } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Loader2, Trash2, ArrowLeft, Copy, Check, FileText, Edit, Search, CalendarDays, Calendar as CalendarIcon, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, subMonths, subYears, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Link } from "react-router-dom";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { settlementApi, type Staff, type Receipt, listBusinesses } from "@/lib/api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const fmtNGN = (n: number) => `₦${n.toLocaleString()}`;

export default function StaffSettlement({ hideHeader = false }: { hideHeader?: boolean }) {
  const user = useCurrentUser();
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>("");
  const [staff, setStaff] = useState<Staff[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [staffDialogOpen, setStaffDialogOpen] = useState(false);
  const [newStaffName, setNewStaffName] = useState("");
  const [newStaffRole, setNewStaffRole] = useState("");
  const [newStaffCommission, setNewStaffCommission] = useState("");
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [editStaffDialogOpen, setEditStaffDialogOpen] = useState(false);
  const [viewingTransactions, setViewingTransactions] = useState<Staff | null>(null);
  const [copied, setCopied] = useState(false);

  // Filters state
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [customDate, setCustomDate] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });

  const getDateInterval = () => {
    const now = new Date();
    const today = endOfDay(now);
    
    switch (dateFilter) {
      case "1m":
        return { start: startOfDay(subMonths(now, 1)), end: today };
      case "3m":
        return { start: startOfDay(subMonths(now, 3)), end: today };
      case "6m":
        return { start: startOfDay(subMonths(now, 6)), end: today };
      case "1y":
        return { start: startOfDay(subYears(now, 1)), end: today };
      case "custom":
        if (customDate.from && customDate.to) {
          return { start: startOfDay(customDate.from), end: endOfDay(customDate.to) };
        }
        return null;
      default:
        return null;
    }
  };

  const filteredReceipts = receipts.filter(r => {
    const interval = getDateInterval();
    if (!interval) return true;
    const receiptDate = new Date(r.date);
    return isWithinInterval(receiptDate, interval);
  });

  const calculateStaffEarnings = (staffId: string, commission: number) => {
    const staffReceipts = filteredReceipts.filter(r => r.staffId === staffId);
    return staffReceipts.reduce((sum, r) => sum + (r.amount * (commission / 100)), 0);
  };

  const filteredStaff = staff.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.role.toLowerCase().includes(searchTerm.toLowerCase())
  ).map(s => ({
    ...s,
    earnings: calculateStaffEarnings(s.id, s.commission)
  }));

  const { data: statusData, isLoading: isStatusLoading } = useQuery({
    queryKey: ["subscription-status"],
    queryFn: async () => {
      const response = await api.get<{ hasActiveSubscription: boolean; hasStaffSettlementAccess: boolean }>("/subscriptions/status");
      return response;
    },
  });

  const hasAccess = statusData?.hasStaffSettlementAccess || false;

  useEffect(() => {
    if (user) {
      listBusinesses().then((data) => {
        setBusinesses(data);
        if (data.length > 0) {
          setSelectedBusinessId(data[0].id);
        } else {
          setLoading(false);
        }
      });
    }
  }, [user]);

  const handleCopyLink = () => {
    if (!selectedBusinessId) return;
    const url = `${window.location.origin}/settle/${selectedBusinessId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast({
      description: "Settlement link copied to clipboard",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const fetchData = async () => {
    if (!selectedBusinessId) return;
    if (!hasAccess) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [staffData, receiptsData] = await Promise.all([
        settlementApi.getStaff(selectedBusinessId),
        settlementApi.getReceipts(selectedBusinessId)
      ]);
      setStaff(staffData);
      setReceipts(receiptsData);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedBusinessId) {
      fetchData();
    }
  }, [selectedBusinessId, hasAccess]);

  const handleAddStaff = async () => {
    if (!newStaffName || !newStaffRole || !newStaffCommission || !selectedBusinessId) {
      toast({
        variant: "destructive",
        description: "Please fill in all fields",
      });
      return;
    }

    try {
      const newStaff = await settlementApi.addStaff(selectedBusinessId, {
        name: newStaffName,
        role: newStaffRole,
        commission: parseFloat(newStaffCommission),
      });

      setStaff(prev => [newStaff, ...prev]);
      setNewStaffName("");
      setNewStaffRole("");
      setNewStaffCommission("");
      setStaffDialogOpen(false);

      toast({
        description: "Staff member added successfully",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        description: "Failed to add staff member",
      });
    }
  };

  const handleDeleteStaff = async (id: string) => {
    try {
      await settlementApi.deleteStaff(id);
      setStaff(prev => prev.filter(s => s.id !== id));
      toast({ description: "Staff member deleted" });
    } catch (error) {
      toast({ variant: "destructive", description: "Failed to delete staff" });
    }
  };

  const handleEditStaff = (s: Staff) => {
    setEditingStaff(s);
    setNewStaffName(s.name);
    setNewStaffRole(s.role);
    setNewStaffCommission(s.commission.toString());
    setEditStaffDialogOpen(true);
  };

  const handleUpdateStaff = async () => {
    if (!editingStaff || !newStaffName || !newStaffRole || !newStaffCommission) {
      toast({
        variant: "destructive",
        description: "Please fill in all fields",
      });
      return;
    }

    try {
      const updatedStaff = await settlementApi.updateStaff(editingStaff.id, {
        name: newStaffName,
        role: newStaffRole,
        commission: parseFloat(newStaffCommission),
      });

      setStaff(prev => prev.map(s => s.id === editingStaff.id ? updatedStaff : s));
      setNewStaffName("");
      setNewStaffRole("");
      setNewStaffCommission("");
      setEditingStaff(null);
      setEditStaffDialogOpen(false);

      toast({
        description: "Staff member updated successfully",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        description: "Failed to update staff member",
      });
    }
  };

  if (loading || isStatusLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!hasAccess && !loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center animate-in fade-in zoom-in duration-500">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Upgrade to Premium</h2>
        <p className="text-gray-600 max-w-md mb-8 text-lg">
          Staff Settlement is a premium feature. Upgrade your plan to manage staff commissions, 
          track service settlements, and access detailed earnings reports.
        </p>
        <Button asChild size="lg" className="bg-gradient-primary shadow-elegant px-8 h-12 text-base">
          <Link to="/dashboard/subscriptions">
            <Sparkles className="w-5 h-5 mr-2" />
            View Premium Plans
          </Link>
        </Button>
      </div>
    );
  }

  if (viewingTransactions) {
    const staffReceipts = filteredReceipts.filter(r => r.staffId === viewingTransactions.id);

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => setViewingTransactions(null)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{viewingTransactions.name}</h1>
              <p className="text-sm text-muted-foreground">{viewingTransactions.role} • {viewingTransactions.commission}% Commission</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="px-3 py-1">
              {staffReceipts.length} Transactions
            </Badge>
            <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200 px-3 py-1">
              Total Earnings: {fmtNGN(calculateStaffEarnings(viewingTransactions.id, viewingTransactions.commission))}
            </Badge>
          </div>
        </div>

        <div className="rounded-xl border bg-card shadow-card overflow-hidden">
          <div className="px-6 py-4 border-b bg-muted/30">
            <h3 className="font-semibold">Transaction History</h3>
          </div>
          <CardContent className="p-0">
            {staffReceipts.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <FileText className="h-10 w-10 mx-auto mb-4 opacity-20" />
                <p>No transactions found for this staff member.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/20">
                    <TableHead className="pl-6">Service</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Commission ({viewingTransactions.commission}%)</TableHead>
                    <TableHead className="pr-6">Receipt</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staffReceipts.map((r) => (
                    <TableRow key={r.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="pl-6 font-medium">{r.serviceName}</TableCell>
                      <TableCell>{fmtNGN(r.amount)}</TableCell>
                      <TableCell>{new Date(r.date).toLocaleDateString()}</TableCell>
                      <TableCell className="font-semibold text-green-600">
                        {fmtNGN(r.amount * (viewingTransactions.commission / 100))}
                      </TableCell>
                      <TableCell className="pr-6">
                        <Button variant="ghost" size="sm" className="gap-2 text-primary p-0 h-auto hover:bg-transparent hover:underline" asChild>
                          <a href={r.imageUrl || "#"} target="_blank" rel="noopener noreferrer">
                            <FileText className="h-4 w-4" />
                            View Image
                          </a>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 px-4 sm:px-0">
      {!hideHeader && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Staff Settlement</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Manage staff members and view their transaction history
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <span className="text-sm font-medium">Business:</span>
              <Select value={selectedBusinessId} onValueChange={setSelectedBusinessId}>
                <SelectTrigger className="w-full sm:w-[200px]">
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

            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleCopyLink}
              className="w-full sm:w-auto flex items-center justify-center gap-2"
            >
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied" : "Copy Settlement Link"}
            </Button>
          </div>
        </div>
      )}

      {hideHeader && (
         <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
           <div className="flex flex-col sm:flex-row sm:items-center gap-2">
             <span className="text-sm font-medium">Business:</span>
             <Select value={selectedBusinessId} onValueChange={setSelectedBusinessId}>
               <SelectTrigger className="w-full sm:w-[200px]">
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

           <Button 
             variant="outline" 
             size="sm" 
             onClick={handleCopyLink}
             className="w-full sm:w-auto flex items-center justify-center gap-2"
           >
             {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
             {copied ? "Copied" : "Copy Settlement Link"}
           </Button>
         </div>
       )}

      <div className="rounded-xl border bg-card p-4 sm:p-6 shadow-card overflow-hidden">
        <CardHeader className="px-0 pt-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <CardTitle className="text-lg sm:text-xl">Staff Members</CardTitle>
          <div className="w-full sm:w-auto flex items-center gap-3">
            <Dialog open={staffDialogOpen} onOpenChange={setStaffDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto bg-gradient-primary shadow-elegant">
                  Add Staff
                </Button>
              </DialogTrigger>
              <DialogContent className="h-auto max-h-[90vh] w-[95vw] sm:max-w-md overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New Staff</DialogTitle>
                  <DialogDescription>
                    Add a new staff member to the system
                  </DialogDescription>
                </DialogHeader>
                <form className="space-y-4" onSubmit={(e) => {
                  e.preventDefault();
                  handleAddStaff();
                }}>
                  <div className="space-y-2">
                    <label htmlFor="staff-name" className="text-sm font-medium text-muted-foreground">
                      Name
                    </label>
                    <Input
                      id="staff-name"
                      value={newStaffName}
                      onChange={(e) => setNewStaffName(e.target.value)}
                      placeholder="Enter staff name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="staff-role" className="text-sm font-medium text-muted-foreground">
                      Role
                    </label>
                    <Input
                      id="staff-role"
                      value={newStaffRole}
                      onChange={(e) => setNewStaffRole(e.target.value)}
                      placeholder="Enter staff role"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="staff-commission" className="text-sm font-medium text-muted-foreground">
                      Commission (%)
                    </label>
                    <Input
                      id="staff-commission"
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={newStaffCommission}
                      onChange={(e) => setNewStaffCommission(e.target.value)}
                      placeholder="Enter commission percentage"
                      required
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-primary"
                    disabled={loading}
                  >
                    {loading ? "Adding..." : "Add Staff"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>

        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search staff..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-full"
            />
          </div>

          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger>
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="Filter by date" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="1m">Last 30 Days</SelectItem>
              <SelectItem value="3m">Last 3 Months</SelectItem>
              <SelectItem value="6m">Last 6 Months</SelectItem>
              <SelectItem value="1y">Last Year</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>

          {dateFilter === "custom" && (
            <div className="lg:col-span-2 flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal h-10">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {customDate.from ? format(customDate.from, "PPP") : "Start Date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={customDate.from}
                    onSelect={(date) => setCustomDate(prev => ({ ...prev, from: date }))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal h-10">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {customDate.to ? format(customDate.to, "PPP") : "End Date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={customDate.to}
                    onSelect={(date) => setCustomDate(prev => ({ ...prev, to: date }))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>

        <CardContent className="px-0 pb-0">
          <div className="relative w-full overflow-auto">
            {filteredStaff.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No staff members found</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[150px]">Name</TableHead>
                    <TableHead className="min-w-[120px]">Role</TableHead>
                    <TableHead className="min-w-[100px]">Commission</TableHead>
                    <TableHead className="min-w-[120px]">Total Earnings</TableHead>
                    <TableHead className="text-right min-w-[150px]">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStaff.map((s) => {
                    const hasTransactions = filteredReceipts.some(r => r.staffId === s.id);
                    return (
                      <TableRow 
                        key={s.id} 
                        className={cn(
                          "hover:bg-muted/50 transition-colors",
                          hasTransactions && "cursor-pointer"
                        )}
                        onClick={() => hasTransactions && setViewingTransactions(s)}
                      >
                        <TableCell className="font-medium">
                          <div className="flex flex-col">
                            <span>{s.name}</span>
                            <span className="text-xs text-muted-foreground font-normal">{s.role}</span>
                          </div>
                        </TableCell>
                        <TableCell>{s.role}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="font-normal">
                            {s.commission}%
                          </Badge>
                        </TableCell>
                        <TableCell className="font-bold text-green-600">
                          {fmtNGN(s.earnings)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1 sm:gap-2" onClick={(e) => e.stopPropagation()}>
                            {hasTransactions && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => setViewingTransactions(s)}
                                className="h-8 px-2 text-primary hover:text-primary hover:bg-primary/10"
                              >
                                <FileText className="h-4 w-4 sm:mr-2" />
                                <span className="hidden sm:inline">Transactions</span>
                              </Button>
                            )}
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleEditStaff(s)}
                              className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="w-[95vw] sm:max-w-md">
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete the staff member
                                    and remove their data from our servers.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteStaff(s.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </div>

      <Dialog open={editStaffDialogOpen} onOpenChange={setEditStaffDialogOpen}>
        <DialogContent className="h-[79vh] w-full max-w-md overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Staff Member</DialogTitle>
            <DialogDescription>
              Update staff member details
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={(e) => {
            e.preventDefault();
            handleUpdateStaff();
          }}>
            <div className="space-y-2">
              <label htmlFor="edit-staff-name" className="text-sm font-medium text-muted-foreground">
                Name
              </label>
              <Input
                id="edit-staff-name"
                value={newStaffName}
                onChange={(e) => setNewStaffName(e.target.value)}
                placeholder="Enter staff name"
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="edit-staff-role" className="text-sm font-medium text-muted-foreground">
                Role
              </label>
              <Input
                id="edit-staff-role"
                value={newStaffRole}
                onChange={(e) => setNewStaffRole(e.target.value)}
                placeholder="Enter staff role"
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="edit-staff-commission" className="text-sm font-medium text-muted-foreground">
                Commission (%)
              </label>
              <Input
                id="edit-staff-commission"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={newStaffCommission}
                onChange={(e) => setNewStaffCommission(e.target.value)}
                placeholder="Enter commission percentage"
                required
              />
            </div>
            <Button 
              type="submit" 
              className="w-full bg-gradient-primary"
              disabled={loading}
            >
              {loading ? "Updating..." : "Update Staff"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
