import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, Crown, Calendar, CreditCard, Sparkles, Zap, Shield, Star, TrendingUp, Clock, X } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

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
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>("");

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
      const data = await api.post<{ success: boolean; subscription?: any; message?: string }>('/paystack/verify-subscription', {
        reference,
        planType
      });

      if (data.success) {
        toast.success('Payment verified! Subscription activated successfully.');
        localStorage.removeItem('pending_subscription_plan');
        localStorage.removeItem('pending_subscription_reference');
        queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
        queryClient.invalidateQueries({ queryKey: ["subscription-status"] });
      } else {
        toast.error(data.message || 'Payment verification failed. Please contact support.');
      }
    } catch (error: any) {
      console.error('Payment verification error:', error);
      toast.error(error.response?.data?.error || 'Failed to verify payment. Please try again.');
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

  const formatPlanName = (planType: string) => {
    const planMap: Record<string, string> = {
      "THREE_MONTHS": "3 Months",
      "SIX_MONTHS": "6 Months", 
      "NINE_MONTHS": "9 Months",
      "TWELVE_MONTHS": "12 Months"
    };
    return planMap[planType] || planType.replace(/_/g, " ");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Header Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent mb-4">
            Premium Subscriptions
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Unlock powerful features and grow your business with our flexible subscription plans
          </p>
        </div>

      {verifyingPayment && (
        <div className="mb-8 animate-in slide-in-from-top-2 duration-300">
          <Alert className="border-blue-200 bg-blue-50/50 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <div className="animate-spin">
                <CreditCard className="h-4 w-4 text-blue-600" />
              </div>
              <AlertDescription className="text-blue-800 font-medium">
                Verifying your payment... This may take a few moments.
              </AlertDescription>
            </div>
          </Alert>
        </div>
      )}

      {hasActiveSubscription && activeSubscription && (
        <div className="mb-8 animate-in slide-in-from-top-2 duration-300">
          <Card className="border-green-200 bg-gradient-to-r from-green-50/50 to-emerald-50/50 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-full">
                  <Crown className="w-6 h-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-green-900 mb-1">Active Subscription</h3>
                  <p className="text-green-700">
                    Your <span className="font-medium">{formatPlanName(activeSubscription.planType)}</span> plan is active until 
                    <span className="font-medium"> {formatDate(activeSubscription.endDate)}</span>
                  </p>
                </div>
                <Badge className="bg-green-100 text-green-800 border-green-200">
                  <Check className="w-3 h-3 mr-1" />
                  Active
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="plans" className="space-y-8">
        <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 bg-gray-100/50 p-1 rounded-xl">
          <TabsTrigger value="plans" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Sparkles className="w-4 h-4 mr-2" />
            Available Plans
          </TabsTrigger>
          <TabsTrigger value="history" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Clock className="w-4 h-4 mr-2" />
            Subscription History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="plans" className="space-y-8">
          {!hasActiveSubscription ? (
            <div className="space-y-8">
              {/* Plan Selection */}
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose Your Perfect Plan</h2>
                <p className="text-gray-600">Select the duration that works best for your business needs</p>
              </div>
              
              {/* Plan Cards */}
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {plans.map((plan, index) => {
                  const isSelected = selectedPlan === plan.type;
                  const monthlyPrice = Math.round(plan.priceNGN / plan.duration);
                  const isPopular = index === 1; // Make second plan popular
                  
                  return (
                    <Card
                      key={plan.type}
                      className={cn(
                        "relative cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1",
                        isSelected ? "ring-2 ring-blue-500 shadow-lg" : "border-gray-200",
                        isPopular && "border-blue-200 shadow-md"
                      )}
                      onClick={() => setSelectedPlan(plan.type)}
                    >
                      {isPopular && (
                        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                          <Badge className="bg-blue-500 text-white px-3 py-1">
                            <Star className="w-3 h-3 mr-1" />
                            Popular
                          </Badge>
                        </div>
                      )}
                      <CardHeader className="text-center pb-4">
                        <div className="flex justify-center mb-2">
                          <div className={cn(
                            "w-12 h-12 rounded-full flex items-center justify-center",
                            isSelected ? "bg-blue-100" : "bg-gray-100"
                          )}>
                            {plan.duration <= 3 ? (
                              <Zap className={cn("w-6 h-6", isSelected ? "text-blue-600" : "text-gray-600")} />
                            ) : plan.duration <= 6 ? (
                              <TrendingUp className={cn("w-6 h-6", isSelected ? "text-blue-600" : "text-gray-600")} />
                            ) : (
                              <Shield className={cn("w-6 h-6", isSelected ? "text-blue-600" : "text-gray-600")} />
                            )}
                          </div>
                        </div>
                        <CardTitle className="text-lg">{formatPlanName(plan.type)}</CardTitle>
                        <div className="space-y-1">
                          <div className="text-3xl font-bold text-gray-900">
                            ₦{plan.priceNGN.toLocaleString()}
                          </div>
                          <div className="text-sm text-gray-500">
                            ₦{monthlyPrice.toLocaleString()}/month
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-2 mb-4">
                          <div className="flex items-center text-sm text-gray-600">
                            <Check className="w-4 h-4 text-green-500 mr-2" />
                            {plan.duration} months access
                          </div>
                          <div className="flex items-center text-sm text-gray-600">
                            <Check className="w-4 h-4 text-green-500 mr-2" />
                            Premium features
                          </div>
                          <div className="flex items-center text-sm text-gray-600">
                            <Check className="w-4 h-4 text-green-500 mr-2" />
                            Priority support
                          </div>
                        </div>
                        <Button
                          className={cn(
                            "w-full",
                            isSelected ? "bg-blue-600 hover:bg-blue-700" : ""
                          )}
                          variant={isSelected ? "default" : "outline"}
                        >
                          {isSelected ? "Selected" : "Select Plan"}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              
              {/* Selected Plan Summary */}
              {selectedPlan && (
                <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 animate-in slide-in-from-bottom-2 duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-lg text-gray-900 mb-1">
                          Selected: {formatPlanName(selectedPlan)}
                        </h3>
                        <p className="text-gray-600">
                          {plans.find(p => p.type === selectedPlan)?.duration} months • 
                          ₦{Math.round((plans.find(p => p.type === selectedPlan)?.priceNGN || 0) / (plans.find(p => p.type === selectedPlan)?.duration || 1))}/month
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900">
                          ₦{plans.find(p => p.type === selectedPlan)?.priceNGN.toLocaleString()}
                        </div>
                        <p className="text-sm text-gray-500">Total price</p>
                      </div>
                    </div>
                    <Button 
                      className="w-full mt-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                      size="lg"
                      onClick={() => handleSubscribe(selectedPlan)}
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      Continue to Payment
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card className="border-green-200 bg-gradient-to-r from-green-50/50 to-emerald-50/50">
              <CardContent className="text-center py-12">
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                    <Crown className="w-8 h-8 text-green-600" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-green-900 mb-2">Premium Plan Active</h3>
                <p className="text-green-700 mb-6">
                  You currently have an active subscription. Manage your subscription in the history tab.
                </p>
                <Button variant="outline" className="border-green-200 text-green-700 hover:bg-green-50">
                  View Subscription Details
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-8">
          {subscriptions.length === 0 ? (
            <Card className="border-gray-200">
              <CardContent className="text-center py-16">
                <div className="flex justify-center mb-6">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
                    <Clock className="w-10 h-10 text-gray-400" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">No Subscription History</h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  Subscribe to a plan to start creating businesses and track your subscription history here.
                </p>
                <Button 
                  onClick={() => {
                    const tabsElement = document.querySelector('[data-value="plans"]');
                    if (tabsElement) (tabsElement as HTMLElement).click();
                  }}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Browse Plans
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Subscription History</h2>
                <p className="text-gray-600">Track all your past and current subscriptions</p>
              </div>
              
              <div className="space-y-4">
                {subscriptions.map((subscription, index) => (
                  <Card 
                    key={subscription.id} 
                    className={cn(
                      "transition-all duration-300 hover:shadow-md",
                      subscription.status === "ACTIVE" ? "border-green-200 bg-gradient-to-r from-green-50/50 to-emerald-50/50" : "border-gray-200"
                    )}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-start gap-4">
                          <div className={cn(
                            "w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0",
                            subscription.status === "ACTIVE" ? "bg-green-100" : 
                            subscription.status === "EXPIRED" ? "bg-red-100" : "bg-gray-100"
                          )}>
                            {subscription.status === "ACTIVE" ? (
                              <Crown className="w-6 h-6 text-green-600" />
                            ) : subscription.status === "EXPIRED" ? (
                              <X className="w-6 h-6 text-red-600" />
                            ) : (
                              <Clock className="w-6 h-6 text-gray-600" />
                            )}
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-3">
                              <h3 className="font-semibold text-lg text-gray-900">
                                {formatPlanName(subscription.planType)}
                              </h3>
                              <Badge 
                                className={cn(
                                  "px-3 py-1",
                                  subscription.status === "ACTIVE" ? "bg-green-100 text-green-800 border-green-200" :
                                  subscription.status === "EXPIRED" ? "bg-red-100 text-red-800 border-red-200" :
                                  "bg-gray-100 text-gray-800 border-gray-200"
                                )}
                              >
                                {subscription.status === "ACTIVE" && <Check className="w-3 h-3 mr-1" />}
                                {subscription.status}
                              </Badge>
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Calendar className="h-4 w-4" />
                                <span>
                                  {formatDate(subscription.startDate)} - {formatDate(subscription.endDate)}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <CreditCard className="h-4 w-4" />
                                <span>₦{(subscription.price / 100).toLocaleString()}</span>
                                <span className="text-gray-400">•</span>
                                <span>
                                  ₦{Math.round((subscription.price / 100) / subscription.duration).toLocaleString()}/month
                                </span>
                              </div>
                              {subscription.paystackRef && (
                                <div className="text-xs text-gray-500">
                                  Ref: {subscription.paystackRef}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-col items-end gap-2">
                          {subscription.status === "ACTIVE" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 border-red-200 hover:bg-red-50"
                              onClick={() => cancelMutation.mutate(subscription.id)}
                              disabled={cancelMutation.isPending}
                            >
                              {cancelMutation.isPending ? "Cancelling..." : "Cancel"}
                            </Button>
                          )}
                          <div className="text-xs text-gray-500">
                            Created {formatDate(subscription.createdAt)}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      {/* Footer */}
      <div className="mt-16 text-center text-sm text-gray-500">
        <p>Need help? Contact our support team for assistance with your subscription.</p>
      </div>
      </div>
    </div>
  );
};

export default Subscriptions;
