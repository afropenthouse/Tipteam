import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Check, Crown, Calendar, CreditCard, Sparkles, Clock, X } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { format, addMonths } from "date-fns";

interface SubscriptionPlan {
  type: string;
  name: string;
  pricePerMonth: number;
  pricePerMonthNGN: number;
  description: string;
  durations: number[];
}

interface Subscription {
  id: string;
  planType: string;
  startDate: string;
  endDate: string;
  status: string;
  price: number;
  duration: number;
  paystackRef?: string;
  createdAt: string;
}

const Subscriptions = () => {
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>("");
  const [selectedDuration, setSelectedDuration] = useState<number>(3);
  const [isDurationModalOpen, setIsDurationModalOpen] = useState(false);

  // Handle payment verification when returning from Paystack
  useEffect(() => {
    const reference = searchParams.get('reference');
    const planType = localStorage.getItem('pending_subscription_plan');
    const duration = localStorage.getItem('pending_subscription_duration');
    
    if (reference && planType) {
      verifySubscriptionPayment(reference, planType, duration ? parseInt(duration) : undefined);
    }
  }, [searchParams]);

  const verifySubscriptionPayment = async (paystackRef: string, planType: string, duration?: number) => {
    try {
      setVerifyingPayment(true);
      await api.post("/paystack/verify-subscription", {
        reference: paystackRef,
        planType,
        duration
      });
      
      localStorage.removeItem('pending_subscription_plan');
      localStorage.removeItem('pending_subscription_duration');
      localStorage.removeItem('pending_subscription_reference');
      
      queryClient.invalidateQueries({ queryKey: ["subscription-status"] });
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
      toast.success("Subscription activated successfully!");
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Payment verification failed");
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

  const { data: statusData } = useQuery<{ hasActiveSubscription: boolean; subscription?: Subscription; canCreateBusiness: boolean; hasStaffSettlementAccess: boolean }>({
    queryKey: ["subscription-status"],
    queryFn: async (): Promise<{ hasActiveSubscription: boolean; subscription?: Subscription; canCreateBusiness: boolean; hasStaffSettlementAccess: boolean }> => {
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
          planType,
          duration: selectedDuration
        }
      );

      localStorage.setItem("pending_subscription_plan", planType);
      localStorage.setItem("pending_subscription_duration", String(selectedDuration));
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
              <div className="grid md:grid-cols-2 gap-8 mb-8 max-w-4xl mx-auto">
                {plans.map((plan) => {
                  const isSelected = selectedPlan === plan.type;
                  const isPremium = plan.type === "PREMIUM";
                  
                  return (
                    <Card
                      key={plan.type}
                      className={cn(
                        "relative cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 overflow-hidden",
                        isSelected ? "ring-2 ring-blue-500 shadow-xl scale-105 z-10" : "border-gray-200 opacity-90 grayscale-[0.2]",
                        isPremium && "border-blue-200 shadow-md bg-gradient-to-b from-white to-blue-50/30"
                      )}
                      onClick={() => setSelectedPlan(plan.type)}
                    >
                      {isPremium && (
                        <div className="absolute top-0 right-0">
                          <div className="bg-blue-600 text-white text-[10px] font-bold px-8 py-1 rotate-45 translate-x-6 translate-y-2 shadow-sm">
                            PREMIUM
                          </div>
                        </div>
                      )}
                      <CardHeader className="text-center pb-6 pt-10">
                        <CardTitle className="text-2xl font-bold mb-1">{plan.name}</CardTitle>
                        <div className="space-y-1">
                          <div className="text-4xl font-black text-gray-900">
                            ₦{plan.pricePerMonthNGN.toLocaleString()}
                          </div>
                          <div className="text-sm font-bold text-blue-600 uppercase tracking-wider">
                            Per Month
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0 space-y-6">
                        <div className="space-y-3 min-h-[350px]">
                          {[
                            { name: "Business Overview", included: true },
                            { name: "Multiple Businesses", included: true },
                            { name: "Booking Management", included: true },
                            { name: "Price List & QR Uploads", included: true },
                            { name: "Customer Ratings", included: true },
                            { name: "Feedback & Complaints", included: true },
                            { name: "Service Management", included: true },
                            { name: "Check In System", included: true },
                            { name: "Wallet & Payouts", included: true },
                            { name: "Staff Settlement", included: isPremium },
                          ].map((feature, fIndex) => (
                            <div key={fIndex} className={cn(
                              "flex items-start text-sm shrink-0",
                              feature.included ? "text-gray-600" : "text-gray-400"
                            )}>
                              {feature.included ? (
                                <Check className="w-4 h-4 text-green-500 mr-3 shrink-0 mt-0.5" />
                              ) : (
                                <X className="w-4 h-4 text-gray-300 mr-3 shrink-0 mt-0.5" />
                              )}
                              <span className={cn(feature.included && isPremium && feature.name === "Staff Settlement" ? "font-bold text-blue-600" : "")}>
                                {feature.name}
                              </span>
                            </div>
                          ))}
                        </div>

                        <Button
                          className={cn(
                            "w-full h-12 text-base font-semibold transition-all",
                            isSelected 
                              ? "bg-blue-600 hover:bg-blue-700 shadow-md" 
                              : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                          )}
                          variant={isSelected ? "default" : "outline"}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPlan(plan.type);
                            setIsDurationModalOpen(true);
                          }}
                        >
                          {isSelected ? "Selected" : "Select Plan"}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Duration Selection Modal */}
              <Dialog open={isDurationModalOpen} onOpenChange={setIsDurationModalOpen}>
                <DialogContent className="h-auto max-h-[95vh] w-[95vw] sm:max-w-xl p-0 overflow-hidden border-none shadow-2xl">
                  <div className="p-4 sm:p-8 bg-white">
                    <DialogHeader className="mb-6 flex flex-col items-center justify-center text-center">
                      <DialogTitle className="text-xl sm:text-2xl font-bold text-center">Choose Duration</DialogTitle>
                      <DialogDescription className="text-center text-gray-500">
                        How many months would you like to subscribe to the {selectedPlan && formatPlanName(selectedPlan)}?
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                      {[3, 6, 9, 12].map((m) => (
                        <Button
                          key={m}
                          variant={selectedDuration === m ? "default" : "outline"}
                          className={cn(
                            "h-16 text-lg font-bold transition-all flex flex-col items-center justify-center gap-0.5",
                            selectedDuration === m 
                              ? "bg-blue-600 hover:bg-blue-700 ring-4 ring-blue-100" 
                              : "hover:border-blue-200 h-16"
                          )}
                          onClick={() => setSelectedDuration(m)}
                        >
                          <span className="text-xl">{m}</span>
                          <span className="text-[10px] uppercase tracking-wider opacity-80">Months</span>
                        </Button>
                      ))}
                    </div>

                    {/* Selected Plan Summary */}
                    {selectedPlan && (
                      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <Card className="bg-gradient-to-br from-blue-600 to-indigo-700 border-none shadow-xl text-white overflow-hidden">
                          <CardContent className="p-4 sm:p-8 relative">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                              <Sparkles className="w-24 h-24" />
                            </div>
                            
                            <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
                              <div className="text-center md:text-left">
                                <p className="text-blue-100 text-sm font-medium uppercase tracking-wider mb-1">Plan Summary</p>
                                <h3 className="text-2xl font-bold mb-1">
                                  {formatPlanName(selectedPlan)} • {selectedDuration} Months
                                </h3>
                                <p className="text-blue-200 text-sm">
                                  Access until {format(addMonths(new Date(), selectedDuration), 'MMMM d, yyyy')}
                                </p>
                              </div>
                              
                              <div className="flex flex-col items-center md:items-end">
                                <div className="text-4xl font-black mb-1">
                                  ₦{(plans.find(p => p.type === selectedPlan)!.pricePerMonthNGN * selectedDuration).toLocaleString()}
                                </div>
                                <p className="text-blue-100 text-xs font-medium bg-white/10 px-3 py-1 rounded-full">
                                  ONE-TIME PAYMENT
                                </p>
                              </div>
                            </div>

                            <Button 
                              className="w-full mt-8 bg-white text-blue-600 hover:bg-blue-50 h-14 text-lg font-black shadow-lg"
                              size="lg"
                              onClick={() => handleSubscribe(selectedPlan)}
                            >
                              <CreditCard className="w-5 h-5 mr-3" />
                              PROCEED TO PAYMENT
                            </Button>
                            
                            <p className="text-center mt-4 text-xs text-blue-200 font-medium">
                              Secure payment powered by Paystack
                            </p>
                          </CardContent>
                        </Card>
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
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
                {subscriptions.map((subscription) => (
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
