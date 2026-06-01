import { useState, useEffect, useMemo } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { Star, Check, ArrowLeft, Loader2, Sparkles, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  listBusinesses,
  getBusiness,
  getPublicBusiness,
  addFeedback,
  initializePayment,
  verifyPayment,
} from "@/lib/store";
import { toast } from "@/hooks/use-toast";
import { settlementApi, type Business, type Service } from "@/lib/api";

const TIP_PRESETS = [1000, 2000, 5000, 10000];

const fmtNGN = (n: number) => `₦${n.toLocaleString()}`;

type Step = "start" | "rating" | "experience" | "phone" | "tip" | "email" | "services" | "done";

export default function Rate() {
  const { businessId } = useParams<{ businessId: string }>();
  const [searchParams] = useSearchParams();
  const [business, setBusiness] = useState<Business | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingServices, setLoadingServices] = useState(false);

  const [step, setStep] = useState<Step>("start");
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [experience, setExperience] = useState("");
  const [phone, setPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [teamNumber, setTeamNumber] = useState("");
  const [tipAmount, setTipAmount] = useState<number | "">("");
  const [paying, setPaying] = useState(false);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  const paymentReference = searchParams.get("reference") || searchParams.get("trxref");

  const handleViewServices = async () => {
    if (!businessId) return;
    setLoadingServices(true);
    try {
      const data = await settlementApi.getPublicServices(businessId);
      setServices(data || []);
      setStep("services");
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: "Failed to load services. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingServices(false);
    }
  };

  const progressPercent = useMemo(() => {
    const baseOrder: Step[] = ["start", "rating", "experience", "phone", "done"];
    const tipOrder: Step[] = ["start", "rating", "experience", "phone", "tip", "email", "done"];
    const order = business && business.allowTipping ? tipOrder : baseOrder;
    
    const currentIndex = order.indexOf(step);
    if (currentIndex === -1) return 0; // For "services" step which is outside the main flow
    
    return ((currentIndex + 1) / order.length) * 100;
  }, [step, business]);

  // Fetch business details
  useEffect(() => {
    if (!businessId) {
      setLoading(false);
      return;
    }
    getPublicBusiness(businessId)
      .then((biz) => setBusiness(biz || null))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [businessId]);

  // Handle payment verification when returning from Paystack
  useEffect(() => {
    if (!businessId || !paymentReference) return;

    let cancelled = false;

    const verifyReturnedPayment = async () => {
      try {
        setPaying(true);
        const { amount } = await verifyPayment(paymentReference);
        if (cancelled) return;

        setTipAmount(amount);
        await submit(amount);
        setStep("done");
        toast({
          title: "Payment confirmed",
          description: `Your tip of ₦${amount.toLocaleString()} was received successfully.`,
        });
        window.history.replaceState({}, "", window.location.pathname);
      } catch (err) {
        if (cancelled) return;
        toast({
          title: "Payment verification failed",
          description: (err as Error).message,
          variant: "destructive",
        });
      } finally {
        if (!cancelled) {
          setPaying(false);
        }
      }
    };

    void verifyReturnedPayment();

    return () => {
      cancelled = true;
    };
  }, [businessId, paymentReference]);

  const submit = async (tip: number) => {
    if (!businessId) return;
    try {
      setSubmittingFeedback(true);
      await addFeedback({
        businessId,
        ...(rating > 0 ? { rating } : {}),
        experience: experience.trim() || undefined,
        phone: phone.trim() || undefined,
        tipAmount: tip,
      });
      setStep("done");
      // Notify other pages (wallet) to refresh their data
      console.log("[Rate] Feedback created, dispatching ttt:store event");
      window.dispatchEvent(new Event("ttt:store"));
      localStorage.setItem("wallet:lastUpdate", Date.now().toString());
    } catch (err) {
      toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const startPaystackPayment = async () => {
    if (!businessId) return;

    const amt = Number(tipAmount) || 0;
    if (amt <= 0) {
      toast({ title: "Enter an amount", variant: "destructive" });
      return;
    }

    if (!customerEmail.trim()) {
      toast({ title: "Enter your email address", variant: "destructive" });
      return;
    }

    try {
      setPaying(true);
      const metadata = {
        ...(rating > 0 ? { rating } : {}),
        experience: experience.trim() || undefined,
        phone: phone.trim() || undefined,
        teamNumber: teamNumber.trim() || undefined,
      };
      const { authorizationUrl } = await initializePayment(customerEmail.trim(), amt, businessId, metadata);

      window.location.assign(authorizationUrl);
    } catch (err) {
      setPaying(false);
      toast({
        title: "Unable to start payment",
        description: (err as Error).message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="max-w-sm text-center">
          <h1 className="text-xl font-bold">Business not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This rating link is invalid or has been removed.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-mint">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-5 py-8">
        <header className="relative text-center">
          {step !== "start" && step !== "done" && (
            <button
              type="button"
              onClick={() => {
                const prev: Record<string, Step> = {
                  rating: "start",
                  experience: "rating",
                  phone: "experience",
                  tip: "start",
                  email: "tip",
                };
                // If tipping is disabled, go back to start instead of tip step
                if (step === "phone" && !business.allowTipping) {
                  setStep("start");
                } else {
                  setStep(prev[step] || "start");
                }
              }}
              className="absolute left-0 top-1/2 -translate-y-1/2 rounded-full p-2 hover:bg-accent"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
            </button>
          )}
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground font-bold shadow-elegant">
            T
          </div>
          <h1 className="mt-3 text-lg font-semibold">{business.name}</h1>
          <p className="text-xs text-muted-foreground">Powered by Tracla</p>
        </header>

        <div className="mt-6 h-1 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-gradient-primary transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="mt-8 flex-1 rounded-3xl bg-card p-6 shadow-card md:p-8">
          {step === "start" && (
            <div className="text-center">
              <h2 className="text-xl font-bold">What would you like to do?</h2>
              <p className="mt-1 text-sm text-muted-foreground">Choose an option below.</p>
              <div className="mt-8 space-y-3">
                <Button
                  onClick={() => setStep("experience")}
                  className="w-full bg-gradient-primary shadow-elegant text-base py-6"
                >
                  Give Feedback/Complaint
                </Button>
                {business.allowTipping && (
                  <Button
                    onClick={() => setStep("tip")}
                    className="w-full bg-gradient-primary shadow-elegant text-base py-6"
                  >
                    Tip a team member
                  </Button>
                )}
                {business.allowCheckin && (
                  <Button
                    asChild
                    className="w-full bg-gradient-primary shadow-elegant text-base py-6"
                  >
                    <Link to={`/checkin/${businessId}`} className="flex items-center justify-center gap-2">
                      <UserCheck className="h-5 w-5" />
                      Member Check-In
                    </Link>
                  </Button>
                )}
                {business.website && (
                  <Button
                    asChild
                    variant="outline"
                    className="w-full shadow-elegant text-base py-6"
                  >
                    <a
                      href={business.website.startsWith('http') ? business.website : `https://${business.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2"
                    >
                      Visit Website
                    </a>
                  </Button>
                )}
                <Button
                  onClick={handleViewServices}
                  disabled={loadingServices}
                  className="w-full bg-gradient-primary shadow-elegant text-base py-6"
                >
                  {loadingServices ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    "View Services"
                  )}
                </Button>
                {business.menus && business.menus.length > 0 && (
                  <div className="space-y-2">
                    {business.menus.map((menu) => (
                      <Button
                        key={menu.id}
                        asChild
                        className="w-full bg-gradient-primary shadow-elegant text-base py-6"
                      >
                        <a
                          href={`/menu/${menu.publicId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2"
                        >
                          View {menu.name}
                        </a>
                      </Button>
                    ))}
                  </div>
                )}
                {business.googleBusinessUrl && (
                  <Button
                    asChild
                    className="w-full bg-gradient-primary shadow-elegant text-base py-6"
                  >
                    <a
                      href={business.googleBusinessUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2"
                    >
                      <Star className="h-5 w-5" />
                      Rate on Google
                    </a>
                  </Button>
                )}
              </div>
            </div>
          )}

          {step === "rating" && (
            <div className="text-center">
              <h2 className="text-xl font-bold">How would you rate us?</h2>
              <p className="mt-1 text-sm text-muted-foreground">Tap a star to begin.</p>
              <div className="mt-8 flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onMouseEnter={() => setHover(n)}
                    onMouseLeave={() => setHover(0)}
                    onClick={() => {
                      setRating(n);
                    }}
                    className="transition hover:scale-110"
                  >
                    <Star
                      className={`h-12 w-12 ${
                        (hover || rating) >= n
                          ? "fill-warning text-warning"
                          : "text-muted-foreground/30"
                      }`}
                    />
                  </button>
                ))}
              </div>
              {rating > 0 && (
                <div className="mt-8">
                  <Button
                    onClick={() => setStep("phone")}
                    className="w-full bg-gradient-primary shadow-elegant"
                  >
                    Continue
                  </Button>
                </div>
              )}
             </div>
           )}

          {step === "experience" && (
            <div>
              <h2 className="text-xl font-bold">Share your experience, complaints or feedback</h2>
              <Textarea
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                placeholder="Leave your comments and feedback here..."
                className="mt-4 min-h-[120px]"
              />
              <div className="mt-6 flex gap-2">
                 <Button variant="ghost" onClick={() => setStep("phone")} className="flex-1">
                   Skip
                 </Button>
                 <Button
                   onClick={() => setStep("rating")}
                   className="flex-[2] bg-gradient-primary shadow-elegant"
                 >
                   Continue to Rating
                 </Button>
               </div>
            </div>
          )}

          {step === "phone" && (
            <div>
              <h2 className="text-xl font-bold">Enter your phone number</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Optional — so we can follow up if needed.
              </p>
              <div className="mt-4 space-y-2">
                <Label htmlFor="phone">Phone number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+234 000 000 0000"
                />
              </div>
              <div className="mt-6 space-y-2">
                {business.allowTipping && (
                  <Button
                    onClick={() => setStep("tip")}
                    className="w-full bg-gradient-primary shadow-elegant"
                  >
                    Add a Tip 💝
                  </Button>
                )}
                <Button
                  onClick={() => void submit(0)}
                  disabled={submittingFeedback}
                  variant={business.allowTipping ? "outline" : "default"}
                  className="w-full"
                >
                  {submittingFeedback ? "Submitting..." : "Submit Feedback"}
                </Button>
              </div>
            </div>
          )}

          {step === "tip" && (
            <div>
              <h2 className="text-xl font-bold">Will you like to tip the team or team member?</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                100% of your tip goes to them.
              </p>
               <div className="mt-4 space-y-2">
                 <Label htmlFor="teamNumber">Team name (optional)</Label>
                 <Input
                   id="teamNumber"
                   type="text"
                   value={teamNumber}
                   onChange={(e) => setTeamNumber(e.target.value)}
                   placeholder="Enter team member name"
                 />
               </div>
              <div className="mt-5 grid grid-cols-2 gap-2">
                {TIP_PRESETS.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setTipAmount(amt)}
                    className={`rounded-xl border-2 p-4 text-center font-semibold transition ${
                      tipAmount === amt
                        ? "border-primary bg-accent text-accent-foreground"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    ₦{amt.toLocaleString()}
                  </button>
                ))}
              </div>
              <div className="mt-3">
                <Label htmlFor="custom">Or enter a custom amount</Label>
                <Input
                  id="custom"
                  type="number"
                  min={1}
                  value={tipAmount}
                  onChange={(e) => setTipAmount(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="₦"
                  className="mt-2"
                />
              </div>

              <div className="mt-6 space-y-2">
                <Button
                  onClick={() => {
                    if (!tipAmount || Number(tipAmount) <= 0) {
                      toast({ title: "Enter an amount", variant: "destructive" });
                      return;
                    }
                    setStep("email");
                  }}
                  className="w-full bg-gradient-primary shadow-elegant"
                >
                  Proceed to Payment 💳
                </Button>
                <Button
                  onClick={() => void submit(0)}
                  disabled={submittingFeedback}
                  variant="outline"
                  className="w-full"
                >
                  Skip Tip - Submit Feedback Only
                </Button>
              </div>
              <p className="mt-3 text-center text-[10px] text-muted-foreground">
                Payments are securely processed by Paystack.
              </p>
             </div>
           )}

          {step === "email" && (
            <div>
              <h2 className="text-xl font-bold">Enter your email address</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                We'll use this for your payment receipt.
              </p>
              <div className="mt-4 space-y-2">
                <Label htmlFor="customerEmail">Email address</Label>
                <Input
                  id="customerEmail"
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              <div className="mt-6 space-y-2">
                <Button
                  onClick={startPaystackPayment}
                  disabled={paying || !customerEmail.trim()}
                  className="w-full bg-gradient-primary shadow-elegant"
                >
                  {paying ? "Redirecting to Paystack..." : "Proceed to Payment"}
                </Button>
              </div>
              <p className="mt-3 text-center text-[10px] text-muted-foreground">
                Payments are securely processed by Paystack.
              </p>
            </div>
          )}

          {step === "services" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-4">
                <Button variant="outline" size="sm" onClick={() => setStep("start")}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <h2 className="text-xl font-bold">Our Services</h2>
              </div>
              
              <div className="space-y-3">
                {services.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No services listed yet.</p>
                ) : (
                  services.map((service) => (
                    <div 
                      key={service.id}
                      className="flex items-center justify-between p-4 rounded-xl border bg-card shadow-sm hover:border-primary/50 transition-colors"
                    >
                      <div>
                        <h3 className="font-bold text-gray-900">{service.name}</h3>
                        <p className="text-xs text-muted-foreground">Standard Service</p>
                      </div>
                      <div className="text-lg font-black text-primary">
                        {fmtNGN(service.amount)}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <Button
                onClick={() => setStep("rating")}
                className="w-full bg-gradient-primary shadow-elegant h-12"
              >
                Leave a Review
              </Button>
            </div>
          )}

          {step === "done" && (
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent text-accent-foreground">
                <Check className="h-8 w-8" />
              </div>
              <h2 className="mt-4 text-2xl font-bold">Thank you! 💚</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Your feedback helps {business.name} get better every day.
              </p>
              {business.website && (
                <div className="mt-6">
                  <Button asChild variant="outline" size="sm">
                    <a href={business.website.startsWith('http') ? business.website : `https://${business.website}`} target="_blank" rel="noopener noreferrer">
                      Visit our website
                    </a>
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        <footer className="mt-6 text-center text-[10px] text-muted-foreground">
          Powered by Tracla
        </footer>
      </div>
    </div>
  );
}
