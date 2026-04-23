import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createBusiness, initializePayment, useCurrentUser } from "@/lib/store";
import { toast } from "@/hooks/use-toast";

export default function NewBusiness() {
  const user = useCurrentUser();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "" });

  const [paymentLoading, setPaymentLoading] = useState(false);

  const onPaystackInit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setPaymentLoading(true);
    try {
      const { authorizationUrl, reference } = await initializePayment(user.email, 1000, "");
      // Store reference temporarily to complete after user returns
      localStorage.setItem("temp_payment_ref", reference);
      window.location.href = authorizationUrl;
    } catch (err) {
      toast({ title: "Payment initialization failed", description: (err as Error).message, variant: "destructive" });
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

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-bold tracking-tight">Add a business</h1>
      <p className="mt-1 text-sm text-muted-foreground">Each business gets its own QR code and wallet.</p>

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