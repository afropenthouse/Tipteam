import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signUp } from "@/lib/store";
import { toast } from "@/hooks/use-toast";

export default function SignUp() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ fullName: "", email: "", password: "" });

   const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signUp(form);
      // Verification removed - users are automatically verified on signup
      // toast({ title: "Check your email", description: "We've sent you a verification code to complete your registration." });
      // navigate("/verify-email", { state: { email: form.email } });
      toast({ title: "Account created", description: "Welcome aboard!" });
      navigate("/dashboard");
    } catch (err) {
      toast({ title: "Signup failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden bg-gradient-hero p-12 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary font-bold">T</div>
          <span className="font-semibold">Tracla</span>
        </Link>
        <div>
          <h2 className="text-3xl font-bold leading-tight">
            "Our team made <span className="text-primary-glow">3x more</span> in tips the first week."
          </h2>
          <p className="mt-3 text-sm text-primary-foreground/60">— Restaurant owner, Lagos</p>
        </div>
        <div className="text-xs text-primary-foreground/50">© Tracla</div>
      </div>

      <div className="flex items-center justify-center p-6 md:p-12">
        <form onSubmit={onSubmit} className="w-full max-w-sm space-y-5">
          <div>
            <h1 className="text-2xl font-bold">Create your account</h1>
            <p className="mt-1 text-sm text-muted-foreground">It takes less than 60 seconds.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="fullName">Full name</Label>
            <Input id="fullName" required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="Ada Lovelace" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@business.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="At least 6 characters" />
          </div>
          <Button type="submit" disabled={loading} className="w-full bg-gradient-primary shadow-elegant">
            {loading ? "Creating..." : "Create account"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
