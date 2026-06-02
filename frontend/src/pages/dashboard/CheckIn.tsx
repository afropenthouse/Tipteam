import { useState, useMemo, useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  UserPlus, 
  CheckCircle2, 
  UserCheck, 
  Loader2, 
  Plus, 
  Trash2, 
  Upload, 
  FileDown, 
  FileSpreadsheet, 
  ClipboardPaste,
  UserMinus,
  CheckSquare,
  Square,
  Filter,
  Copy,
  ExternalLink,
  QrCode,
  Calendar as CalendarIcon
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { checkInApi, listBusinesses } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { format, addMonths, addDays } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

export default function CheckIn() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedBusinessId, setSelectedBusinessId] = useState("");
  const [customerRows, setCustomerRows] = useState([{ name: "", phone: "" }]);
  const [addWithActivation, setAddWithActivation] = useState(false);
  const [addExpiryDate, setAddExpiryDate] = useState<Date | undefined>(addMonths(new Date(), 1));
  const [actionId, setActionId] = useState<string | null>(null);
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  
  // Confirmation Modals State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isClearHistoryModalOpen, setIsClearHistoryModalOpen] = useState(false);
  const [customerToAction, setCustomerToAction] = useState<{ id: string, name: string } | null>(null);
  
  // New state for activation with expiry
  const [isActivateModalOpen, setIsActivateModalOpen] = useState(false);
  const [activationId, setActivationId] = useState<string | null>(null);
  const [expiryDate, setExpiryDate] = useState<Date | undefined>(addMonths(new Date(), 1));
  
  // Bulk selection state
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const [isBulkActivateModalOpen, setIsBulkActivateModalOpen] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [businessFilter, setBusinessFilter] = useState<string>("");

  const queryClient = useQueryClient();

  const { data: customers = [], isLoading: isCustomersLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: checkInApi.getCustomers,
  });

  const { data: businesses = [] } = useQuery({
    queryKey: ["businesses"],
    queryFn: listBusinesses,
  });

  // Set default business filter when businesses are loaded
  useEffect(() => {
    if (businessFilter === "" && businesses.length > 0) {
      setBusinessFilter(businesses[0].id);
    }
  }, [businesses, businessFilter]);

  const activateMutation = useMutation({
    mutationFn: ({ id, expiry }: { id: string; expiry?: string }) => {
      return checkInApi.activateCustomer(id, expiry);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast({ title: "Customer activated successfully" });
      setIsActivateModalOpen(false);
      setActivationId(null);
    },
    onError: (error: any) => {
      toast({ title: "Failed to activate customer", description: error.message, variant: "destructive" });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => {
      setActionId(id);
      return checkInApi.deactivateCustomer(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast({ title: "Customer deactivated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to deactivate customer", description: error.message, variant: "destructive" });
    },
    onSettled: () => setActionId(null)
  });

  const bulkStatusMutation = useMutation({
    mutationFn: ({ ids, status, expiry }: { ids: string[]; status: "ACTIVE" | "INACTIVE"; expiry?: string }) => {
      return checkInApi.bulkUpdateStatus(ids, status, expiry);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast({ title: `Bulk updated ${variables.ids.length} customers successfully` });
      setSelectedCustomerIds([]);
      setIsBulkActivateModalOpen(false);
    },
    onError: (error: any) => {
      toast({ title: "Failed to update customers", description: error.message, variant: "destructive" });
    },
  });

  const deleteCustomerMutation = useMutation({
    mutationFn: (id: string) => {
      setActionId(id);
      return checkInApi.deleteCustomer(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast({ title: "Customer removed successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to remove customer", description: error.message, variant: "destructive" });
    },
    onSettled: () => setActionId(null)
  });

  const clearHistoryMutation = useMutation({
    mutationFn: (id: string) => {
      setActionId(id);
      return checkInApi.clearCustomerHistory(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast({ title: "Check-in history cleared" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to clear history", description: error.message, variant: "destructive" });
    },
    onSettled: () => setActionId(null)
  });

  const addCustomerMutation = useMutation({
    mutationFn: checkInApi.addCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setIsAddModalOpen(false);
      setSelectedBusinessId("");
      setCustomerRows([{ name: "", phone: "" }]);
      toast({ title: "Customers added successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to add customers", description: error.message, variant: "destructive" });
    },
  });

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.phone.includes(searchTerm);
      const matchesStatus = statusFilter === "all" || c.subscriptionStatus === statusFilter;
      const matchesBusiness = businessFilter === "all" || c.businessId === businessFilter;
      return matchesSearch && matchesStatus && matchesBusiness;
    });
  }, [customers, searchTerm, statusFilter, businessFilter]);

  const handleSelectAll = () => {
    if (selectedCustomerIds.length === filteredCustomers.length) {
      setSelectedCustomerIds([]);
    } else {
      setSelectedCustomerIds(filteredCustomers.map(c => c.id));
    }
  };

  const handleSelectCustomer = (id: string) => {
    setSelectedCustomerIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleAddRow = () => {
    setCustomerRows((prev) => [...prev, { name: "", phone: "" }]);
  };

  const handleRemoveRow = (index: number) => {
    if (customerRows.length > 1) {
      setCustomerRows(customerRows.filter((_, i) => i !== index));
    }
  };

  const handleUpdateRow = (index: number, field: "name" | "phone", value: string) => {
    const newRows = [...customerRows];
    newRows[index][field] = value;
    setCustomerRows(newRows);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split(/\r?\n/);
      
      const newCustomers: { name: string; phone: string }[] = [];
      
      // Skip header if it exists
      const startIndex = lines[0].toLowerCase().includes("name") ? 1 : 0;
      
      for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const [name, phone] = line.split(",").map(item => item.trim());
        if (name || phone) {
          newCustomers.push({ name: name || "", phone: phone || "" });
        }
      }

      if (newCustomers.length > 0) {
        // Filter out empty rows from current state and append new ones
        const currentValidRows = customerRows.filter(c => c.name.trim() || c.phone.trim());
        setCustomerRows([...currentValidRows, ...newCustomers]);
        toast({ title: `Imported ${newCustomers.length} customers` });
      }
      
      // Reset input
      e.target.value = "";
    };
    reader.readAsText(file);
  };

  const downloadTemplate = () => {
    const content = "Name,Phone\nJohn Doe,+2348000000000\nJane Smith,+2349000000000";
    const blob = new Blob([content], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "customer_template.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleBulkPaste = () => {
    const lines = pasteText.split(/\r?\n/);
    const newCustomers: { name: string; phone: string }[] = [];
    
    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;
      
      // Support comma, tab, or semicolon separation
      const parts = trimmed.split(/,|\t|;/).map(p => p.trim());
      if (parts.length >= 2) {
        newCustomers.push({ name: parts[0], phone: parts[1] });
      } else if (parts.length === 1 && parts[0]) {
        // If only one part, assume it's the name and leave phone empty
        newCustomers.push({ name: parts[0], phone: "" });
      }
    });

    if (newCustomers.length > 0) {
      const currentValidRows = customerRows.filter(c => c.name.trim() || c.phone.trim());
      setCustomerRows([...currentValidRows, ...newCustomers]);
      setPasteText("");
      setIsPasteModalOpen(false);
      toast({ title: `Added ${newCustomers.length} customers from list` });
    } else {
      toast({ title: "No valid customer data found in pasted text", variant: "destructive" });
    }
  };

  const handleAddCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedBusinessId) {
      toast({ title: "Please select a business", variant: "destructive" });
      return;
    }

    const validCustomers = customerRows.filter(c => c.name.trim() && c.phone.trim());
    
    if (validCustomers.length === 0) {
      toast({ title: "Please add at least one customer with name and phone", variant: "destructive" });
      return;
    }

    addCustomerMutation.mutate({
      businessId: selectedBusinessId,
      customers: validCustomers,
      status: addWithActivation ? "ACTIVE" : "PENDING",
      expiryDate: addWithActivation ? addExpiryDate?.toISOString() : undefined
    });
  };

  const copyCheckInLink = (businessId: string) => {
    const link = `${window.location.origin}/checkin/${businessId}`;
    navigator.clipboard.writeText(link);
    toast({ title: "Check-in link copied", description: "Share this link with your customers." });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Check In</h1>
          <p className="text-sm text-muted-foreground">
            Manage customer check-ins and subscriptions.
          </p>
        </div>
        
        <div className="flex gap-2">
          <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary shadow-elegant gap-2">
                <UserPlus className="h-4 w-4" />
                Add Customer
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Customers</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddCustomer} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="business">Business</Label>
                  <Select 
                    value={selectedBusinessId} 
                    onValueChange={setSelectedBusinessId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select business" />
                    </SelectTrigger>
                    <SelectContent>
                      {businesses.map((b) => (
                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Customers</Label>
                    <div className="flex gap-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        onClick={downloadTemplate} 
                        className="gap-1 text-xs"
                      >
                        <FileDown className="h-3 w-3" /> Template
                      </Button>
                      <div className="relative">
                        <Input
                          type="file"
                          accept=".csv"
                          onChange={handleFileUpload}
                          className="absolute inset-0 opacity-0 cursor-pointer z-10"
                        />
                        <Button type="button" variant="outline" size="sm" className="gap-1 text-xs">
                          <Upload className="h-3 w-3" /> Import CSV
                        </Button>
                      </div>
                      <Dialog open={isPasteModalOpen} onOpenChange={setIsPasteModalOpen}>
                        <DialogTrigger asChild>
                          <Button type="button" variant="outline" size="sm" className="gap-1 text-xs">
                            <ClipboardPaste className="h-3 w-3" /> Paste List
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle>Paste Customer List</DialogTitle>
                            <DialogDescription>
                              Paste a list of names and phone numbers separated by commas, tabs, or semicolons.
                              One customer per line.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <Textarea 
                              placeholder={"John Doe, 08012345678\nJane Smith, 08087654321"} 
                              className="min-h-[200px] font-mono text-sm"
                              value={pasteText}
                              onChange={(e) => setPasteText(e.target.value)}
                            />
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setIsPasteModalOpen(false)}>Cancel</Button>
                            <Button onClick={handleBulkPaste}>Add to List</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                      <Button type="button" variant="outline" size="sm" onClick={handleAddRow} className="gap-1 text-xs">
                        <Plus className="h-3 w-3" /> Add Row
                      </Button>
                    </div>
                  </div>
                  
                  <div className="border rounded-lg overflow-hidden bg-muted/10">
                    <div className="grid grid-cols-[1fr,1fr,40px] gap-2 p-2 bg-muted/30 border-b">
                      <Label className="text-[10px] text-muted-foreground uppercase font-bold px-1">Name</Label>
                      <Label className="text-[10px] text-muted-foreground uppercase font-bold px-1">Phone Number</Label>
                      <div className="w-8"></div>
                    </div>
                    <div className="divide-y">
                      {customerRows.map((row, index) => (
                        <div key={index} className="grid grid-cols-[1fr,1fr,40px] gap-2 p-2 items-center hover:bg-muted/5 transition-colors">
                          <Input 
                            placeholder="John Doe" 
                            value={row.name}
                            onChange={(e) => handleUpdateRow(index, "name", e.target.value)}
                            className="h-8 text-sm px-2 border-none bg-transparent shadow-none focus-visible:ring-1 focus-visible:ring-offset-0"
                          />
                          <Input 
                            placeholder="+234 800 000 0000" 
                            value={row.phone}
                            onChange={(e) => handleUpdateRow(index, "phone", e.target.value)}
                            className="h-8 text-sm px-2 border-none bg-transparent shadow-none focus-visible:ring-1 focus-visible:ring-offset-0"
                          />
                          {customerRows.length > 1 ? (
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="icon" 
                              className="text-destructive h-8 w-8 hover:bg-destructive/10" 
                              onClick={() => handleRemoveRow(index)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          ) : (
                            <div className="w-8 h-8"></div>
                          )}
                        </div>
                      ))}
                    </div>
                </div>
              </div>

              <div className="space-y-4 p-4 border rounded-xl bg-muted/20">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Activate Immediately</Label>
                    <p className="text-xs text-muted-foreground">Set a time range for these customers now</p>
                  </div>
                  <Checkbox 
                    checked={addWithActivation} 
                    onCheckedChange={(checked) => setAddWithActivation(!!checked)}
                  />
                </div>

                {addWithActivation && (
                  <div className="space-y-3 pt-2 animate-in fade-in slide-in-from-top-2">
                    <Label className="text-xs uppercase font-bold text-muted-foreground">Select Time Range</Label>
                    <div className="flex flex-wrap gap-2">
                      <Button 
                        type="button" 
                        variant={addExpiryDate && format(addExpiryDate, 'yyyy-MM-dd') === format(addMonths(new Date(), 1), 'yyyy-MM-dd') ? "default" : "outline"} 
                        size="sm" 
                        onClick={() => setAddExpiryDate(addMonths(new Date(), 1))}
                        className="h-8 text-xs"
                      >
                        1 Month
                      </Button>
                      <Button 
                        type="button" 
                        variant={addExpiryDate && format(addExpiryDate, 'yyyy-MM-dd') === format(addMonths(new Date(), 3), 'yyyy-MM-dd') ? "default" : "outline"} 
                        size="sm" 
                        onClick={() => setAddExpiryDate(addMonths(new Date(), 3))}
                        className="h-8 text-xs"
                      >
                        3 Months
                      </Button>
                      <Button 
                        type="button" 
                        variant={!addExpiryDate ? "default" : "outline"} 
                        size="sm" 
                        onClick={() => setAddExpiryDate(undefined)}
                        className="h-8 text-xs"
                      >
                        Permanent
                      </Button>
                    </div>
                    
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full justify-start text-left font-normal h-10",
                            !addExpiryDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {addExpiryDate ? format(addExpiryDate, "PPP") : <span>No expiry date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={addExpiryDate}
                          onSelect={setAddExpiryDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                )}
              </div>

              <DialogFooter>
                  <Button type="submit" className="w-full" disabled={addCustomerMutation.isPending}>
                    {addCustomerMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Add {customerRows.filter(c => c.name.trim() && c.phone.trim()).length} Customer(s)
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Check-in Links for Businesses */}
      {businesses.filter(b => b.allowCheckin && (businessFilter === "" || b.id === businessFilter)).length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {businesses.filter(b => b.allowCheckin && (businessFilter === "" || b.id === businessFilter)).map(b => (
            <div key={b.id} className="p-4 border rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 shadow-sm border-blue-100">
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-blue-900">{b.name}</span>
                <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200">Enabled</Badge>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] uppercase tracking-wider text-blue-600 font-bold">Public Check-in Link</p>
                <div className="flex items-center gap-2 bg-white/80 p-2 rounded-lg border border-blue-100">
                  <span className="text-xs truncate flex-1 text-muted-foreground">
                    {`${window.location.origin}/checkin/${b.id}`}
                  </span>
                  <Button variant="ghost" size="icon" onClick={() => copyCheckInLink(b.id)} className="h-7 w-7 text-blue-600">
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button variant="outline" size="sm" asChild className="flex-1 h-8 text-xs border-blue-200 text-blue-700 hover:bg-blue-100">
                    <a href={`/checkin/${b.id}`} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3 w-3 mr-1" /> View Page
                    </a>
                  </Button>
                  <Button variant="outline" size="sm" asChild className="flex-1 h-8 text-xs border-blue-200 text-blue-700 hover:bg-blue-100">
                    <NavLink to={`/dashboard/businesses/${b.id}`}>
                      <QrCode className="h-3 w-3 mr-1" /> Get QR
                    </NavLink>
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search customers..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <Filter className="h-3.5 w-3.5 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="INACTIVE">Inactive</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
            </SelectContent>
          </Select>

          <Select value={businessFilter} onValueChange={setBusinessFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select Business" />
            </SelectTrigger>
            <SelectContent>
              {businesses.map(b => (
                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedCustomerIds.length > 0 && (
        <div className="flex items-center justify-between p-4 bg-primary/5 border border-primary/20 rounded-xl animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">{selectedCustomerIds.length} customers selected</span>
            <Button variant="ghost" size="sm" onClick={() => setSelectedCustomerIds([])} className="text-muted-foreground h-8">
              Clear
            </Button>
          </div>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              className="bg-green-600 hover:bg-green-700 h-8"
              onClick={() => setIsBulkActivateModalOpen(true)}
            >
              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
              Bulk Activate
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              className="text-destructive border-destructive/20 hover:bg-destructive/5 h-8"
              onClick={() => bulkStatusMutation.mutate({ ids: selectedCustomerIds, status: "INACTIVE" })}
              disabled={bulkStatusMutation.isPending}
            >
              <UserMinus className="h-3.5 w-3.5 mr-1.5" />
              Bulk Deactivate
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]">
                <Button variant="ghost" size="icon" onClick={handleSelectAll} className="h-8 w-8">
                  {selectedCustomerIds.length === filteredCustomers.length && filteredCustomers.length > 0 ? (
                    <CheckSquare className="h-4 w-4" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                </Button>
              </TableHead>
              <TableHead>Customer Name</TableHead>
              <TableHead>Phone Number</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Valid Until</TableHead>
              <TableHead>Last Check-In</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isCustomersLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : filteredCustomers.length > 0 ? (
              filteredCustomers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell>
                    <Checkbox 
                      checked={selectedCustomerIds.includes(customer.id)}
                      onCheckedChange={() => handleSelectCustomer(customer.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{customer.name}</TableCell>
                  <TableCell className="text-xs">{customer.phone}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        customer.subscriptionStatus === "ACTIVE"
                          ? "default"
                          : customer.subscriptionStatus === "PENDING"
                          ? "outline"
                          : "destructive"
                      }
                      className={cn(
                        "text-[10px] py-0",
                        customer.subscriptionStatus === "ACTIVE" && "bg-green-500 hover:bg-green-600"
                      )}
                    >
                      {customer.subscriptionStatus.toLowerCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">
                    {customer.activationExpiry 
                      ? format(new Date(customer.activationExpiry), "MMM d, yyyy")
                      : "Permanent"}
                  </TableCell>
                  <TableCell className="text-xs">
                    <div className="flex items-center gap-2">
                      {customer.lastCheckIn 
                        ? format(new Date(customer.lastCheckIn), "MMM d, HH:mm")
                        : "Never"}
                      {customer.lastCheckIn && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-destructive"
                          onClick={() => {
                            setCustomerToAction({ id: customer.id, name: customer.name });
                            setIsClearHistoryModalOpen(true);
                          }}
                          disabled={actionId === customer.id}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    {customer.subscriptionStatus !== "ACTIVE" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-[11px] text-green-600 border-green-200 hover:bg-green-50"
                        onClick={() => {
                          setActivationId(customer.id);
                          setIsActivateModalOpen(true);
                        }}
                      >
                        {customer.subscriptionStatus === "INACTIVE" ? "Renew" : "Activate"}
                      </Button>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-[11px] text-destructive border-destructive/20 hover:bg-destructive/5"
                          onClick={() => deactivateMutation.mutate(customer.id)}
                          disabled={actionId === customer.id}
                        >
                          Deactivate
                        </Button>
                      </>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => {
                        setCustomerToAction({ id: customer.id, name: customer.name });
                        setIsDeleteModalOpen(true);
                      }}
                      disabled={actionId === customer.id}
                    >
                      {actionId === customer.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  No customers found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Activate Modal */}
      <Dialog open={isActivateModalOpen} onOpenChange={setIsActivateModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Activate Customer</DialogTitle>
            <DialogDescription>
              Set an expiry date for this customer's membership. Leave empty for permanent access.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Expiry Date</Label>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setExpiryDate(addMonths(new Date(), 1))}>1 Month</Button>
                <Button variant="outline" size="sm" onClick={() => setExpiryDate(addMonths(new Date(), 3))}>3 Months</Button>
                <Button variant="outline" size="sm" onClick={() => setExpiryDate(undefined)}>Permanent</Button>
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal mt-2",
                      !expiryDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {expiryDate ? format(expiryDate, "PPP") : <span>No expiry date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={expiryDate}
                    onSelect={setExpiryDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsActivateModalOpen(false)}>Cancel</Button>
            <Button 
              onClick={() => activationId && activateMutation.mutate({ 
                id: activationId, 
                expiry: expiryDate?.toISOString() 
              })}
              disabled={activateMutation.isPending}
            >
              {activateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Activate Membership
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Activate Modal */}
      <Dialog open={isBulkActivateModalOpen} onOpenChange={setIsBulkActivateModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Bulk Activate Customers</DialogTitle>
            <DialogDescription>
              Activating {selectedCustomerIds.length} customers.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Expiry Date for All</Label>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setExpiryDate(addMonths(new Date(), 1))}>1 Month</Button>
                <Button variant="outline" size="sm" onClick={() => setExpiryDate(addMonths(new Date(), 3))}>3 Months</Button>
                <Button variant="outline" size="sm" onClick={() => setExpiryDate(undefined)}>Permanent</Button>
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal mt-2",
                      !expiryDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {expiryDate ? format(expiryDate, "PPP") : <span>No expiry date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={expiryDate}
                    onSelect={setExpiryDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBulkActivateModalOpen(false)}>Cancel</Button>
            <Button 
              onClick={() => bulkStatusMutation.mutate({ 
                ids: selectedCustomerIds, 
                status: "ACTIVE", 
                expiry: expiryDate?.toISOString() 
              })}
              disabled={bulkStatusMutation.isPending}
            >
              {bulkStatusMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Activate All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">Are you sure?</DialogTitle>
            <DialogDescription>
              This will permanently remove <strong>{customerToAction?.name}</strong> from your customer list. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
            <Button 
              variant="destructive"
              onClick={() => {
                if (customerToAction) {
                  deleteCustomerMutation.mutate(customerToAction.id);
                  setIsDeleteModalOpen(false);
                }
              }}
              disabled={deleteCustomerMutation.isPending}
            >
              {deleteCustomerMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Yes, Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clear History Confirmation Modal */}
      <Dialog open={isClearHistoryModalOpen} onOpenChange={setIsClearHistoryModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Clear Check-in History?</DialogTitle>
            <DialogDescription>
              This will delete all check-in logs for <strong>{customerToAction?.name}</strong>. The customer will remain in your list.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsClearHistoryModalOpen(false)}>Cancel</Button>
            <Button 
              variant="destructive"
              onClick={() => {
                if (customerToAction) {
                  clearHistoryMutation.mutate(customerToAction.id);
                  setIsClearHistoryModalOpen(false);
                }
              }}
              disabled={clearHistoryMutation.isPending}
            >
              {clearHistoryMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Clear History
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
