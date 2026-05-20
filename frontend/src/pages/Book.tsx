import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, MapPin, Calendar as CalendarIcon, ChevronLeft, ChevronRight, CheckCircle2, User, Phone, X, Briefcase } from "lucide-react";
import { format, startOfDay } from "date-fns";
import { getPublicBookingProfile, getUnavailableDates, createBooking } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

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
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<string>("");
  const [customService, setCustomService] = useState("");

  const availableServices = [
    ...(profile?.services || []),
    "Other (Custom)"
  ];

  const timeSlots = [
    "08:00 AM", "08:30 AM", "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM",
    "11:00 AM", "11:30 AM", "12:00 PM", "12:30 PM", "01:00 PM", "01:30 PM",
    "02:00 PM", "02:30 PM", "03:00 PM", "03:30 PM", "04:00 PM", "04:30 PM",
    "05:00 PM", "05:30 PM", "06:00 PM", "06:30 PM", "07:00 PM", "07:30 PM",
    "08:00 PM"
  ];

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
     const serviceText = selectedService === "Other (Custom)" ? customService : selectedService;
     const bookingNotes = [
       serviceText ? `Service: ${serviceText}` : null,
       `Time: ${selectedTime}`,
       notes ? `Notes: ${notes}` : null
     ].filter(Boolean).join(" | ");

     try {
       await createBooking({
         bookingProfileId: profile.id,
         date: format(selectedDate, "yyyy-MM-dd"),
         customerName,
         customerPhone,
         notes: bookingNotes
       });
       
       setShowBookingDialog(false);
       setShowSuccessDialog(true);
       setNotes("");
       setSelectedDate(undefined);
       setSelectedTime(null);
       setSelectedService("");
       setCustomService("");
       
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
      setSelectedService("");
      setCustomService("");
      setSelectedTime(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading booking page...</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Page Not Found</CardTitle>
          </CardHeader>
          <CardContent className="text-center text-muted-foreground">
            {error || "The booking page you're looking for doesn't exist."}
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
    <div className="min-h-screen bg-muted/30 pb-20">
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column: Details & Images */}
          <div className="space-y-6">
            <Card className="shadow-sm border-none bg-transparent">
              <CardContent className="space-y-6 p-0">
                <div className="space-y-2">
                  <h1 className="text-4xl font-black tracking-tight">{profile.name}</h1>
                  <p className="text-muted-foreground flex items-center text-lg">
                    <MapPin className="h-5 w-5 mr-2 text-primary" />
                    {profile.location}
                  </p>
                </div>

                <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed text-lg">
                  {profile.description || "Welcome! Please select a date to book your appointment."}
                </p>

                {profile.pictures?.length > 0 && (
                  <div className="space-y-4">
                    <div className="relative rounded-lg overflow-hidden aspect-video bg-muted border">
                      <img 
                        src={profile.pictures[currentImageIndex].imageUrl} 
                        className="w-full h-full object-cover"
                        alt="Gallery"
                      />
                      {profile.pictures.length > 1 && (
                        <>
                          <Button
                            variant="secondary"
                            size="icon"
                            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full opacity-80 hover:opacity-100"
                            onClick={() => setCurrentImageIndex((prev) => (prev === 0 ? profile.pictures.length - 1 : prev - 1))}
                          >
                            <ChevronLeft className="h-5 w-5" />
                          </Button>
                          <Button
                            variant="secondary"
                            size="icon"
                            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full opacity-80 hover:opacity-100"
                            onClick={() => setCurrentImageIndex((prev) => (prev === profile.pictures.length - 1 ? 0 : prev + 1))}
                          >
                            <ChevronRight className="h-5 w-5" />
                          </Button>
                        </>
                      )}
                    </div>
                    
                    {profile.pictures.length > 1 && (
                      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        {profile.pictures.map((pic: any, index: number) => (
                          <button
                            key={pic.id}
                            onClick={() => setCurrentImageIndex(index)}
                            className={`flex-shrink-0 w-20 h-20 rounded-md overflow-hidden border-2 transition-all ${
                              currentImageIndex === index ? "border-primary" : "border-transparent opacity-60 hover:opacity-100"
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
          </div>

          {/* Right Column: Selection */}
          <div className="space-y-6">
            <Card className="shadow-sm">
              {!selectedDate ? (
                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CalendarIcon className="h-5 w-5" />
                      Select a Date
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      disabled={(date) => date < startOfDay(new Date()) || isDateUnavailable(date)}
                      className="rounded-md border mx-auto"
                    />
                  </CardContent>
                  <CardFooter>
                    <Button 
                      className="w-full h-12 font-bold" 
                      disabled={!selectedDate}
                    >
                      Choose a Date
                    </Button>
                  </CardFooter>
                </div>
              ) : (
                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <CalendarIcon className="h-5 w-5" />
                        Select Time
                      </CardTitle>
                      <Button variant="ghost" size="sm" onClick={() => { setSelectedDate(undefined); setSelectedTime(null); }}>
                        Change Date
                      </Button>
                    </div>
                    <p className="text-sm text-primary font-bold mt-1">
                      {format(selectedDate, "EEEE, MMMM dd")}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-2 max-h-[400px] overflow-y-auto pr-2 scrollbar-hide">
                      {timeSlots.map((time) => (
                        <Button
                          key={time}
                          variant={selectedTime === time ? "default" : "outline"}
                          className={`h-11 font-medium ${selectedTime === time ? "shadow-md" : ""}`}
                          onClick={() => setSelectedTime(time)}
                        >
                          {time}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      className="w-full h-12 font-bold shadow-lg shadow-primary/20" 
                      disabled={!selectedTime}
                      onClick={handleBookNow}
                    >
                      {selectedTime ? `Book for ${selectedTime}` : "Choose a Time"}
                    </Button>
                  </CardFooter>
                </div>
              )}
            </Card>
          </div>
        </div>
      </main>

      {/* Booking Form Dialog */}
      <Dialog open={showBookingDialog} onOpenChange={setShowBookingDialog}>
        <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Complete Your Booking</DialogTitle>
            <DialogDescription>
              {selectedDate && format(selectedDate, "EEEE, MMMM dd, yyyy")} at {selectedTime}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Service *</Label>
              <Select value={selectedService} onValueChange={setSelectedService}>
                <SelectTrigger className="w-full">
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="What service do you need?" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {availableServices.map((service) => (
                    <SelectItem key={service} value={service}>
                      {service}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedService === "Other (Custom)" && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                <Label htmlFor="custom-service">Specify Service *</Label>
                <Input
                  id="custom-service"
                  placeholder="Enter the service you need"
                  value={customService}
                  onChange={(e) => setCustomService(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Your Full Name *</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="name"
                  placeholder="John Doe"
                  className="pl-10"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number *</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  placeholder="+234 000 000 0000"
                  className="pl-10"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Any special requests?"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              className="w-full h-12"
              onClick={handleConfirmBooking}
              disabled={
                bookingLoading || 
                !customerName || 
                !customerPhone || 
                !selectedService || 
                (selectedService === "Other (Custom)" && !customService)
              }
            >
              {bookingLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Confirming...
                </>
              ) : (
                "Confirm Appointment"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={handleCloseSuccessDialog}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <DialogTitle className="text-2xl font-bold mb-2">Booking Confirmed!</DialogTitle>
            <p className="text-muted-foreground mb-6">
              Thank you for booking <strong>{selectedService === "Other (Custom)" ? customService : selectedService}</strong> with {profile?.name} for {selectedDate && format(selectedDate, "MMM dd")} at {selectedTime}. We have received your request and will contact you shortly at {customerPhone}.
            </p>
            <Button className="w-full h-12" onClick={() => handleCloseSuccessDialog(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
