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
import { Loader2, MapPin, Calendar as CalendarIcon, ChevronLeft, ChevronRight, CheckCircle2, User, Phone, X, Briefcase, Maximize2 } from "lucide-react";
import { format, startOfDay } from "date-fns";
import { getPublicBookingProfile, getUnavailableDates, createBooking } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

export default function PublicBookingPage() {
  const { publicId } = useParams<{ publicId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [unavailabilityData, setUnavailabilityData] = useState<{
    unavailableDates: { date: string; startTime?: string | null; endTime?: string | null }[];
    bookings: { date: string; time?: string | null }[];
  }>({ unavailableDates: [], bookings: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [bookingLoading, setBookingLoading] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
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
        const [profileData, data] = await Promise.all([
          getPublicBookingProfile(publicId),
          getUnavailableDates(publicId)
        ]);
        setProfile(profileData || null);
        setUnavailabilityData(data);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Failed to load booking profile");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [publicId]);

  const timeToMinutes = (t: string) => {
    if (!t) return 0;
    const [timePart, meridiem] = t.split(" ");
    let [hours, minutes] = timePart.split(":").map(Number);
    if (meridiem === "PM" && hours !== 12) hours += 12;
    if (meridiem === "AM" && hours === 12) hours = 0;
    return hours * 60 + minutes;
  };

  const isTimeSlotUnavailable = (date: Date, time: string) => {
    const dateStr = format(date, "yyyy-MM-dd");
    
    // Check if it's already booked
    if (unavailabilityData.bookings.some(b => b.date === dateStr && b.time === time)) {
      return true;
    }
    
    // Check if it falls within an unavailable time range
    const timeRanges = unavailabilityData.unavailableDates.filter(u => u.date === dateStr && u.startTime && u.endTime);
    
    if (timeRanges.length > 0) {
      const slotMinutes = timeToMinutes(time);
      
      return timeRanges.some(range => {
        const start = timeToMinutes(range.startTime!);
        const end = timeToMinutes(range.endTime!);
        // If a slot is exactly at the start or end, it's considered unavailable
        return slotMinutes >= start && slotMinutes <= end;
      });
    }
    
    return false;
  };

  const isDateUnavailable = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    
    // Check if the whole day is manually blocked
    const isFullDayBlocked = unavailabilityData.unavailableDates.some(u => u.date === dateStr && !u.startTime && !u.endTime);
    if (isFullDayBlocked) return true;

    // Check if every single defined time slot is either booked or blocked
    // If all slots are taken, the date should be disabled in the calendar
    const allSlotsUnavailable = timeSlots.every(slot => isTimeSlotUnavailable(date, slot));
    
    return allSlotsUnavailable;
  };

  const handleBookNow = () => {
    if (!selectedDate) return;
    setShowBookingDialog(true);
  };

   const handleConfirmBooking = async () => {
     if (!selectedDate || !customerName || !customerPhone || !publicId || selectedServices.length === 0) return;

     setBookingLoading(true);
     const services = selectedServices.map(s => s === "Other (Custom)" ? customService : s).filter(Boolean);
     const serviceText = services.join(", ");
     const bookingNotes = [
       serviceText ? `Services: ${serviceText}` : null,
       notes ? `Notes: ${notes}` : null
     ].filter(Boolean).join(" | ");

     try {
       await createBooking({
         bookingProfileId: profile.id,
         date: format(selectedDate, "yyyy-MM-dd"),
         time: selectedTime || undefined,
         customerName,
         customerPhone,
         notes: bookingNotes
       });
       
       setShowBookingDialog(false);
       setShowSuccessDialog(true);
       setNotes("");
       setSelectedDate(undefined);
       setSelectedTime(null);
       setSelectedServices([]);
       setCustomService("");
       
       const data = await getUnavailableDates(publicId);
       setUnavailabilityData(data);
       
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
      setSelectedServices([]);
      setCustomService("");
      setSelectedTime(null);
    }
  };

  const toggleService = (service: string) => {
    setSelectedServices(prev => 
      prev.includes(service) 
        ? prev.filter(s => s !== service) 
        : [...prev, service]
    );
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
                  <div className="flex flex-wrap justify-between items-start gap-4">
                    <h1 className="text-4xl font-black tracking-tight">{profile.name}</h1>
                    {profile.business?.website && (
                      <Button asChild variant="outline" size="sm">
                        <a 
                          href={profile.business.website.startsWith('http') ? profile.business.website : `https://${profile.business.website}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                        >
                          Visit Website
                        </a>
                      </Button>
                    )}
                  </div>
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
                    <div 
                      className="relative rounded-lg overflow-hidden aspect-video bg-muted border cursor-pointer group"
                      onClick={() => setShowImageModal(true)}
                    >
                      <img 
                        src={profile.pictures[currentImageIndex].imageUrl} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        alt="Gallery"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <Maximize2 className="text-white opacity-0 group-hover:opacity-100 transition-opacity h-10 w-10" />
                      </div>
                      
                      {profile.pictures.length > 1 && (
                        <div className="absolute bottom-4 right-4">
                          <Badge variant="secondary" className="bg-black/50 text-white border-none backdrop-blur-md px-3 py-1 text-sm font-medium">
                            +{profile.pictures.length - 1} more photos
                          </Badge>
                        </div>
                      )}

                      {profile.pictures.length > 1 && (
                        <>
                          <Button
                            variant="secondary"
                            size="icon"
                            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full opacity-0 group-hover:opacity-80 hover:!opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCurrentImageIndex((prev) => (prev === 0 ? profile.pictures.length - 1 : prev - 1));
                            }}
                          >
                            <ChevronLeft className="h-5 w-5" />
                          </Button>
                          <Button
                            variant="secondary"
                            size="icon"
                            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full opacity-0 group-hover:opacity-80 hover:!opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCurrentImageIndex((prev) => (prev === profile.pictures.length - 1 ? 0 : prev + 1));
                            }}
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
                      {timeSlots
                        .filter(time => !isTimeSlotUnavailable(selectedDate, time))
                        .map((time) => (
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
          <div className="space-y-6 py-4">
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

            <div className="space-y-3">
              <Label className="text-base font-semibold flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Select Services *
              </Label>
              <div className="grid grid-cols-1 gap-2 border rounded-lg p-3 bg-muted/20">
                {availableServices.map((service) => (
                  <div key={service} className="flex items-center space-x-3 space-y-0 rounded-md p-2 hover:bg-muted/50 transition-colors">
                    <Checkbox
                      id={`service-${service}`}
                      checked={selectedServices.includes(service)}
                      onCheckedChange={() => toggleService(service)}
                    />
                    <Label
                      htmlFor={`service-${service}`}
                      className="text-sm font-medium leading-none cursor-pointer flex-1 py-1"
                    >
                      {service}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {selectedServices.includes("Other (Custom)") && (
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
                selectedServices.length === 0 || 
                (selectedServices.includes("Other (Custom)") && !customService)
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

      {/* Image Gallery Modal */}
      <Dialog open={showImageModal} onOpenChange={setShowImageModal}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black/95 border-none">
          <div className="relative aspect-video w-full flex items-center justify-center">
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-4 text-white hover:bg-white/20 z-10"
              onClick={() => setShowImageModal(false)}
            >
              <X className="h-6 w-6" />
            </Button>
            
            <img 
              src={profile.pictures[currentImageIndex].imageUrl} 
              className="max-w-full max-h-full object-contain"
              alt="Full view"
            />

            {profile.pictures.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 h-12 w-12 rounded-full"
                  onClick={() => setCurrentImageIndex((prev) => (prev === 0 ? profile.pictures.length - 1 : prev - 1))}
                >
                  <ChevronLeft className="h-8 w-8" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 h-12 w-12 rounded-full"
                  onClick={() => setCurrentImageIndex((prev) => (prev === profile.pictures.length - 1 ? 0 : prev + 1))}
                >
                  <ChevronRight className="h-8 w-8" />
                </Button>
              </>
            )}
          </div>
          <div className="p-4 bg-black/50 backdrop-blur-sm flex justify-center gap-2 overflow-x-auto">
            {profile.pictures.map((pic: any, index: number) => (
              <button
                key={pic.id}
                onClick={() => setCurrentImageIndex(index)}
                className={`flex-shrink-0 w-16 h-16 rounded overflow-hidden border-2 transition-all ${
                  currentImageIndex === index ? "border-primary" : "border-white/20 opacity-50 hover:opacity-100"
                }`}
              >
                <img src={pic.imageUrl} className="w-full h-full object-cover" alt="Thumbnail" />
              </button>
            ))}
          </div>
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
              Thank you for booking <strong>{selectedServices.map(s => s === "Other (Custom)" ? customService : s).filter(Boolean).join(", ")}</strong> with {profile?.name} for {selectedDate && format(selectedDate, "MMM dd")} at {selectedTime}. We have received your request and will contact you shortly at {customerPhone}.
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
