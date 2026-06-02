import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, XCircle, Loader2, ArrowLeft, Building2, UserCheck } from "lucide-react";
import { checkInApi, getPublicBusiness, type Business } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

export default function PublicCheckIn() {
  const { businessId } = useParams<{ businessId: string }>();
  const navigate = useNavigate();
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; customerName?: string } | null>(null);

  useEffect(() => {
    if (!businessId) return;

    getPublicBusiness(businessId)
      .then((biz) => {
        setBusiness(biz || null);
      })
      .catch((err) => {
        console.error("Failed to fetch business:", err);
        toast({ title: "Business not found", variant: "destructive" });
      })
      .finally(() => setLoading(false));
  }, [businessId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId || (!name.trim() && !phone.trim())) return;

    setIsSubmitting(true);
    try {
      const res = await checkInApi.publicCheckIn(businessId, name.trim(), phone.trim());
      setResult(res);
    } catch (error: any) {
      setResult({
        success: false,
        message: error.message || "An error occurred during check-in."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 bg-muted/30">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!business || !business.allowCheckin) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 bg-muted/30">
        <Card className="w-full max-w-md shadow-elegant border-none">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-2">
              <XCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle>Check-in Unavailable</CardTitle>
            <CardDescription>
              This business does not have check-in enabled or could not be found.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button variant="outline" onClick={() => navigate("/")}>
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-b from-blue-50 to-white">
      <Card className="w-full max-w-md shadow-elegant border-none overflow-hidden">
        <div className="bg-gradient-primary h-1.5 w-full" />
        <CardHeader className="text-center pb-0 pt-6 relative">
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute left-2 top-2 text-muted-foreground"
            onClick={() => navigate(`/rate/${businessId}`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-3 border-2 border-primary/20">
            <Building2 className="h-7 w-7 text-primary" />
          </div>
          <CardTitle className="text-xl">{business.name}</CardTitle>
          <CardDescription className="text-xs">Check-in System</CardDescription>
        </CardHeader>

        <CardContent className="pt-4 pb-6">
          {!result ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-sm font-medium">Full Name</Label>
                <Input
                  id="name"
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-11 text-base border-primary/15 focus-visible:ring-primary/30"
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-sm font-medium">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="Enter your phone number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-11 text-base border-primary/15 focus-visible:ring-primary/30"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full h-11 text-base bg-gradient-primary shadow-elegant font-bold"
                disabled={isSubmitting || (!name.trim() && !phone.trim())}
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <UserCheck className="h-4 w-4 mr-2" />
                )}
                CHECK IN
              </Button>
            </form>
          ) : (
            <div className="text-center py-4 animate-in zoom-in-95 duration-300">
              <div className={cn(
                "mx-auto w-24 h-24 rounded-full flex items-center justify-center mb-6 shadow-lg",
                result.success ? "bg-green-100 border-2 border-green-200" : "bg-red-100 border-2 border-red-200"
              )}>
                {result.success ? (
                  <CheckCircle2 className="h-16 w-16 text-green-600" />
                ) : (
                  <XCircle className="h-16 w-16 text-red-600" />
                )}
              </div>
              
              <h3 className={cn(
                "text-2xl font-black mb-1",
                result.success ? "text-green-700" : "text-red-700"
              )}>
                {result.success ? "Checked In" : "Denied"}
              </h3>
              
              <div className="text-xl font-black text-gray-900 mb-8">
                {result.success ? (
                  result.customerName || "Member"
                ) : (
                  <p className="text-sm font-normal text-muted-foreground">{result.message}</p>
                )}
              </div>

              <Button 
                variant="outline" 
                className="w-full h-12 text-lg font-bold shadow-sm"
                onClick={() => {
                  setResult(null);
                  setName("");
                  setPhone("");
                }}
              >
                {result.success ? "Done" : "Try Again"}
              </Button>
            </div>
          )}
        </CardContent>
        
        <div className="bg-muted/30 py-2.5 text-center border-t">
          <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">
            Powered by Tracla
          </p>
        </div>
      </Card>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}
