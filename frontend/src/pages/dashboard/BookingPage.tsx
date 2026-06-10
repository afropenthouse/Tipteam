import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Calendar as CalendarIcon, Upload, X, Copy, Plus, Edit, Trash2, Share2, Eye, MapPin, Phone, User, Clock, MessageSquare, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectItem, SelectContent, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { listBookingProfiles, createBookingProfile, updateBookingProfile, deleteBookingProfile, uploadBookingPictures, deleteBookingPicture, addUnavailableDates, getBookingShareUrl, getBookingsForProfile, listBusinesses, getAllBookings, deleteBooking } from "@/lib/api";
import type { Booking, Business } from "@/lib/api";

const timeSlots = [
  "08:00 AM", "08:30 AM", "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM",
  "11:00 AM", "11:30 AM", "12:00 PM", "12:30 PM", "01:00 PM", "01:30 PM",
  "02:00 PM", "02:30 PM", "03:00 PM", "03:30 PM", "04:00 PM", "04:30 PM",
  "05:00 PM", "05:30 PM", "06:00 PM", "06:30 PM", "07:00 PM", "07:30 PM",
  "08:00 PM"
];

export default function BookingPage() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState<any>(null);
  const [bookings, setBookings] = useState<Record<string, Booking[]>>({});
  const [showBookingsDialog, setShowBookingsDialog] = useState(false);
  const [selectedProfileForBookings, setSelectedProfileForBookings] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState(1);
  
  // Delete confirmation
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");
  const [itemToDelete, setItemToDelete] = useState<{ id: string, type: 'profile' | 'booking', name: string } | null>(null);

  // Helper to format UTC date strings correctly for local display
  const formatUTCDate = (dateStr: string, formatStr: string) => {
    // Append Z if not present to ensure UTC interpretation
    const date = new Date(dateStr.endsWith('Z') ? dateStr : `${dateStr}Z`);
    // Adjust for timezone offset to get the original date as intended
    const userTimezoneOffset = date.getTimezoneOffset() * 60000;
    const adjustedDate = new Date(date.getTime() + userTimezoneOffset);
    return format(adjustedDate, formatStr);
  };
  
   // Form data
   const [name, setName] = useState("");
   const [location, setLocation] = useState("");
   const [description, setDescription] = useState("");
   const [pictures, setPictures] = useState<File[]>([]);
   const [picturePreviews, setPicturePreviews] = useState<string[]>([]);
   const [existingPictures, setExistingPictures] = useState<{id: string, imageUrl: string}[]>([]);
   const [deletedPictureIds, setDeletedPictureIds] = useState<string[]>([]);
   const [businesses, setBusinesses] = useState<Business[]>([]);
   const [selectedBusinessId, setSelectedBusinessId] = useState<string>("none");
   const [hostServices, setHostServices] = useState<string[]>([]);
   const [newServiceInput, setNewServiceInput] = useState("");
   const [editingServiceIndex, setEditingServiceIndex] = useState<number | null>(null);
   const [editingServiceValue, setEditingServiceValue] = useState("");
   
   // Unavailable dates
   const [unavailableDates, setUnavailableDates] = useState<{ id: string; date: Date; startTime?: string; endTime?: string }[]>([]);
   const [focusedDate, setFocusedDate] = useState<Date | undefined>(undefined);

   // Slot entry state (only for adding new slots)
   const [slotStartTime, setSlotStartTime] = useState<string>(timeSlots[0]);
   const [slotEndTime, setSlotEndTime] = useState<string>(timeSlots[timeSlots.length - 1]);

   useEffect(() => {
     fetchProfiles();
     fetchBusinesses();
     fetchAllBookings();
   }, []);

   const fetchAllBookings = async () => {
     try {
       const data = await getAllBookings();
       setAllBookings(data);
     } catch (error: any) {
       console.error("Failed to load all bookings:", error);
     }
   };

   const fetchBusinesses = async () => {
     try {
       const data = await listBusinesses();
       setBusinesses(data);
       if (data.length > 0 && selectedBusinessId === "none") {
         setSelectedBusinessId(data[0].id);
         setName(data[0].name);
         setLocation(data[0].address);
       }
     } catch (error: any) {
       console.error("Failed to load businesses:", error);
     }
   };

  const fetchBookingsForProfile = async (profileId: string) => {
    try {
      const data = await getBookingsForProfile(profileId);
      setBookings(prev => ({ ...prev, [profileId]: data }));
    } catch (error: any) {
      toast({ title: "Failed to load bookings", description: error.message, variant: "destructive" });
    }
  };

  const fetchProfiles = async () => {
    setLoading(true);
    try {
      const data = await listBookingProfiles();
      setProfiles(data);
    } catch (error: any) {
      toast({ title: "Failed to load profiles", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

    const resetForm = () => {
      const defaultBusiness = businesses.length > 0 ? businesses[0] : null;
      setName(defaultBusiness ? defaultBusiness.name : "");
      setLocation(defaultBusiness ? defaultBusiness.address : "");
      setDescription("");
      setPictures([]);
      setPicturePreviews([]);
      setExistingPictures([]);
      setDeletedPictureIds([]);
      setUnavailableDates([]);
      setFocusedDate(undefined);
      setHostServices([]);
      setNewServiceInput("");
      setEditingServiceIndex(null);
      setEditingServiceValue("");
      setSelectedBusinessId(defaultBusiness ? defaultBusiness.id : "none");
      setCurrentStep(1);
    };

  const handlePictureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + pictures.length + existingPictures.length > 10) {
      toast({ title: "Too many images", description: "Maximum 10 images allowed", variant: "destructive" });
      return;
    }
    
    setPictures([...pictures, ...files]);
    
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPicturePreviews(prev => [...prev, e.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removePicture = (index: number) => {
    setPictures(pictures.filter((_, i) => i !== index));
    setPicturePreviews(picturePreviews.filter((_, i) => i !== index));
  };

  const removeExistingPicture = (id: string) => {
    setExistingPictures(existingPictures.filter(p => p.id !== id));
    setDeletedPictureIds([...deletedPictureIds, id]);
  };

  const startEditingService = (index: number, value: string) => {
    setEditingServiceIndex(index);
    setEditingServiceValue(value);
  };

  const saveServiceEdit = (index: number) => {
    if (editingServiceValue.trim()) {
      const newServices = [...hostServices];
      newServices[index] = editingServiceValue.trim();
      setHostServices(newServices);
    }
    setEditingServiceIndex(null);
    setEditingServiceValue("");
  };

  const removeUnavailableSlot = (id: string) => {
    setUnavailableDates(unavailableDates.filter((d) => d.id !== id));
  };

  const addUnavailableSlot = (date: Date) => {
    setUnavailableDates(prev => [
      ...prev, 
      { id: Math.random().toString(36).substr(2, 9), date, startTime: timeSlots[0], endTime: timeSlots[timeSlots.length - 1] }
    ]);
  };

  const updateUnavailableTime = (id: string, startTime?: string, endTime?: string) => {
    setUnavailableDates(prev => prev.map(d => 
      d.id === id ? { ...d, startTime, endTime } : d
    ));
  };

   const formatDateForAPI = (date: Date) => format(date, "yyyy-MM-dd");

   const parseTimeToMinutes = (t: string) => {
     const [time, meridiem] = t.split(" ");
     let [h, m] = time.split(":").map(Number);
     if (meridiem === "PM" && h !== 12) h += 12;
     if (meridiem === "AM" && h === 12) h = 0;
     return h * 60 + m;
   };

   const formatTimeRange = (start?: string, end?: string) => `${start || "?"} – ${end || "?"}`;

    const addSlotForDate = (date: Date) => {
      if (parseTimeToMinutes(slotEndTime) <= parseTimeToMinutes(slotStartTime)) {
        toast({ title: "Invalid range", description: "End time must be after start time", variant: "destructive" });
        return;
      }
      setUnavailableDates(prev => [...prev, {
        id: Math.random().toString(36).substr(2, 9),
        date, startTime: slotStartTime, endTime: slotEndTime
      }]);
      setSlotStartTime(timeSlots[0]);
      setSlotEndTime(timeSlots[timeSlots.length - 1]);
    };

    const handleSave = async () => {
     if (!name || !location) {
       toast({ title: "Missing fields", description: "Please fill in all required fields", variant: "destructive" });
       return;
     }
 
     setLoading(true);
     try {
       let profile: any;
       if (editingProfile) {
         // 1. Update basic info
         profile = await updateBookingProfile(editingProfile.id, {
           name,
           location,
           description: description || undefined,
           services: hostServices,
           businessId: selectedBusinessId === "none" ? undefined : selectedBusinessId
         });

         // 2. Handle deleted pictures
         if (deletedPictureIds.length > 0) {
           await Promise.all(deletedPictureIds.map(id => deleteBookingPicture(id)));
         }

         // 3. Upload new pictures if any
         if (pictures.length > 0) {
           await uploadBookingPictures(editingProfile.id, pictures);
         }
       } else {
         profile = await createBookingProfile({
           name,
           location,
           description: description || undefined,
           services: hostServices,
           businessId: selectedBusinessId === "none" ? undefined : selectedBusinessId
         });
 
         if (pictures.length > 0) {
           await uploadBookingPictures(profile.id, pictures);
         }
       }

       // Only save unavailable dates if they were changed or we're in Step 2
       // We allow empty array to clear existing dates if editing
       if (currentStep === 2) {
         const datesToSave = unavailableDates.map(d => ({
           date: formatDateForAPI(d.date),
           startTime: d.startTime === "all-day" ? null : d.startTime,
           endTime: d.endTime === "all-day" ? null : d.endTime
         }));
         
         // Only call API if there are dates to save OR we're editing (to clear existing)
         if (datesToSave.length > 0 || editingProfile) {
           await addUnavailableDates(profile.id, datesToSave, !!editingProfile);
         }
       }
 
       toast({ 
         title: editingProfile ? "Booking page updated" : "Booking page created", 
         description: `Your booking page is ready to share!` 
       });
       
       setShowModal(false);
       resetForm();
       fetchProfiles();
       fetchAllBookings();
     } catch (error: any) {
       toast({ 
         title: "Failed to save booking page", 
         description: error.message, 
         variant: "destructive" 
       });
     } finally {
       setLoading(false);
     }
   };

   const handleEdit = (profile: any) => {
     setEditingProfile(profile);
     setName(profile.name);
     setLocation(profile.location);
     setDescription(profile.description || "");
     setHostServices(profile.services || []);
     setExistingPictures(profile.pictures?.map((p: any) => ({ id: p.id, imageUrl: p.imageUrl })) || []);
     setDeletedPictureIds([]);
     setPictures([]);
     setPicturePreviews([]);
     
     const dates = profile.unavailableDates?.map((d: any) => {
       // Safely parse the date string to avoid timezone shifts
       // Most API dates come as ISO strings. We want to treat the date part as local.
       const dateObj = new Date(d.date);
       const localDate = new Date(
         dateObj.getUTCFullYear(),
         dateObj.getUTCMonth(),
         dateObj.getUTCDate()
       );
       
       return {
         id: d.id,
         date: localDate,
         startTime: d.startTime,
         endTime: d.endTime
       };
     }) || [];
     
     setUnavailableDates(dates);
     setSelectedBusinessId(profile.businessId || "none");
     setCurrentStep(1);
     setShowModal(true);
   };

   const handleDelete = (profile: any) => {
     setItemToDelete({ id: profile.id, type: 'profile', name: profile.name });
     setDeleteConfirmationText("");
     setShowDeleteModal(true);
   };

   const handleDeleteBooking = (booking: any) => {
     setItemToDelete({ id: booking.id, type: 'booking', name: `Appointment for ${booking.customerName}` });
     setDeleteConfirmationText("");
     setShowDeleteModal(true);
   };

   const confirmDelete = async () => {
     if (deleteConfirmationText !== "DELETE" || !itemToDelete) return;
     
     try {
       if (itemToDelete.type === 'profile') {
         await deleteBookingProfile(itemToDelete.id);
         toast({ title: "Booking profile deleted" });
         fetchProfiles();
       } else {
         await deleteBooking(itemToDelete.id);
         toast({ title: "Appointment deleted" });
         fetchAllBookings();
         // If we're in the profile bookings dialog, refresh that too
         if (selectedProfileForBookings) {
           fetchBookingsForProfile(selectedProfileForBookings.id);
         }
       }
       setShowDeleteModal(false);
       setItemToDelete(null);
       setDeleteConfirmationText("");
     } catch (error: any) {
       toast({ title: "Failed to delete", description: error.message, variant: "destructive" });
     }
   };

  const copyShareLink = (publicId: string) => {
    const url = getBookingShareUrl(publicId);
    navigator.clipboard.writeText(url);
    toast({ title: "Link copied to clipboard" });
  };

  const handleOpenModal = () => {
    resetForm();
    setEditingProfile(null);
    setShowModal(true);
  };

  const handleViewBookings = (profile: any) => {
    setSelectedProfileForBookings(profile);
    setShowBookingsDialog(true);
    fetchBookingsForProfile(profile.id);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-primary">Booking Management</h1>
          <p className="text-muted-foreground">Create booking pages and manage your appointments</p>
        </div>
        
        <div className="flex gap-3">
          <Dialog open={showModal} onOpenChange={setShowModal}>
            <DialogTrigger asChild>
              <Button onClick={handleOpenModal} className="shadow-lg shadow-primary/20">
                <Plus className="h-4 w-4 mr-2" />
                New Booking Page
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
              <div className="p-6 border-b sticky top-0 bg-background z-10">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-black">
                    {editingProfile ? "Edit Booking Page" : "Create Booking Page"}
                  </DialogTitle>
                  <div className="flex items-center gap-2 mt-2">
                    <div className={`h-2 flex-1 rounded-full ${currentStep >= 1 ? 'bg-primary' : 'bg-muted'}`} />
                    <div className={`h-2 flex-1 rounded-full ${currentStep >= 2 ? 'bg-primary' : 'bg-muted'}`} />
                  </div>
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-1">
                    <span>Business & Images</span>
                    <span>Unavailable Dates</span>
                  </div>
                </DialogHeader>
              </div>
              
              <div className="p-6">
                {currentStep === 1 ? (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-base font-bold">Business</Label>
                        <Select
                          value={selectedBusinessId}
                          onValueChange={(val) => {
                            setSelectedBusinessId(val);
                            const business = businesses.find(b => b.id === val);
                            if (business) {
                              setName(business.name);
                              setLocation(business.address);
                            }
                          }}
                        >
                          <SelectTrigger className="h-12 border-2 focus:ring-primary">
                            <SelectValue placeholder="Select a business" />
                          </SelectTrigger>
                          <SelectContent>
                            {businesses.map(business => (
                              <SelectItem key={business.id} value={business.id}>
                                {business.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-base font-bold">Location <span className="text-red-500">*</span></Label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
                          <Input
                            placeholder="e.g., 123 Main St, Lagos"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            className="h-12 pl-10 border-2 focus:ring-primary"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-base font-bold">Description</Label>
                        <Textarea
                          placeholder="Tell customers about your business..."
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          rows={3}
                          className="border-2 focus:ring-primary resize-none"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-base font-bold">Services Offered</Label>
                        <div className="flex gap-2">
                          <Input
                            placeholder="e.g., Haircut, Massage, Consulting"
                            value={newServiceInput}
                            onChange={(e) => setNewServiceInput(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                if (newServiceInput.trim()) {
                                  setHostServices([...hostServices, newServiceInput.trim()]);
                                  setNewServiceInput("");
                                }
                              }
                            }}
                            className="h-11 border-2 focus:ring-primary"
                          />
                          <Button 
                            type="button" 
                            variant="secondary" 
                            className="h-11"
                            onClick={() => {
                              if (newServiceInput.trim()) {
                                setHostServices([...hostServices, newServiceInput.trim()]);
                                setNewServiceInput("");
                              }
                            }}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        {hostServices.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2 p-3 bg-muted/30 rounded-xl border border-dashed">
                            {hostServices.map((service, index) => (
                              editingServiceIndex === index ? (
                                <div key={index} className="flex items-center gap-1 bg-background border-2 border-primary rounded-lg px-2 py-1 animate-in zoom-in-95 duration-200">
                                  <Input
                                    value={editingServiceValue}
                                    onChange={(e) => setEditingServiceValue(e.target.value)}
                                    onBlur={() => saveServiceEdit(index)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        saveServiceEdit(index);
                                      } else if (e.key === 'Escape') {
                                        setEditingServiceIndex(null);
                                      }
                                    }}
                                    className="h-7 min-w-[100px] border-none focus-visible:ring-0 p-0 text-sm font-medium"
                                    autoFocus
                                  />
                                </div>
                              ) : (
                                <Badge 
                                  key={index} 
                                  variant="secondary" 
                                  className="pl-3 pr-1 py-1 flex items-center gap-1 group cursor-pointer hover:bg-primary/10 hover:text-primary transition-colors"
                                  onClick={() => startEditingService(index, service)}
                                  title="Click to edit"
                                >
                                  {service}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground rounded-full"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setHostServices(hostServices.filter((_, i) => i !== index));
                                    }}
                                  >
                                    <X className="h-2.5 w-2.5" />
                                  </Button>
                                </Badge>
                              )
                            ))}
                          </div>
                        )}
                        <p className="text-[10px] text-muted-foreground font-medium italic">Add services so customers can choose what they need.</p>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-base font-bold">Business Pictures</Label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <Label htmlFor="pictures-modal" className="cursor-pointer">
                            <div className="border-2 border-dashed rounded-xl aspect-square flex flex-col items-center justify-center hover:bg-primary/5 hover:border-primary/50 transition-all group">
                              <div className="p-2 bg-primary/10 rounded-full group-hover:scale-110 transition-transform">
                                <Upload className="h-6 w-6 text-primary" />
                              </div>
                              <span className="text-[10px] font-bold uppercase mt-2 text-muted-foreground">Add Photo</span>
                            </div>
                            <input
                              id="pictures-modal"
                              type="file"
                              accept="image/*"
                              multiple
                              onChange={handlePictureUpload}
                              className="hidden"
                            />
                          </Label>

                          {existingPictures.map((pic) => (
                            <div key={pic.id} className="relative aspect-square rounded-xl overflow-hidden group border-2">
                              <img src={pic.imageUrl} alt="Existing" className="w-full h-full object-cover" />
                              <button
                                onClick={() => removeExistingPicture(pic.id)}
                                className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}

                          {picturePreviews.map((url, index) => (
                            <div key={`new-${index}`} className="relative aspect-square rounded-xl overflow-hidden group border-2">
                              <img src={url} alt={`New ${index}`} className="w-full h-full object-cover" />
                              <button
                                onClick={() => removePicture(index)}
                                className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                        <p className="text-[10px] text-muted-foreground font-medium italic">Max 10 images allowed</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="bg-primary/5 rounded-xl p-4 border border-primary/10">
                      <p className="text-sm text-muted-foreground">
                        Select a date on the calendar and add the time ranges when you're unavailable. Customers won't be able to book during those periods.
                      </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <Label className="text-base font-bold">Select Date</Label>
                        <div className="border-2 rounded-xl p-2 bg-background">
                          <Calendar
                            mode="single"
                            selected={focusedDate}
                            onSelect={(date) => {
                              if (date) {
                                setFocusedDate(date);
                              }
                            }}
                            className="rounded-lg"
                            numberOfMonths={1}
                            disabled={{ before: new Date() }}
                            modifiers={{
                              hasSlots: unavailableDates.map(d => d.date),
                            }}
                            modifiersClassNames={{
                              hasSlots: "[&_button]:after:content-[''] [&_button]:after:block [&_button]:after:w-1.5 [&_button]:after:h-1.5 [&_button]:after:rounded-full [&_button]:after:bg-green-500 [&_button]:after:mx-auto [&_button]:after:mt-0.5",
                            }}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Dates with blocks</Label>
                          <div className="flex flex-wrap gap-2">
                            {Array.from(new Set(unavailableDates.map(d => d.date.getTime())))
                              .sort((a, b) => a - b)
                              .map(time => {
                                const date = new Date(time);
                                return (
                                  <Badge
                                    key={time}
                                    variant={focusedDate?.getTime() === time ? "default" : "secondary"}
                                    className="cursor-pointer py-1 px-2.5 rounded-lg font-bold text-xs"
                                    onClick={() => setFocusedDate(date)}
                                  >
                                    {format(date, "MMM dd")}
                                  </Badge>
                                );
                              })}
                            {unavailableDates.length === 0 && (
                              <p className="text-xs text-muted-foreground italic">No dates blocked yet.</p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {focusedDate ? (
                          <>
                            <div className="flex items-center justify-between">
                              <Label className="text-base font-black">{format(focusedDate, "EEEE, MMMM dd")}</Label>
                              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                {unavailableDates.filter(d => d.date.getTime() === focusedDate.getTime()).length} block{unavailableDates.filter(d => d.date.getTime() === focusedDate.getTime()).length !== 1 ? 's' : ''}
                              </span>
                            </div>


                            <div className="flex flex-row items-center gap-2">
                              <div className="flex items-center gap-2">
                                <Label className="text-[10px] font-bold uppercase text-muted-foreground">Start</Label>
                                <Select value={slotStartTime} onValueChange={setSlotStartTime}>
                                  <SelectTrigger className="h-8 w-24 border-2 font-medium text-xs">
                                    <SelectValue placeholder="—" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {timeSlots.map(t => (
                                      <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <span className="text-[10px] font-bold text-muted-foreground">to</span>
                                <Select value={slotEndTime} onValueChange={setSlotEndTime}>
                                  <SelectTrigger className="h-8 w-24 border-2 font-medium text-xs">
                                    <SelectValue placeholder="—" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {timeSlots.map(t => (
                                      <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <Button
                                type="button"
                                size="sm"
                                className="h-8 px-2.5 text-xs font-bold"
                                onClick={() => addSlotForDate(focusedDate!)}
                              >
                                Add
                              </Button>
                            </div>

                              <div className="flex flex-wrap items-center gap-2 pt-1">
                                {unavailableDates
                                  .filter(d => d.date.getTime() === focusedDate.getTime())
                                  .map((item) => (
                                    <span
                                      key={item.id}
                                      title={formatTimeRange(item.startTime, item.endTime)}
                                      onClick={(e) => { e.stopPropagation(); removeUnavailableSlot(item.id); }}
                                      className="inline-flex items-center gap-0.5 pl-2.5 pr-1 py-0.5 bg-muted/60 border border-dashed rounded-full text-xs font-mono font-bold text-muted-foreground hover:text-destructive hover:bg-destructive/10 hover:border-destructive/30 cursor-pointer transition-colors"
                                    >
                                      {formatTimeRange(item.startTime, item.endTime)}
                                      <X className="h-2.5 w-2.5 text-current" />
                                    </span>
                                  ))}
                                {unavailableDates.filter(d => d.date.getTime() === focusedDate.getTime()).length === 0 && (
                                  <p className="text-[10px] text-muted-foreground italic py-0.5">No blocks yet — add one above.</p>
                                )}
                              </div>
                          </>
                          ) : (
                          <div className="flex flex-col items-center justify-center h-full py-16 text-muted-foreground animate-in fade-in duration-500">
                            <CalendarIcon className="h-10 w-10 mb-3 opacity-10" />
                            <h4 className="text-base font-bold text-foreground/50">No Date Selected</h4>
                            <p className="text-xs max-w-[200px] text-center mt-1">Pick a date on the calendar to add or manage blocked times.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 border-t bg-muted/20 flex gap-3 sticky bottom-0 z-10">
                {currentStep === 1 ? (
                  <>
                    <Button variant="ghost" className="flex-1 h-12 font-bold" onClick={() => setShowModal(false)}>
                      Cancel
                    </Button>
                    <Button 
                      className="flex-[2] h-12 font-black shadow-lg shadow-primary/20" 
                      onClick={() => {
                        if (!name || !location) {
                          toast({ title: "Missing fields", description: "Business name and location are required", variant: "destructive" });
                          return;
                        }
                        setCurrentStep(2);
                      }}
                    >
                      Next
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" className="flex-1 h-12 font-bold" onClick={() => setCurrentStep(1)}>
                      Back
                    </Button>
                    <Button 
                      className="flex-[2] h-12 font-black shadow-lg shadow-primary/20" 
                      onClick={handleSave}
                      disabled={loading}
                    >
                      {loading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        editingProfile ? "Update Booking Page" : "Complete & Create Page"
                      )}
                    </Button>
                  </>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-primary/5 border-primary/10">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-xl">
                <CalendarIcon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Profiles</p>
                <h3 className="text-2xl font-bold">{profiles.length}</h3>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-green-500/5 border-green-500/10">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500/10 rounded-xl">
                <Clock className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Bookings</p>
                <h3 className="text-2xl font-bold">
                  {Math.max(allBookings.length, profiles.reduce((acc, p) => acc + (p.bookingsCount || 0), 0))}
                </h3>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-blue-500/5 border-blue-500/10">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-xl">
                <User className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Unique Customers</p>
                <h3 className="text-2xl font-bold">
                  {new Set(allBookings.map(b => b.customerPhone)).size}
                </h3>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="w-full">
        {loading ? (
          <div className="text-center py-20">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading booking pages...</p>
          </div>
        ) : profiles.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="text-center py-20">
              <div className="p-4 bg-muted rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <CalendarIcon className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No booking pages yet</h3>
              <p className="text-muted-foreground mb-6 max-w-sm mx-auto">Create your first booking page to start accepting appointments from customers.</p>
              <Button onClick={handleOpenModal}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Booking Page
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {profiles.map((profile) => (
              <Card key={profile.id} className="overflow-hidden flex flex-col hover:shadow-lg transition-all border-muted/60 group">
                <div className="relative aspect-video bg-muted overflow-hidden">
                  {profile.pictures && profile.pictures.length > 0 ? (
                    <img
                      src={profile.pictures[0].imageUrl}
                      alt={profile.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-gradient-to-br from-muted to-muted/50">
                      <CalendarIcon className="h-10 w-10 opacity-20" />
                    </div>
                  )}
                  <div className="absolute top-3 right-3 flex gap-2">
                    <Badge variant="secondary" className="bg-background/90 backdrop-blur-sm shadow-sm border-none font-bold">
                      {profile.bookingsCount || 0} Bookings
                    </Badge>
                  </div>
                </div>
                
                <CardHeader className="p-5 pb-2">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-xl font-bold truncate group-hover:text-primary transition-colors">{profile.name}</CardTitle>
                      <p className="text-sm text-muted-foreground flex items-center mt-1 font-medium">
                        <MapPin className="h-3.5 w-3.5 mr-1.5 text-primary" />
                        {profile.location}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="p-5 pt-0 flex-1">
                  {profile.business && (
                    <div className="mt-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                      {profile.business.name}
                    </div>
                  )}
                  {profile.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-3 leading-relaxed">
                      {profile.description}
                    </p>
                  )}
                </CardContent>
                
                <div className="p-5 pt-4 border-t bg-muted/20 flex gap-2 items-center justify-between mt-auto">
                  <Button
                    variant="default"
                    size="sm"
                    className="h-9 px-4 font-bold shadow-sm"
                    onClick={() => handleViewBookings(profile)}
                  >
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    Bookings
                  </Button>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-destructive hover:bg-destructive/10 hover:text-destructive transition-colors"
                      onClick={() => handleDelete(profile)}
                      title="Delete Profile"
                    >
                      <Trash2 className="h-4.5 w-4.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 hover:bg-background hover:text-primary transition-colors"
                      onClick={() => handleEdit(profile)}
                      title="Edit Profile"
                    >
                      <Edit className="h-4.5 w-4.5" />
                    </Button>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="h-9 px-3 hover:bg-background shadow-sm">
                          <Share2 className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-56 p-2" align="end">
                        <div className="space-y-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="w-full justify-start h-9 font-medium"
                            onClick={() => copyShareLink(profile.publicId)}
                          >
                            <Copy className="h-4 w-4 mr-2 text-primary" />
                            Copy Share Link
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="w-full justify-start h-9 font-medium"
                            onClick={() => window.open(`/book/${profile.publicId}`, '_blank')}
                          >
                            <Eye className="h-4 w-4 mr-2 text-primary" />
                            View Public Page
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Bookings Dialog */}
      <Dialog open={showBookingsDialog} onOpenChange={setShowBookingsDialog}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col p-0">
          <div className="p-6 border-b bg-muted/20">
            <DialogHeader>
              <DialogTitle className="text-2xl">Bookings for {selectedProfileForBookings?.name}</DialogTitle>
            </DialogHeader>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {selectedProfileForBookings && (
              <div className="space-y-6">
                {/* Bookings List Area */}
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="space-y-1">
                      <h3 className="text-xl font-bold flex items-center">
                        Appointments for {selectedProfileForBookings.name}
                        <Badge variant="secondary" className="ml-3 font-bold">
                          {bookings[selectedProfileForBookings.id]?.length || 0}
                        </Badge>
                      </h3>
                      <p className="text-sm text-muted-foreground flex items-center">
                        <MapPin className="h-3.5 w-3.5 mr-1.5" />
                        {selectedProfileForBookings.location}
                      </p>
                    </div>
                  </div>

                  {bookings[selectedProfileForBookings.id]?.length === 0 ? (
                    <div className="text-center py-20 border-2 border-dashed rounded-xl bg-muted/10">
                      <Clock className="h-10 w-10 mx-auto mb-3 opacity-20" />
                      <p className="text-muted-foreground">No appointments booked yet</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {bookings[selectedProfileForBookings.id]?.map((booking) => (
                        <Card key={booking.id} className="overflow-hidden border-l-4 border-l-primary shadow-sm hover:shadow-md transition-shadow">
                          <CardContent className="p-0">
                            <div className="grid md:grid-cols-12">
                              {/* Date Column */}
                              <div className="md:col-span-3 bg-primary/5 p-4 flex flex-col items-center justify-center border-r">
                                <span className="text-xs font-bold text-primary uppercase">
                                  {formatUTCDate(booking.date, "EEE")}
                                </span>
                                <span className="text-3xl font-black text-primary">
                                  {formatUTCDate(booking.date, "dd")}
                                </span>
                                <span className="text-xs font-medium text-muted-foreground">
                                  {formatUTCDate(booking.date, "MMM yyyy")}
                                </span>
                              </div>

                              {/* Info Column */}
                              <div className="md:col-span-9 p-5">
                                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                  <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center border text-lg font-bold">
                                        {booking.customerName.charAt(0).toUpperCase()}
                                      </div>
                                      <div>
                                        <h4 className="font-bold text-lg leading-none">{booking.customerName}</h4>
                                        <div className="flex items-center gap-3 mt-1.5 text-sm text-muted-foreground">
                                          <span className="flex items-center">
                                            <Phone className="h-3 w-3 mr-1" />
                                            {booking.customerPhone}
                                          </span>
                                        </div>
                                      </div>
                                    </div>

                                    {booking.notes && (
                                      <div className="bg-muted/50 p-4 rounded-xl border relative">
                                        <MessageSquare className="h-4 w-4 absolute -top-2 -left-2 text-primary bg-background rounded-full p-0.5" />
                                        <p className="text-sm font-medium text-muted-foreground mb-1">Customer Note:</p>
                                        <p className="text-sm italic">"{booking.notes}"</p>
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex flex-col items-end gap-2 text-right">
                                    <div className="flex gap-1 mb-1">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                        onClick={() => handleDeleteBooking(booking)}
                                        title="Delete Appointment"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                    <Badge variant="outline" className="font-mono text-[10px]">
                                      ID: {booking.id.slice(0, 8)}
                                    </Badge>
                                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                      <Clock className="h-3 w-3" />
                                      Booked {format(new Date(booking.createdAt), "MMM dd, HH:mm")}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          <div className="p-4 border-t bg-muted/20 flex justify-end">
            <Button variant="secondary" onClick={() => setShowBookingsDialog(false)}>
              Close View
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Confirm Deletion
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{itemToDelete?.name}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm font-medium">
              Please type <span className="font-bold text-destructive">DELETE</span> to confirm:
            </p>
            <Input
              value={deleteConfirmationText}
              onChange={(e) => setDeleteConfirmationText(e.target.value)}
              placeholder="Type DELETE here"
              className="border-destructive/30 focus-visible:ring-destructive"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteModal(false);
                setItemToDelete(null);
                setDeleteConfirmationText("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteConfirmationText !== "DELETE"}
            >
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
