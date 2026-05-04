import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, Crown, Calendar, CreditCard } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";

interface SubscriptionPlan {
  type: string;
  duration: number;
  price: number;
  priceNGN: number;
  description: string;
}

interface Subscription {
  id: string;
  planType: string;
  duration: number;
  price: number;
  status: string;
  startDate: string;
  endDate: string;
  paystackRef?: string;
  createdAt: string;
}

const Subscriptions = () => {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [selectedPlan, setSelectedPlan] = useState<string>("");
  const [verifyingPayment, setVerifyingPayment] = useState(false);

  // Handle payment verification when returning from Paystack
  useEffect(() => {
    const reference = searchParams.get('reference');
    const planType = localStorage.getItem('pending_subscription_plan');
    
    if (reference && planType) {
      verifySubscriptionPayment(reference, planType);
    }
  }, [searchParams]);

  const verifySubscriptionPayment = async (reference: string, planType: string) => {
    setVerifyingPayment(true);
    try {
      const response = await api.post<{ success: boolean; subscription?: any }>("/paystack/verify-subscription", {
        reference,
        planType
      });
      
      if (response.success) {
        toast.success('Payment verified! Subscription activated successfully.');
        // Clear pending subscription data
        localStorage.removeItem('pending_subscription_plan');
        localStorage.removeItem('pending_subscription');
        // Refresh subscription data
        queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
        queryClient.invalidateQueries({ queryKey: ["subscription-status"] });
      } else {
        toast.error('Payment verification failed. Please contact support.');
      }
    } catch (error) {
      console.error('Payment verification error:', error);
      toast.error('Failed to verify payment. Please try again.');
    } finally {
      setVerifyingPayment(false);
    }
  };

  const { data: plansData } = useQuery<{ plans: SubscriptionPlan[] }>({
    queryKey: ["subscription-plans"],
    queryFn: async (): Promise<{ plans: SubscriptionPlan[] }> => {
      const response = await api.get<{ plans: SubscriptionPlan[] }>("/subscriptions/plans");
      return response;
    },
  });

  const { data: statusData } = useQuery<{ hasActiveSubscription: boolean; subscription?: Subscription; canCreateBusiness: boolean }>({
    queryKey: ["subscription-status"],
    queryFn: async (): Promise<{ hasActiveSubscription: boolean; subscription?: Subscription; canCreateBusiness: boolean }> => {
      return api.get("/subscriptions/status");
    },
  });

  const { data: subscriptionsData } = useQuery<{ subscriptions: Subscription[] }>({
    queryKey: ["subscriptions"],
    queryFn: async (): Promise<{ subscriptions: Subscription[] }> => {
      const response = await api.get<{ subscriptions: Subscription[] }>("/subscriptions");
      return response;
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (subscriptionId: string) => {
      return api.patch<{ subscription: any }>(`/subscriptions/${subscriptionId}/cancel`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["subscription-status"] });
      toast.success("Subscription cancelled successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to cancel subscription");
    },
  });

  const handleSubscribe = async (planType: string) => {
    try {
      const selectedPlanData = plans.find(p => p.type === planType);
      if (!selectedPlanData) {
        toast.error("Invalid plan selected");
        return;
      }

      const user = JSON.parse(localStorage.getItem("ttt:user") || "{}");
      
      const { authorizationUrl, reference } = await api.post<{ authorizationUrl: string; reference: string }>(
        "/paystack/initialize-subscription",
        {
          email: user.email,
          amount: String(selectedPlanData.price),
          planType,
        }
      );

      localStorage.setItem("pending_subscription_plan", planType);
      localStorage.setItem("pending_subscription_reference", reference);
      
      window.location.href = authorizationUrl;
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to initialize payment");
    }
  };

  const plans: SubscriptionPlan[] = plansData?.plans || [];
  const hasActiveSubscription = statusData?.hasActiveSubscription || false;
  const activeSubscription = statusData?.subscription;
  const subscriptions: Subscription[] = subscriptionsData?.subscriptions || [];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-100 text-green-800";
      case "EXPIRED":
        return "bg-red-100 text-red-800";
      case "CANCELLED":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Subscriptions</h1>
        <p className="text-muted-foreground">Manage your subscription plans and view payment history</p>
      </div>

      {verifyingPayment && (
        <Alert className="mb-6">
          <CreditCard className="h-4 w-4" />
          <AlertDescription>
            Verifying your payment... This may take a few moments.
          </AlertDescription>
        </Alert>
      )}

      {hasActiveSubscription && activeSubscription && (
        <Alert className="bg-green-50 border-green-200">
          <Crown className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            You have an active {activeSubscription.planType.replace("_", " ")} subscription 
            valid until {formatDate(activeSubscription.endDate)}.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="plans" className="space-y-4">
        <TabsList>
          <TabsTrigger value="plans">Available Plans</TabsTrigger>
          <TabsTrigger value="history">Subscription History</TabsTrigger>
        </TabsList>

        <TabsContent value="plans" className="space-y-4">
          {!hasActiveSubscription && (
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Select Subscription Plan</label>
                    <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Choose a plan that works for you" />
                      </SelectTrigger>
                      <SelectContent>
                        {plans.map((plan) => (
                          <SelectItem key={plan.type} value={plan.type}>
                            <div className="flex items-center justify-between w-full">
                              <span>{plan.type.replace("MONTHS", " MONTHS").replace("THREE", "3").replace("SIX", "6").replace("NINE", "9").replace("TWELVE", "12")}</span>
                              <span className="text-muted-foreground">₦{plan.priceNGN.toLocaleString()}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {selectedPlan && (
                    <div className="bg-muted/50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">
                          {plans.find(p => p.type === selectedPlan)?.type.replace("MONTHS", " MONTHS").replace("THREE", "3").replace("SIX", "6").replace("NINE", "9").replace("TWELVE", "12")}
                        </span>
                        <span className="font-bold">
                          ₦{plans.find(p => p.type === selectedPlan)?.priceNGN.toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {plans.find(p => p.type === selectedPlan)?.duration} months • 
                        ₦{Math.round((plans.find(p => p.type === selectedPlan)?.priceNGN || 0) / (plans.find(p => p.type === selectedPlan)?.duration || 1))}/month
                      </p>
                    </div>
                  )}
                  
                  <Button 
                    className="w-full"
                    disabled={!selectedPlan || hasActiveSubscription}
                    onClick={() => handleSubscribe(selectedPlan)}
                  >
                    {hasActiveSubscription ? "Already Active" : "Continue to Payment"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          
          {hasActiveSubscription && (
            <Alert>
              <Crown className="h-4 w-4" />
              <AlertDescription>
                You currently have an active subscription. Manage your subscription in the history tab.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {subscriptions.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No subscriptions yet</h3>
                <p className="text-muted-foreground">
                  Subscribe to a plan to start creating businesses
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {subscriptions.map((subscription) => (
                <Card key={subscription.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold">
                            {subscription.planType.replace("_", " ")}
                          </h3>
                          <Badge className={getStatusColor(subscription.status)}>
                            {subscription.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {formatDate(subscription.startDate)} - {formatDate(subscription.endDate)}
                          </div>
                          <div>₦{(subscription.price / 100).toLocaleString()}</div>
                        </div>
                      </div>
                      
                      {subscription.status === "ACTIVE" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => cancelMutation.mutate(subscription.id)}
                          disabled={cancelMutation.isPending}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Subscriptions;
