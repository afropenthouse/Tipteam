import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn } from "@/lib/store";
import { toast } from "@/hooks/use-toast";

export default function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });
  const [needsVerification, setNeedsVerification] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signIn(form.email, form.password);
      navigate("/dashboard");
    } catch (err: any) {
      if (err.message?.includes("verify your email")) {
        setNeedsVerification(true);
        toast({ title: "Verification required", description: "Please verify your email before logging in." });
      } else {
        toast({ title: "Sign in failed", description: err.message, variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex items-center justify-center p-6 md:p-12">
        <form onSubmit={onSubmit} className="w-full max-w-sm space-y-5">
          <Link to="/" className="flex items-center justify-center">
            <img 
              src="/logo.png" 
              alt="Tracla Logo" 
              className="h-8 w-auto"
            />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Welcome back</h1>
            <p className="mt-1 text-sm text-muted-foreground">Sign in to your dashboard.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link to="/forgot-password" className="text-xs text-primary hover:underline">
                Forgot password?
              </Link>
            </div>
            <Input id="password" type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <Button type="submit" disabled={loading} className="w-full bg-gradient-primary shadow-elegant">
            {loading ? "Signing in..." : "Sign in"}
          </Button>
          {needsVerification && (
            <div className="text-center">
              <Link to="/verify-email" state={{ email: form.email }} className="text-sm text-primary hover:underline">
                Verify your email
              </Link>
            </div>
          )}
          <p className="text-center text-sm text-muted-foreground">
            New here?{" "}
            <Link to="/signup" className="font-medium text-primary hover:underline">
              Create an account
            </Link>
          </p>
        </form>
      </div>
      <div className="hidden bg-gradient-hero p-12 lg:flex flex-col justify-center items-center text-white">
        <div className="max-w-md space-y-8">
          <div className="text-center space-y-4">
            <h2 className="text-4xl font-bold">Collect Tips & Keep Customers Happy</h2>
            <p className="text-xl text-white/80">One QR code for instant customer feedback and satisfaction</p>
          </div>
          
          <div className="space-y-6">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold">Customer Feedback</h3>
                <p className="text-white/70">Collect real-time feedback to improve service</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold">Happy Customers</h3>
                <p className="text-white/70">Build loyalty through excellent service</p>
              </div>
            </div>
          </div>
          
          <div className="pt-6 border-t border-white/20">
            <div className="flex items-center justify-center space-x-8 text-sm text-white/60">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">500+</div>
                <div>Happy Businesses</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">10K+</div>
                <div>Customer Reviews</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">24/7</div>
                <div>Support</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}