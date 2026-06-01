import { useState, useEffect } from "react";
import { useCurrentUser } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Loader2, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { settlementApi, type Service, listBusinesses } from "@/lib/api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ServicesPage({ hideHeader = false }: { hideHeader?: boolean }) {
  const user = useCurrentUser();
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>("");
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [newServiceName, setNewServiceName] = useState("");
  const [newServiceAmount, setNewServiceAmount] = useState("");

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

  const fetchData = async () => {
    if (!selectedBusinessId) return;
    setLoading(true);
    try {
      const servicesData = await settlementApi.getServices(selectedBusinessId);
      setServices(servicesData);
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
    if (selectedBusinessId) {
      fetchData();
    }
  }, [selectedBusinessId]);

  const handleAddService = async () => {
    if (!newServiceName || !newServiceAmount || !selectedBusinessId) {
      toast({
        variant: "destructive",
        description: "Please fill in all fields",
      });
      return;
    }

    try {
      const newService = await settlementApi.addService(selectedBusinessId, {
        name: newServiceName,
        amount: parseFloat(newServiceAmount),
      });
      setServices(prev => [newService, ...prev]);
      setNewServiceName("");
      setNewServiceAmount("");
      setServiceDialogOpen(false);
      toast({ description: "Service added successfully" });
    } catch (error) {
      toast({ variant: "destructive", description: "Failed to add service" });
    }
  };

  const handleDeleteService = async (id: string) => {
    if (!confirm("Are you sure you want to delete this service?")) return;
    try {
      await settlementApi.deleteService(id);
      setServices(prev => prev.filter(s => s.id !== id));
      toast({ description: "Service deleted" });
    } catch (error) {
      toast({ variant: "destructive", description: "Failed to delete service" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 px-4 sm:px-0">
      {!hideHeader && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Services</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Manage the services offered by your staff
            </p>
          </div>
          
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
        </div>
      )}

      {hideHeader && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-4">
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
      )}

      <div className="rounded-xl border bg-card p-4 sm:p-6 shadow-card overflow-hidden">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-0 pt-0 pb-6">
          <CardTitle className="text-lg sm:text-xl">Available Services</CardTitle>
          <Dialog open={serviceDialogOpen} onOpenChange={setServiceDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto bg-gradient-primary shadow-elegant">
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
                <div className="space-y-2">
                  <label htmlFor="service-amount" className="text-sm font-medium text-muted-foreground">
                    Amount (₦)
                  </label>
                  <Input
                    id="service-amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={newServiceAmount}
                    onChange={(e) => setNewServiceAmount(e.target.value)}
                    placeholder="Enter amount"
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
            <p className="text-sm text-muted-foreground">No services added yet</p>
          ) : (
            <div className="relative w-full overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[150px]">Service Name</TableHead>
                    <TableHead className="min-w-[100px]">Amount</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {services.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell>₦{s.amount.toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDeleteService(s.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </div>
    </div>
  );
}
