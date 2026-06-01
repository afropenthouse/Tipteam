import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, FileText, CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { settlementApi, getPublicBusiness, type Staff, type Service } from "@/lib/api";

export default function PublicSettlementForm() {
  const { businessId } = useParams();
  const navigate = useNavigate();
  const [business, setBusiness] = useState<any>(null);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Form state
  const [selectedStaff, setSelectedStaff] = useState("");
  const [selectedService, setSelectedService] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (!businessId) return;

    const fetchData = async () => {
      try {
        const [bizData, staffData, servicesData] = await Promise.all([
          getPublicBusiness(businessId),
          settlementApi.getPublicStaff(businessId),
          settlementApi.getPublicServices(businessId)
        ]);
        setBusiness(bizData);
        setStaff(staffData);
        setServices(servicesData);
      } catch (error) {
        console.error("Failed to fetch data:", error);
        toast({
          variant: "destructive",
          description: "Could not load business details.",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [businessId]);

  const handleServiceChange = (serviceId: string) => {
    setSelectedService(serviceId);
    const service = services.find(s => s.id === serviceId);
    if (service) {
      setAmount(service.amount.toString());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff || !selectedService || !amount || !date || !businessId) {
      toast({
        variant: "destructive",
        description: "Please fill in all required fields.",
      });
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("staffId", selectedStaff);
      formData.append("serviceId", selectedService);
      formData.append("amount", amount);
      formData.append("date", date);
      if (file) {
        formData.append("receipt", file);
      }
      
      await settlementApi.submitPublicReceipt(businessId, formData);
      setSubmitted(true);
    } catch (error) {
      toast({
        variant: "destructive",
        description: "Failed to submit settlement.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-10 pb-10">
            <div className="mb-6 flex justify-center">
              <div className="rounded-full bg-green-100 p-3">
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              </div>
            </div>
            <h2 className="text-2xl font-bold mb-2">Submission Successful!</h2>
            <p className="text-muted-foreground mb-8">
              Your settlement record has been submitted to {business?.name}.
            </p>
            <Button 
              className="w-full bg-gradient-primary" 
              onClick={() => setSubmitted(false)}
            >
              Submit Another
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 py-12 px-4">
      <div className="mx-auto max-w-lg">
        <div className="mb-8 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{business?.name}</h1>
            <p className="text-sm text-muted-foreground">Submit a service settlement record</p>
          </div>
          {business?.website && (
            <div className="ml-auto">
              <Button asChild variant="outline" size="sm">
                <a 
                  href={business.website.startsWith('http') ? business.website : `https://${business.website}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  Website
                </a>
              </Button>
            </div>
          )}
        </div>

        <Card className="border-none shadow-elegant">
          <CardHeader>
            <CardTitle>Settlement Details</CardTitle>
            <CardDescription>
              Fill in the details below to record your service.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Staff Member</label>
                <Select value={selectedStaff} onValueChange={setSelectedStaff} required>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Who performed the service?" />
                  </SelectTrigger>
                  <SelectContent>
                    {staff.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} ({s.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Select Service</label>
                <Select value={selectedService} onValueChange={handleServiceChange} required>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="What service was provided?" />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} (₦{s.amount.toLocaleString()})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Upload Receipt Image</label>
                <div className="relative">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="h-12 pr-10 opacity-0 absolute inset-0 z-10 cursor-pointer"
                  />
                  <div className="h-12 flex items-center justify-between px-4 border rounded-md bg-white">
                    <span className="text-sm text-muted-foreground truncate">
                      {file ? file.name : "Select image receipt"}
                    </span>
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground">Max size: 10MB. Image formats only.</p>
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 bg-gradient-primary shadow-elegant" 
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Settlement"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="mt-8 text-center">
          <p className="text-xs text-muted-foreground">
            Powered by Tracla &copy; 2026
          </p>
        </div>
      </div>
    </div>
  );
}
