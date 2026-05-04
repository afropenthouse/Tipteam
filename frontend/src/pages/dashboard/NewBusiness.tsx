import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Crown, Lock, CreditCard } from "lucide-react";
import { createBusiness, useCurrentUser } from "@/lib/store";
import { toast } from "@/hooks/use-toast";
import { getSubscriptionStatus, getSubscriptionPlans } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { initializeSubscriptionPayment, loadPaystackScript } from "@/lib/paystack";

export default function NewBusiness() {
  const user = useCurrentUser();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "" });
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
      
      // Load Paystack script
      await loadPaystackScript();
      
      // Initialize subscription payment
      const { authorizationUrl, reference } = await initializeSubscriptionPayment(
        user.email, 
        plan.price, 
        selectedPlan
      );
      
      // Store plan info for after payment
      localStorage.setItem("pending_subscription", JSON.stringify({
        planType: selectedPlan,
        reference,
        businessForm: form
      }));
      localStorage.setItem("pending_subscription_plan", selectedPlan);
      
      // Redirect to Paystack payment page
      window.location.href = authorizationUrl;
    } catch (error) {
      toast({ 
        title: "Payment failed", 
        description: (error as Error).message, 
        variant: "destructive" 
      });
      setPaymentLoading(false);
    }
  };

  
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      const biz = await createBusiness(form);
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
          <CardContent className="p-6">
            <div className="space-y-6">
              <div className="text-center">
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <Crown className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Choose Your Plan</h3>
                  <p className="text-sm text-muted-foreground">
                    Select a subscription plan to start creating businesses
                  </p>
                </div>
              </div>
              
              {plansData?.plans && (
                <RadioGroup value={selectedPlan} onValueChange={handlePlanSelection}>
                  <div className="space-y-3">
                    {plansData.plans.map((plan: any) => (
                      <div key={plan.type} className="flex items-center space-x-3 rounded-lg border p-4 hover:bg-muted/50 cursor-pointer">
                        <RadioGroupItem value={plan.type} id={plan.type} />
                        <div className="flex-1">
                          <label htmlFor={plan.type} className="flex items-center justify-between cursor-pointer">
                            <div>
                              <div className="font-medium">{plan.type.replace("MONTHS", " MONTHS").replace("THREE", "3").replace("SIX", "6").replace("NINE", "9").replace("TWELVE", "12")}</div>
                              <div className="text-sm text-muted-foreground">{plan.duration} months</div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold">₦{plan.priceNGN.toLocaleString()}</div>
                              <div className="text-sm text-muted-foreground">₦{(plan.priceNGN / plan.duration).toLocaleString()}/month</div>
                            </div>
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              )}
              
              {selectedPlan && (
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">
                      {plansData?.plans.find((p: any) => p.type === selectedPlan)?.type.replace("MONTHS", " MONTHS").replace("THREE", "3").replace("SIX", "6").replace("NINE", "9").replace("TWELVE", "12")}
                    </span>
                    <span className="font-bold">
                      ₦{plansData?.plans.find((p: any) => p.type === selectedPlan)?.priceNGN.toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    One-time payment for {plansData?.plans.find((p: any) => p.type === selectedPlan)?.duration} months access
                  </p>
                  
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => navigate(-1)}
                      className="flex-1"
                    >
                      Back
                    </Button>
                    <Button 
                      className="flex-1"
                      onClick={handlePayment}
                      disabled={paymentLoading}
                    >
                      {paymentLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Processing...
                        </>
                      ) : (
                        <>
                          <CreditCard className="h-4 w-4 mr-2" />
                          Pay Now
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
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
            Active subscription: {subscriptionStatus.subscription.planType.replace("MONTHS", " MONTHS").replace("THREE", "3").replace("SIX", "6").replace("NINE", "9").replace("TWELVE", "12")} 
            until {new Date(subscriptionStatus.subscription.endDate).toLocaleDateString()}
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={onSubmit} className="mt-6 space-y-5 rounded-2xl border bg-card p-6 shadow-card">
        <div className="space-y-2">
          <Label>Business name</Label>
          <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Business email</Label>
          <Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Business phone</Label>
          <Input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Business address</Label>
          <Textarea required value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
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