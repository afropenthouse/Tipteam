import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createBusiness, useCurrentUser } from "@/lib/store";
import { toast } from "@/hooks/use-toast";

export default function Onboarding() {
  const user = useCurrentUser();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "" });

  if (!user) return <Navigate to="/login" replace />;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const biz = await createBusiness(form);
      toast({ title: "Business created", description: `${biz.name} is ready to receive feedback.` });
      navigate(`/dashboard/businesses/${biz.id}`);
    } catch (err) {
      toast({ title: "Failed to create business", description: (err as Error).message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-xl px-4 py-12 md:py-20">
        <div className="mb-8 text-center">
          <span className="inline-flex items-center rounded-full bg-accent px-3 py-1 text-xs font-medium uppercase tracking-wider text-accent-foreground">
            Step 1 of 1
          </span>
          <h1 className="mt-4 text-3xl font-bold">Set up your first business</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            You can add more businesses later from your dashboard.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-5 rounded-2xl border bg-card p-6 shadow-card md:p-8">
          <div className="space-y-2">
            <Label htmlFor="name">Business name</Label>
            <Input id="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="The Daily Brew" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Business email</Label>
            <Input id="email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="hello@dailybrew.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Business phone</Label>
            <Input id="phone" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+234 000 000 0000" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Business address</Label>
            <Textarea id="address" required value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="123 Marina Road, Lagos" />
          </div>
          <div className="flex items-center justify-between gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => navigate("/dashboard")}>
              Skip for now
            </Button>
            <Button type="submit" disabled={loading} className="bg-gradient-primary shadow-elegant">
              {loading ? "Creating..." : "Create business"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}