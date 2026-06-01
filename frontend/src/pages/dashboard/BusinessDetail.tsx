import { useState, useEffect, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import { Copy, Download, MapPin, Mail, Phone, Star, Upload, FileText, X, Edit } from "lucide-react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { getBusiness, listFeedback, walletBalance, updateBusiness } from "@/lib/store";
import { toast } from "@/hooks/use-toast";
import type { Business, Feedback } from "@/lib/api";

const fmtNGN = (n: number) => `₦${n.toLocaleString()}`;

export default function BusinessDetail() {
  const { id } = useParams<{ id: string }>();
  const [business, setBusiness] = useState<Business | null>(null);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [wallet, setWallet] = useState({ earned: 0, available: 0, withdrawn: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [qrSize, setQrSize] = useState(200);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    website: "",
    googleBusinessUrl: "",
    allowTipping: false
  });

  useEffect(() => {
    if (!id) return;

    Promise.all([getBusiness(id), listFeedback(id)])
      .then(([biz, fb]) => {
        setBusiness(biz || null);
        setFeedback(fb);
      })
      .catch(console.error)
      .finally(() => setLoading(false));

    walletBalance(id).then(setWallet).catch(console.error);
  }, [id]);

  const handleEditClick = () => {
    if (business) {
      setEditForm({
        name: business.name,
        email: business.email,
        phone: business.phone,
        address: business.address,
        website: business.website || "",
        googleBusinessUrl: business.googleBusinessUrl || "",
        allowTipping: business.allowTipping ?? false
      });
      setEditModalOpen(true);
    }
  };

  const handleUpdateBusiness = async () => {
    if (!business || !id) return;
    
    setIsUpdating(true);
    try {
      const updatedBusiness = await updateBusiness(id, editForm);
      setBusiness(updatedBusiness);
      setEditModalOpen(false);
      toast({ 
        title: "Business updated", 
        description: "Your business information has been successfully updated." 
      });
    } catch (error) {
      console.error("Failed to update business:", error);
      toast({ 
        title: "Update failed", 
        description: "Failed to update business information. Please try again.", 
        variant: "destructive" 
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleFormChange = (field: string, value: string | boolean) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    const updateQrSize = () => {
      const screenWidth = window.innerWidth;
      const maxSize = Math.min(200, screenWidth - 80);
      setQrSize(Math.max(150, maxSize)); // Minimum 150px for readability
    };

    updateQrSize();
    window.addEventListener('resize', updateQrSize);
    return () => window.removeEventListener('resize', updateQrSize);
  }, []);

  const rateUrl = useMemo(
    () => (id ? `${window.location.origin}/rate/${id}` : ""),
    [id],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="rounded-2xl border border-dashed p-12 text-center">
        <p className="text-sm text-muted-foreground">Business not found.</p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/dashboard/businesses">Back to businesses</Link>
        </Button>
      </div>
    );
  }

  const copy = async () => {
    await navigator.clipboard.writeText(rateUrl);
    toast({ title: "Link copied", description: "Share it with your customers." });
  };

  const download = async () => {
    try {
      // Generate high-quality PNG QR code directly
      const pngData = await QRCode.toDataURL(rateUrl, {
        width: 400,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      // Create download link
      const a = document.createElement("a");
      a.href = pngData;
      a.download = `${business.name}-qr.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      toast({ title: "Download successful", description: "QR code saved as PNG" });
    } catch (error) {
      console.error("Error generating PNG:", error);
      toast({ title: "Download failed", description: "Could not generate QR code image", variant: "destructive" });
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        toast({ title: "Invalid file", description: "Please select a PDF file", variant: "destructive" });
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: "File too large", description: "Please select a file smaller than 10MB", variant: "destructive" });
        return;
      }
      setSelectedFile(file);
    }
  };

  const avg =
    feedback.length > 0
      ? (feedback.reduce((s, f) => s + f.rating, 0) / feedback.length).toFixed(1)
      : "—";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{business.name}</h1>
          <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {business.address}</span>
            <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" /> {business.email}</span>
            <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" /> {business.phone}</span>
          </div>
        </div>
        <Button 
          className="bg-gradient-primary shadow-elegant"
          onClick={handleEditClick}
        >
          <Edit className="h-4 w-4 mr-2" />
          Edit Business
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border bg-card p-5 shadow-card">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">Reviews</span>
          <div className="mt-2 text-2xl font-bold">{feedback.length}</div>
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-card">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">Avg rating</span>
          <div className="mt-2 text-2xl font-bold">★ {avg}</div>
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-card">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">Tips earned</span>
          <div className="mt-2 text-2xl font-bold">{fmtNGN(wallet.earned)}</div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
        <div className="rounded-2xl border bg-gradient-mint p-4 sm:p-6 shadow-card">
          <h2 className="font-semibold text-accent-foreground">Your QR code</h2>
          <p className="mt-1 text-xs text-accent-foreground/80">
            Customers scan this to leave feedback and tip your team.
          </p>
          <div className="mt-4 sm:mt-5 flex flex-col items-center gap-3 sm:gap-4 rounded-xl bg-card p-4 sm:p-6">
            <div className="relative w-full max-w-[200px]">
              <div className="absolute -top-5 sm:-top-6 left-0 right-0 flex justify-center z-10 px-2">
                <span className="inline-block text-black text-xs sm:text-sm font-bold px-2 sm:px-4 py-1 sm:py-2 whitespace-nowrap text-center bg-white/90 backdrop-blur-sm rounded-lg shadow-sm">
                  Scan to Give Feedback & Complaints
                </span>
              </div>
              <div className="flex justify-center">
                <QRCodeCanvas 
                  id="biz-qr" 
                  value={rateUrl} 
                  size={qrSize} 
                  level="H" 
                  includeMargin 
                  className="max-w-full h-auto"
                />
              </div>
            </div>
            <div className="w-full break-all rounded-md bg-muted px-3 py-2 text-center text-xs text-muted-foreground">
              {rateUrl}
            </div>
            <div className="flex w-full gap-2">
              <Button onClick={copy} variant="outline" className="flex-1">
                <Copy className="h-4 w-4" /> Copy link
              </Button>
              <Button onClick={download} className="flex-1 bg-gradient-primary">
                <Download className="h-4 w-4" /> Download
              </Button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-6 shadow-card">
          <h2 className="font-semibold">Recent feedback</h2>
          {feedback.length === 0 ? (
            <p className="mt-6 text-sm text-muted-foreground">
              No feedback yet. Share your QR to get the first review.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {feedback
                .slice()
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .slice(0, 8)
                .map((f) => (
                  <li key={f.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3.5 w-3.5 ${i < f.rating ? "fill-warning text-warning" : "text-muted-foreground/30"}`}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(f.createdAt).toLocaleString()}
                      </span>
                    </div>
                    {f.experience && <p className="mt-2 text-sm">{f.experience}</p>}
                    {f.tipAmount > 0 && (
                      <p className="mt-1 text-xs font-medium text-primary">
                        Tipped {fmtNGN(f.tipAmount)}
                      </p>
                    )}
                  </li>
                ))}
            </ul>
          )}
        </div>
      </div>

      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-[425px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Business</DialogTitle>
            <DialogDescription>
              Update your business information below.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Business Name</Label>
              <Input
                id="name"
                value={editForm.name}
                onChange={(e) => handleFormChange("name", e.target.value)}
                placeholder="Enter business name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={editForm.email}
                onChange={(e) => handleFormChange("email", e.target.value)}
                placeholder="Enter email address"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={editForm.phone}
                onChange={(e) => handleFormChange("phone", e.target.value)}
                placeholder="Enter phone number"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={editForm.address}
                onChange={(e) => handleFormChange("address", e.target.value)}
                placeholder="Enter business address"
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="website">Website (Optional)</Label>
              <Input
                id="website"
                type="url"
                value={editForm.website}
                onChange={(e) => handleFormChange("website", e.target.value)}
                placeholder="https://example.com"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="googleBusinessUrl">Google Business URL (Optional)</Label>
              <Input
                id="googleBusinessUrl"
                type="url"
                value={editForm.googleBusinessUrl}
                onChange={(e) => handleFormChange("googleBusinessUrl", e.target.value)}
                placeholder="https://g.page/..."
              />
            </div>
            <div className="flex items-center space-x-3 p-4 border rounded-lg bg-muted/30">
              <Switch
                id="allow-tipping-edit"
                checked={editForm.allowTipping}
                onCheckedChange={(checked) => handleFormChange("allowTipping", checked)}
              />
              <div className="space-y-1">
                <Label htmlFor="allow-tipping-edit" className="text-sm font-medium cursor-pointer">
                  Allow customers to tip your team
                </Label>
                <p className="text-xs text-muted-foreground">
                  When enabled, customers can tip individual team members
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditModalOpen(false)}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateBusiness}
              disabled={isUpdating || !editForm.name || !editForm.email || !editForm.phone || !editForm.address}
            >
              {isUpdating ? "Updating..." : "Update Business"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}