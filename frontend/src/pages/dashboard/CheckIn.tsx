import { useState } from "react";
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
import { Search, UserPlus, CheckCircle2, UserCheck, Loader2, Plus, Trash2, Upload, FileDown, FileSpreadsheet, ClipboardPaste } from "lucide-react";
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
import { format } from "date-fns";

export default function CheckIn() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedBusinessId, setSelectedBusinessId] = useState("");
  const [customerRows, setCustomerRows] = useState([{ name: "", phone: "" }]);
  const [actionId, setActionId] = useState<string | null>(null);
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  
  const queryClient = useQueryClient();

  const { data: customers = [], isLoading: isCustomersLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: checkInApi.getCustomers,
  });

  const { data: businesses = [] } = useQuery({
    queryKey: ["businesses"],
    queryFn: listBusinesses,
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => {
      setActionId(id);
      return checkInApi.activateCustomer(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast({ title: "Customer activated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to activate customer", description: error.message, variant: "destructive" });
    },
    onSettled: () => setActionId(null)
  });

  const checkInMutation = useMutation({
    mutationFn: (id: string) => {
      setActionId(id);
      return checkInApi.recordCheckIn(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast({ title: "Check-in recorded successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to record check-in", description: error.message, variant: "destructive" });
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

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm)
  );

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
      customers: validCustomers
    });
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
                
                {customerRows.length > 5 && (
                  <div className="flex items-center gap-2 p-2 bg-blue-50 text-blue-700 rounded text-xs">
                    <FileSpreadsheet className="h-4 w-4" />
                    <span>{customerRows.length} customers ready to be added</span>
                  </div>
                )}
                
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

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search customers..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer Name</TableHead>
              <TableHead>Phone Number</TableHead>
              <TableHead>Subscription Status</TableHead>
              <TableHead>Last Check-In</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isCustomersLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : filteredCustomers.length > 0 ? (
              filteredCustomers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium">{customer.name}</TableCell>
                  <TableCell>{customer.phone}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        customer.subscriptionStatus === "ACTIVE"
                          ? "default"
                          : customer.subscriptionStatus === "PENDING"
                          ? "outline"
                          : "destructive"
                      }
                      className={
                        customer.subscriptionStatus === "ACTIVE"
                          ? "bg-green-500 hover:bg-green-600"
                          : ""
                      }
                    >
                      {customer.subscriptionStatus.toLowerCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {customer.lastCheckIn 
                      ? format(new Date(customer.lastCheckIn), "MMM d, yyyy HH:mm")
                      : "Never"}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    {customer.subscriptionStatus !== "ACTIVE" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700"
                        onClick={() => activateMutation.mutate(customer.id)}
                        disabled={actionId === customer.id}
                      >
                        {actionId === customer.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                        )}
                        Activate
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                        onClick={() => checkInMutation.mutate(customer.id)}
                        disabled={actionId === customer.id}
                      >
                        {actionId === customer.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <UserCheck className="mr-2 h-4 w-4" />
                        )}
                        Check In
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No customers found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
