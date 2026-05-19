import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Loader2, MapPin, Calendar as CalendarIcon, ChevronLeft, ChevronRight, CheckCircle2, Clock, ShieldCheck, Star, User, Phone, X } from "lucide-react";
import { format, startOfDay } from "date-fns";
import { getPublicBookingProfile, getUnavailableDates, createBooking } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

export default function PublicBookingPage() {
  const { publicId } = useParams<{ publicId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [unavailableDates, setUnavailableDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [bookingLoading, setBookingLoading] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      if (!publicId) return;
      
      try {
        const [profileData, datesData] = await Promise.all([
          getPublicBookingProfile(publicId),
          getUnavailableDates(publicId)
        ]);
        setProfile(profileData || null);
        setUnavailableDates(datesData);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Failed to load booking profile");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [publicId]);

  const isDateUnavailable = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return unavailableDates.includes(dateStr);
  };

  const handleBookNow = () => {
    if (!selectedDate) return;
    setShowBookingDialog(true);
  };

   const handleConfirmBooking = async () => {
     if (!selectedDate || !customerName || !customerPhone || !publicId) return;

     setBookingLoading(true);
     try {
       await createBooking({
         bookingProfileId: profile.id,
         date: format(selectedDate, "yyyy-MM-dd"),
         customerName,
         customerPhone,
         notes: notes || undefined
       });
       
       setShowBookingDialog(false);
       setShowSuccessDialog(true);
       
       // Don't clear these yet so they can be shown in the success dialog
       // setCustomerName("");
       // setCustomerPhone("");
       setNotes("");
       setSelectedDate(undefined);
       
       // Refresh unavailable dates to include the booked date
       const datesData = await getUnavailableDates(publicId);
       setUnavailableDates(datesData);
       
       toast({
         title: "Booking Successful!",
         description: "Your appointment has been confirmed.",
       });
     } catch (err: any) {
       console.error("Booking error:", err);
       toast({
         title: "Booking Failed",
         description: err.message || "Failed to confirm booking. Please try again.",
         variant: "destructive",
       });
     } finally {
       setBookingLoading(false);
     }
   };

  const handleCloseSuccessDialog = (open: boolean) => {
    if (!open) {
      setShowSuccessDialog(false);
      setCustomerName("");
      setCustomerPhone("");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground font-medium">Preparing booking calendar...</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
        <Card className="max-w-md w-full shadow-xl">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <X className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle className="text-2xl font-bold">Page Not Found</CardTitle>
          </CardHeader>
          <CardContent className="text-center text-muted-foreground">
            {error || "The booking page you're looking for doesn't exist or has been removed."}
          </CardContent>
          <CardFooter>
            <Button className="w-full" onClick={() => navigate("/")}>
              Return Home
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Top Banner/Header */}
      <div className="h-64 md:h-80 bg-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-black/60 z-10" />
        {profile.pictures?.length > 0 && (
          <img 
            src={profile.pictures[currentImageIndex].imageUrl} 
            className="w-full h-full object-cover"
            alt={profile.name}
          />
        )}
        
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-white p-4 text-center">
          <Badge className="mb-4 bg-white/20 hover:bg-white/30 text-white border-none backdrop-blur-md px-3 py-1">
            Official Booking Page
          </Badge>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-2 drop-shadow-lg">
            {profile.name}
          </h1>
          <div className="flex items-center gap-2 text-white/90 font-medium">
            <MapPin className="h-4 w-4" />
            {profile.location}
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 -mt-16 relative z-30 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Details & Gallery */}
          <div className="lg:col-span-7 space-y-6">
            <Card className="border-none shadow-xl shadow-black/5 overflow-hidden">
              <CardHeader className="bg-white border-b">
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                  About this Service
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <p className="text-muted-foreground leading-relaxed text-lg italic">
                  "{profile.description || "Welcome to our booking page. We provide professional services tailored to your needs. Please select a date from the calendar to book your appointment."}"
                </p>

                {profile.pictures?.length > 0 && (
                  <div className="space-y-4">
                    <div className="relative rounded-2xl overflow-hidden aspect-video group">
                      <img 
                        src={profile.pictures[currentImageIndex].imageUrl} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        alt="Gallery"
                      />
                      {profile.pictures.length > 1 && (
                        <>
                          <Button
                            variant="secondary"
                            size="icon"
                            className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => setCurrentImageIndex((prev) => (prev === 0 ? profile.pictures.length - 1 : prev - 1))}
                          >
                            <ChevronLeft className="h-5 w-5" />
                          </Button>
                          <Button
                            variant="secondary"
                            size="icon"
                            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => setCurrentImageIndex((prev) => (prev === profile.pictures.length - 1 ? 0 : prev + 1))}
                          >
                            <ChevronRight className="h-5 w-5" />
                          </Button>
                        </>
                      )}
                    </div>
                    
                    {profile.pictures.length > 1 && (
                      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                        {profile.pictures.map((pic: any, index: number) => (
                          <button
                            key={pic.id}
                            onClick={() => setCurrentImageIndex(index)}
                            className={`relative flex-shrink-0 w-24 h-24 rounded-xl overflow-hidden border-2 transition-all ${
                              currentImageIndex === index ? "border-primary shadow-lg scale-95" : "border-transparent opacity-60 hover:opacity-100"
                            }`}
                          >
                            <img src={pic.imageUrl} className="w-full h-full object-cover" alt="Thumbnail" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Why Book with Us */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border-none shadow-md bg-white">
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg text-primary">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">Secure Booking</h4>
                    <p className="text-xs text-muted-foreground">Your data is always protected</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-none shadow-md bg-white">
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="p-2 bg-green-500/10 rounded-lg text-green-600">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">Instant Confirmation</h4>
                    <p className="text-xs text-muted-foreground">Get notified immediately</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Right Column: Calendar & Booking */}
          <div className="lg:col-span-5">
            <div className="sticky top-6 space-y-6">
              <Card className="border-none shadow-2xl shadow-black/10 overflow-hidden">
                <CardHeader className="bg-primary text-white pb-8">
                  <CardTitle className="text-xl font-bold flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5" />
                    Select a Date
                  </CardTitle>
                  <p className="text-primary-foreground/80 text-sm">Choose an available date for your appointment</p>
                </CardHeader>
                
                <CardContent className="p-0 -mt-4">
                  <div className="bg-white rounded-t-3xl p-6">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      disabled={(date) => date < startOfDay(new Date()) || isDateUnavailable(date)}
                      className="rounded-xl border-none p-0 w-full"
                      classNames={{
                        head_cell: "text-muted-foreground font-bold text-xs uppercase w-full",
                        cell: "text-center p-0 relative focus-within:relative focus-within:z-20 w-full h-12",
                        day: "h-10 w-10 p-0 font-normal aria-selected:opacity-100 hover:bg-primary/10 hover:text-primary rounded-full transition-all flex items-center justify-center mx-auto",
                        day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground font-bold shadow-lg shadow-primary/30",
                        day_today: "bg-muted text-foreground font-bold",
                        day_disabled: "text-muted-foreground/30 line-through",
                      }}
                    />
                  </div>
                </CardContent>
                
                <CardFooter className="bg-white p-6 pt-0">
                  <Button 
                    className="w-full h-14 text-lg font-bold shadow-xl shadow-primary/20 transition-all active:scale-95"
                    disabled={!selectedDate}
                    onClick={handleBookNow}
                  >
                    {selectedDate ? `Book for ${format(selectedDate, "MMM dd, yyyy")}` : "Select a Date to Continue"}
                  </Button>
                </CardFooter>
              </Card>

              <div className="text-center">
                <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Located at {profile.location}
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Booking Form Dialog */}
      <Dialog open={showBookingDialog} onOpenChange={setShowBookingDialog}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden border-none shadow-2xl">
          <div className="bg-primary p-8 text-white relative">
            <DialogHeader className="space-y-2">
              <DialogTitle className="text-3xl font-black">Finalize Booking</DialogTitle>
              <DialogDescription className="text-primary-foreground/90 font-medium">
                {selectedDate && format(selectedDate, "EEEE, MMMM dd, yyyy")}
              </DialogDescription>
            </DialogHeader>
            <div className="absolute -bottom-4 right-8 w-16 h-16 bg-white rounded-2xl shadow-xl flex items-center justify-center text-primary">
              <Clock className="w-8 h-8" />
            </div>
          </div>

          <div className="p-8 pt-10 space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name"
                    placeholder="John Doe"
                    className="pl-10 h-12 bg-muted/30 border-none focus-visible:ring-primary"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    placeholder="+234 800 000 0000"
                    className="pl-10 h-12 bg-muted/30 border-none focus-visible:ring-primary"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes" className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Special Requests (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Any specific details you'd like to share?"
                  className="bg-muted/30 border-none focus-visible:ring-primary min-h-[100px] resize-none"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

            <Button
              className="w-full h-14 text-lg font-bold shadow-lg shadow-primary/20"
              onClick={handleConfirmBooking}
              disabled={bookingLoading || !customerName || !customerPhone}
            >
              {bookingLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Confirming...
                </>
              ) : (
                "Confirm Appointment"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={handleCloseSuccessDialog}>
        <DialogContent className="sm:max-w-md border-none shadow-2xl p-0 overflow-hidden">
          <div className="flex flex-col items-center justify-center py-12 px-8 text-center bg-white">
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6 animate-bounce">
              <CheckCircle2 className="w-14 h-14 text-green-600" />
            </div>
            <DialogTitle className="text-3xl font-black mb-3">You're All Set!</DialogTitle>
            <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
              Great news! Your booking with <span className="font-bold text-foreground">{profile?.name}</span> is confirmed for <span className="font-bold text-primary">{selectedDate && format(selectedDate, "MMM dd, yyyy")}</span>.
            </p>
            <div className="w-full p-4 bg-muted/30 rounded-2xl mb-8 flex items-center gap-4 text-left">
              <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-primary">
                <Phone className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-muted-foreground">Contact Detail</p>
                <p className="font-bold">{customerPhone}</p>
              </div>
            </div>
            <Button className="w-full h-12 font-bold" onClick={() => handleCloseSuccessDialog(false)}>
              Got it, thanks!
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}