import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, MessageSquare, Plus, Send, Wallet } from "lucide-react";
import { listBusinesses } from "@/lib/api";
import { useCurrentUser } from "@/lib/store";

const MESSAGE_CHARGE = 10;

export default function MessagePage() {
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>("");
  const [balance, setBalance] = useState<number>(0);
  const [message, setMessage] = useState("");
  const [recipients, setRecipients] = useState<string>("");
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [topupLoading, setTopupLoading] = useState(false);
  const [topupAmount, setTopupAmount] = useState<string>("1000");
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const user = useCurrentUser();

  const apiUrl = import.meta.env.VITE_API_URL;
  const token = localStorage.getItem("ttt:token");

  useEffect(() => {
    fetchBusinesses();
    checkPaymentVerification();
    fetchBalance(); // Fetch global balance on mount
  }, []);

  const checkPaymentVerification = async () => {
    const reference = searchParams.get("reference");
    const trxref = searchParams.get("trxref");
    const ref = reference || trxref;

    if (ref) {
      try {
        const res = await fetch(`${apiUrl}/messages/verify-topup`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ reference: ref }),
        });
        const data = await res.json();
        if (res.ok) {
          toast({ title: "Payment Successful", description: "Your messaging balance has been updated." });
          setBalance(data.newBalance);
          setSearchParams({});
        }
      } catch (error) {
        console.error("Verification error:", error);
      }
    }
  };

  useEffect(() => {
    if (selectedBusinessId) {
      fetchCustomers();
    }
  }, [selectedBusinessId]);

  const fetchBusinesses = async () => {
    try {
      const data = await listBusinesses();
      setBusinesses(data);
      if (data.length > 0 && !selectedBusinessId) {
        setSelectedBusinessId(data[0].id);
      }
    } catch (error) {
      console.error("Failed to fetch businesses:", error);
    }
  };

  const fetchBalance = async () => {
    try {
      const res = await fetch(`${apiUrl}/messages/balance`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setBalance(data.balance);
      }
    } catch (error) {
      console.error("Failed to fetch balance:", error);
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await fetch(`${apiUrl}/messages/customers/${selectedBusinessId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCustomers(data.customers);
      }
    } catch (error) {
      console.error("Failed to fetch customers:", error);
    }
  };

  const handleTopup = async () => {
    if (!topupAmount || parseInt(topupAmount) < 100) {
      toast({ title: "Invalid amount", description: "Minimum top-up is ₦100", variant: "destructive" });
      return;
    }

    setTopupLoading(true);
    try {
      const res = await fetch(`${apiUrl}/messages/initialize-topup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: parseInt(topupAmount),
          email: user?.email,
        }),
      });

      const data = await res.json();
      if (res.ok && data.authorizationUrl) {
        window.location.href = data.authorizationUrl;
      } else {
        toast({ title: "Error", description: data.error || "Failed to initialize top-up", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to initialize top-up", variant: "destructive" });
    } finally {
      setTopupLoading(false);
    }
  };

  const handleSendBulk = async () => {
    // If no recipients manually entered, use all customers
    let phoneList = recipients
      .split(/[\n,]+/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    if (phoneList.length === 0) {
      phoneList = customers.map(c => c.phone);
    }

    if (phoneList.length === 0) {
      toast({ title: "No recipients", description: "No customers found for this business", variant: "destructive" });
      return;
    }

    if (!message) {
      toast({ title: "No message", description: "Please enter a message to send", variant: "destructive" });
      return;
    }

    const totalCharge = phoneList.length;
    if (balance < totalCharge) {
      toast({ title: "Insufficient credits", description: `You need ${totalCharge} SMS credits to send this message`, variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/messages/send-bulk`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          businessId: selectedBusinessId,
          message,
          recipients: phoneList,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast({ title: "Success", description: data.message });
        setMessage("");
        setRecipients("");
        fetchBalance();
      } else {
        toast({ title: "Error", description: data.error || "Failed to send messages", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to send messages", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">SMS Messaging</h1>
          <p className="text-muted-foreground">Send bulk SMS to your customers using SMS credits</p>
        </div>
        
        <div className="flex items-center gap-4">
          <Select value={selectedBusinessId} onValueChange={setSelectedBusinessId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select Business" />
            </SelectTrigger>
            <SelectContent>
              {businesses.map((b) => (
                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Wallet Section */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              SMS Credits
            </CardTitle>
            <CardDescription>Top up to send messages (1 Credit = 1 SMS)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted rounded-lg text-center">
              <span className="text-sm text-muted-foreground">Available SMS Credits</span>
              <div className="text-3xl font-bold">{balance.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground mt-1">
                Each SMS costs 1 credit (₦10)
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="topup">Top up Amount (₦)</Label>
              <div className="flex gap-2">
                <Input
                  id="topup"
                  type="number"
                  value={topupAmount}
                  onChange={(e) => setTopupAmount(e.target.value)}
                  placeholder="Min 100"
                />
                <Button onClick={handleTopup} disabled={topupLoading}>
                  {topupLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buy Credits"}
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                ₦1,000 = 100 Credits | ₦5,000 = 500 Credits
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Compose Section */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Compose SMS
            </CardTitle>
            <CardDescription>
              Sending to all <strong>{customers.length}</strong> customers of {businesses.find(b => b.id === selectedBusinessId)?.name}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                placeholder="Type your message here..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="h-32"
              />
              <div className="text-xs text-muted-foreground text-right">
                {message.length} characters | {Math.ceil(message.length / 160)} SMS parts
              </div>
            </div>

            <div className="pt-4 flex justify-between items-center">
              <div className="text-sm">
                Total Cost: <span className="font-bold">{customers.length} Credits</span>
              </div>
              <Button onClick={handleSendBulk} disabled={loading || customers.length === 0} className="gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Send to All Customers
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
