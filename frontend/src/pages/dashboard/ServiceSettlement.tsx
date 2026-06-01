import { useState, useEffect } from "react";
import { useCurrentUser } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Loader2, CheckCircle, AlertTriangle, Upload, MapPin } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";

type Staff = {
  id: string;
  name: string;
  role: string;
  commission: number; // percentage
};

type Service = {
  id: string;
  name: string;
};

type Receipt = {
  id: string;
  staffId: string;
  serviceId: string;
  amount: number;
  date: string;
  imageUrl?: string;
  staffName?: string;
  serviceName?: string;
};

const fmtNGN = (n: number) => `₦${n.toLocaleString()}`;

export default function ServiceSettlement() {
  const user = useCurrentUser();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStaff, setSelectedStaff] = useState<string>("");
  const [selectedService, setSelectedService] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [staffDialogOpen, setStaffDialogOpen] = useState(false);
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [newStaffName, setNewStaffName] = useState("");
  const [newStaffRole, setNewStaffRole] = useState("");
  const [newStaffCommission, setNewStaffCommission] = useState("");
  const [newServiceName, setNewServiceName] = useState("");

  const [selectedStaffForTransactions, setSelectedStaffForTransactions] = useState<Staff | null>(null);
  const [showTransactionsDialog, setShowTransactionsDialog] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const staffData: Staff[] = [
        { id: "1", name: "John Doe", role: "Waiter", commission: 10 },
        { id: "2", name: "Jane Smith", role: "Bartender", commission: 15 },
        { id: "3", name: "Bob Johnson", role: "Manager", commission: 20 },
      ];

      const servicesData: Service[] = [
        { id: "1", name: "Food Service" },
        { id: "2", name: "Drink Service" },
        { id: "3", name: "Cleaning Service" },
      ];

      const receiptsData: Receipt[] = [
        { 
          id: "1", 
          staffId: "1", 
          serviceId: "1", 
          amount: 5000, 
          date: "2026-05-20",
          imageUrl: "https://example.com/receipt1.jpg",
          staffName: "John Doe",
          serviceName: "Food Service"
        },
        { 
          id: "2", 
          staffId: "2", 
          serviceId: "2", 
          amount: 3000, 
          date: "2026-05-21",
          staffName: "Jane Smith",
          serviceName: "Drink Service"
        },
        { 
          id: "3", 
          staffId: "3", 
          serviceId: "3", 
          amount: 2000, 
          date: "2026-05-22",
          staffName: "Bob Johnson",
          serviceName: "Cleaning Service"
        }
      ];

      setStaff(staffData);
      setServices(servicesData);
      setReceipts(receiptsData);
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast({
        variant: "destructive",
        description: "Failed to load data. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const handleAddReceipt = () => {
    if (!selectedStaff || !selectedService || !amount || !date) {
      toast({
        variant: "destructive",
        description: "Please fill in all fields",
      });
      return;
    }

    const newReceipt: Receipt = {
      id: Date.now().toString(),
      staffId: selectedStaff,
      serviceId: selectedService,
      amount: parseFloat(amount),
      date,
      imageUrl: imageUrl || undefined,
      staffName: staff.find(s => s.id === selectedStaff)?.name,
      serviceName: services.find(s => s.id === selectedService)?.name
    };

    setReceipts(prev => [...prev, newReceipt]);

    setSelectedStaff("");
    setSelectedService("");
    setAmount("");
    setDate("");
    setImageUrl("");
    setDialogOpen(false);

    toast({
      description: "Receipt added successfully",
    });
  };

  const handleDeleteReceipt = async (id: string) => {
    setReceipts(prev => prev.filter(r => r.id !== id));

    toast({
      description: "Receipt deleted successfully",
    });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageUrl(URL.createObjectURL(file));
    }
  };

  const handleAddStaff = () => {
    if (!newStaffName || !newStaffRole || !newStaffCommission) {
      toast({
        variant: "destructive",
        description: "Please fill in all fields",
      });
      return;
    }

    const newStaff: Staff = {
      id: Date.now().toString(),
      name: newStaffName,
      role: newStaffRole,
      commission: parseFloat(newStaffCommission),
    };

    setStaff(prev => [...prev, newStaff]);
    setNewStaffName("");
    setNewStaffRole("");
    setNewStaffCommission("");
    setStaffDialogOpen(false);

    toast({
      description: "Staff member added successfully",
    });
  };

  const handleAddService = () => {
    if (!newServiceName) {
      toast({
        variant: "destructive",
        description: "Please fill in all fields",
      });
      return;
    }

    const newService: Service = {
      id: Date.now().toString(),
      name: newServiceName,
    };

    setServices(prev => [...prev, newService]);
    setNewServiceName("");
    setServiceDialogOpen(false);

    toast({
      description: "Service added successfully",
    });
  };

  const handleStaffClick = (staffMember: Staff) => {
    setSelectedStaffForTransactions(staffMember);
    setShowTransactionsDialog(true);
  };

  const staffTransactions = selectedStaffForTransactions 
    ? receipts.filter(r => r.staffId === selectedStaffForTransactions.id)
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 px-4 sm:px-0">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Service Settlement</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Manage staff services and track settlements
          </p>
        </div>
      </div>

      <Tabs defaultValue="staff" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="staff">Staff Settlement</TabsTrigger>
          <TabsTrigger value="services">Service</TabsTrigger>
        </TabsList>

        <TabsContent value="staff" className="mt-6">
          <div className="rounded-xl border bg-card p-4 sm:p-6 shadow-card overflow-hidden">
            <CardHeader className="px-0 pt-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <Dialog open={staffDialogOpen} onOpenChange={setStaffDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full sm:w-auto">
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
            </CardHeader>
            <CardContent className="px-0">
              {staff.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No staff members added yet</p>
              ) : (
                <div className="relative w-full overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[150px]">Name</TableHead>
                        <TableHead className="min-w-[120px]">Role</TableHead>
                        <TableHead className="min-w-[100px]">Commission (%)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {staff.map((s) => (
                        <TableRow 
                          key={s.id} 
                          className="cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => handleStaffClick(s)}
                        >
                          <TableCell className="font-medium">{s.name}</TableCell>
                          <TableCell>{s.role}</TableCell>
                          <TableCell>{s.commission}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </div>
        </TabsContent>

        <TabsContent value="services" className="mt-6">
          <div className="rounded-xl border bg-card p-4 sm:p-6 shadow-card overflow-hidden">
            <CardHeader className="px-0 pt-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <Dialog open={serviceDialogOpen} onOpenChange={setServiceDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full sm:w-auto">
                    Add Service
                  </Button>
                </DialogTrigger>
                <DialogContent className="h-auto max-h-[90vh] w-[95vw] sm:max-w-md overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Add New Service</DialogTitle>
                    <DialogDescription>
                      Add a new service to the system
                    </DialogDescription>
                  </DialogHeader>
                  <form className="space-y-4" onSubmit={(e) => {
                    e.preventDefault();
                    handleAddService();
                  }}>
                    <div className="space-y-2">
                      <label htmlFor="service-name" className="text-sm font-medium text-muted-foreground">
                        Service Name
                      </label>
                      <Input
                        id="service-name"
                        value={newServiceName}
                        onChange={(e) => setNewServiceName(e.target.value)}
                        placeholder="Enter service name"
                        required
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full bg-gradient-primary"
                      disabled={loading}
                    >
                      {loading ? "Adding..." : "Add Service"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="px-0">
              {services.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No services added yet</p>
              ) : (
                <div className="relative w-full overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[200px]">Service Name</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {services.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium">{s.name}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </div>
        </TabsContent>
      </Tabs>

      {/* Transactions Dialog */}
      <Dialog open={showTransactionsDialog} onOpenChange={setShowTransactionsDialog}>
        <DialogContent className="h-auto max-h-[90vh] w-[95vw] sm:max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">
              Transactions for {selectedStaffForTransactions?.name}
            </DialogTitle>
            <DialogDescription>
              View all settlements for this staff member
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            {staffTransactions.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No transactions found for this staff member</p>
            ) : (
              <div className="relative w-full overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[150px]">Service</TableHead>
                      <TableHead className="min-w-[100px]">Amount</TableHead>
                      <TableHead className="min-w-[120px]">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {staffTransactions.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.serviceName || 'Unknown'}</TableCell>
                        <TableCell>{fmtNGN(r.amount)}</TableCell>
                        <TableCell>{new Date(r.date).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Receipts Inventory */}
      <div className="rounded-xl border bg-card p-4 sm:p-6 shadow-card overflow-hidden">
        <CardHeader className="px-0 pt-0 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="text-lg sm:text-xl">Receipts Inventory</CardTitle>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto bg-gradient-primary shadow-elegant">
                  Add Receipt
                </Button>
              </DialogTrigger>
              <DialogContent className="h-auto max-h-[90vh] w-[95vw] sm:max-w-md overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New Receipt</DialogTitle>
                  <DialogDescription>
                    Record a new service settlement
                  </DialogDescription>
                </DialogHeader>
                <form className="space-y-4" onSubmit={(e) => {
                  e.preventDefault();
                  handleAddReceipt();
                }}>
                  <div className="space-y-2">
                    <label htmlFor="staff-select" className="text-sm font-medium text-muted-foreground">
                      Staff Member
                    </label>
                    <div className="w-full">
                      <Select
                        value={selectedStaff}
                        onValueChange={setSelectedStaff}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select staff member" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Staff</SelectItem>
                          {staff.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name} ({s.role})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label htmlFor="service-select" className="text-sm font-medium text-muted-foreground">
                      Service
                    </label>
                    <div className="w-full">
                      <Select
                        value={selectedService}
                        onValueChange={setSelectedService}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select service" />
                        </SelectTrigger>
                        <SelectContent>
                          {services.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label htmlFor="amount-input" className="text-sm font-medium text-muted-foreground">
                      Amount (₦)
                    </label>
                    <Input
                      id="amount-input"
                      type="number"
                      min="0"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="Enter amount"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label htmlFor="date-input" className="text-sm font-medium text-muted-foreground">
                      Date
                    </label>
                    <Input
                      id="date-input"
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label htmlFor="image-upload" className="text-sm font-medium text-muted-foreground">
                      Receipt Image (Optional)
                    </label>
                    <input
                      id="image-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="block w-full text-sm text-muted-foreground"
                    />
                    {imageUrl && (
                      <div className="mt-2">
                        <img 
                          src={imageUrl} 
                          alt="Preview" 
                          className="max-w-xs rounded border"
                        />
                      </div>
                    )}
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-primary"
                    disabled={loading}
                  >
                    {loading ? "Adding..." : "Add Receipt"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {receipts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No receipts recorded yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receipts.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.staffName || 'Unknown'}</TableCell>
                    <TableCell>{r.serviceName || 'Unknown'}</TableCell>
                    <TableCell>{fmtNGN(r.amount)}</TableCell>
                    <TableCell>{new Date(r.date).toLocaleDateString()}</TableCell>
                    <TableCell className="text-center">
                      <Button 
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteReceipt(r.id)}
                        aria-label="Delete receipt"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
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