import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Crown, Lock, CreditCard, Sparkles } from "lucide-react";
import { createBusiness, useCurrentUser } from "@/lib/store";
import { toast } from "@/hooks/use-toast";
import { getSubscriptionStatus, getSubscriptionPlans } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { initializeSubscriptionPayment, loadPaystackScript } from "@/lib/paystack";

const formatPlanName = (planType: string) => {
    const planMap: Record<string, string> = {
      "BASIC": "Basic Plan",
      "PREMIUM": "Premium Plan",
      "THREE_MONTHS": "3 Months",
      "SIX_MONTHS": "6 Months", 
      "NINE_MONTHS": "9 Months",
      "TWELVE_MONTHS": "12 Months"
    };
    return planMap[planType] || planType.replace(/_/g, " ");
  };

export default function NewBusiness() {
  const user = useCurrentUser();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "", website: "", googleBusinessUrl: "", allowTipping: false });
  const [subscriptionStatus, setSubscriptionStatus] = useState<any>(null);
  const [checkingSubscription, setCheckingSubscription] = useState(true);

  const [paymentLoading, setPaymentLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>("");
  const [showPayment, setShowPayment] = useState(false);

  // Fetch subscription plans
  const { data: plansData } = useQuery({
    queryKey: ["subscription-plans"],
    queryFn: async () => {
      const response = await getSubscriptionPlans();
      return response;
    },
    enabled: !subscriptionStatus?.hasActiveSubscription,
  });

  useEffect(() => {
    const checkSubscription = async () => {
      try {
        const status = await getSubscriptionStatus();
        setSubscriptionStatus(status);
      } catch (error) {
        console.error("Failed to check subscription status:", error);
      } finally {
        setCheckingSubscription(false);
      }
    };

    if (user) {
      checkSubscription();
    }
  }, [user]);

  const handlePlanSelection = (planType: string) => {
    setSelectedPlan(planType);
    setShowPayment(true);
  };

  const handlePayment = async () => {
    if (!user || !selectedPlan) return;
    
    setPaymentLoading(true);
    try {
      const plan = plansData?.plans.find((p: any) => p.type === selectedPlan);
      if (!plan) throw new Error("Plan not found");
      
      await loadPaystackScript();
      
      const { authorizationUrl, reference } = await initializeSubscriptionPayment(
        user.email, 
        plan.price, 
        selectedPlan
      );
      
      localStorage.setItem("pending_subscription_plan", selectedPlan);
      localStorage.setItem("pending_subscription_reference", reference);
      
      window.location.href = authorizationUrl;
    } catch (error: any) {
      toast({ 
        title: "Payment failed", 
        description: error.message || "Failed to initialize payment",
        variant: "destructive" 
      });
      setPaymentLoading(false);
    }
  };

  
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    
    // Clean up form data - remove empty optional fields
    const cleanedForm = {
      name: form.name,
      email: form.email || undefined,
      phone: form.phone,
      address: form.address,
      website: form.website || undefined,
      googleBusinessUrl: form.googleBusinessUrl || undefined,
      allowTipping: form.allowTipping,
    };
    
    console.log("Submitting cleaned form data:", cleanedForm);
    
    try {
      const biz = await createBusiness(cleanedForm);
      toast({ title: "Business created", description: biz.name });
      navigate(`/dashboard/businesses/${biz.id}`);
    } catch (err) {
      toast({ title: "Failed to create business", description: (err as Error).message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (checkingSubscription) {
    return (
      <div className="mx-auto max-w-xl">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Checking subscription status...</p>
        </div>
      </div>
    );
  }

  if (!subscriptionStatus?.hasActiveSubscription) {
    return (
      <div className="mx-auto max-w-xl">
        <h1 className="text-2xl font-bold tracking-tight">Add a business</h1>
        <p className="mt-1 text-sm text-muted-foreground">Each business gets its own QR code and wallet.</p>

        <Card className="mt-6">
          <CardContent className="p-8 text-center">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-6">
              <Crown className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold mb-3">Subscription Required</h3>
            <p className="text-gray-600 mb-8 max-w-sm mx-auto">
              You need an active subscription to create and manage businesses. 
              Choose a plan that fits your needs.
            </p>
            
            <div className="flex flex-col gap-3">
              <Button 
                size="lg"
                className="bg-gradient-primary shadow-elegant h-12 text-base font-semibold"
                onClick={() => navigate("/dashboard/subscriptions")}
              >
                <Sparkles className="h-5 w-5 mr-2" />
                Browse Subscription Plans
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => navigate(-1)}
                className="text-gray-500"
              >
                Back to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-bold tracking-tight">Add a business</h1>
      <p className="mt-1 text-sm text-muted-foreground">Each business gets its own QR code and wallet.</p>

      {subscriptionStatus?.subscription && subscriptionStatus.subscription.planType && (
        <Alert className="mt-4 bg-green-50 border-green-200">
          <Crown className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Active subscription: {formatPlanName(subscriptionStatus.subscription.planType)} 
            until {new Date(subscriptionStatus.subscription.endDate).toLocaleDateString()}
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={onSubmit} className="mt-6 space-y-5 rounded-2xl border bg-card p-6 shadow-card">
        <div className="space-y-2">
          <Label>Business name <span className="text-red-500">*</span></Label>
          <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Business email <span className="text-red-500">*</span></Label>
          <Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Business phone <span className="text-red-500">*</span></Label>
          <Input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Business address <span className="text-red-500">*</span></Label>
          <Textarea required value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Website (optional)</Label>
          <Input 
            type="url"
            value={form.website} 
            onChange={(e) => setForm({ ...form, website: e.target.value })} 
            placeholder="https://example.com"
          />
        </div>
        <div className="space-y-2">
          <Label>Google Business URL (optional)</Label>
          <Input 
            type="url"
            value={form.googleBusinessUrl} 
            onChange={(e) => setForm({ ...form, googleBusinessUrl: e.target.value })} 
            placeholder="https://g.page/..."
          />
        </div>
        <div className="flex items-center space-x-3 p-4 border rounded-lg bg-muted/30">
          <Switch
            id="allow-tipping"
            checked={form.allowTipping}
            onCheckedChange={(checked) => setForm({ ...form, allowTipping: checked })}
          />
          <div className="space-y-1">
            <Label htmlFor="allow-tipping" className="text-sm font-medium cursor-pointer">
              Allow customers to tip your team
            </Label>
            <p className="text-xs text-muted-foreground">
              When enabled, customers can tip individual team members
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => navigate(-1)}>Cancel</Button>
          
          <Button type="submit" disabled={loading} className="bg-gradient-primary shadow-elegant">
            {loading ? "Creating..." : "Create"}
          </Button>
        </div>
      </form>
    </div>
  );
}