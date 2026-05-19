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
import { listBookingProfiles, createBookingProfile, updateBookingProfile, deleteBookingProfile, uploadBookingPictures, addUnavailableDates, getBookingShareUrl, getBookingsForProfile, listBusinesses, getAllBookings, deleteBooking } from "@/lib/api";
import type { Booking, Business } from "@/lib/api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function BookingPage() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState<any>(null);
  const [bookings, setBookings] = useState<Record<string, Booking[]>>({});
  const [showBookingsDialog, setShowBookingsDialog] = useState(false);
  const [selectedProfileForBookings, setSelectedProfileForBookings] = useState<any>(null);
  
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
   const [existingPictureUrls, setExistingPictureUrls] = useState<string[]>([]);
   const [businesses, setBusinesses] = useState<Business[]>([]);
   const [selectedBusinessId, setSelectedBusinessId] = useState<string>("none");
   
   // Unavailable dates
  const [unavailableDates, setUnavailableDates] = useState<Date[]>([]);
  const [selectedDates, setSelectedDates] = useState<Date[] | undefined>(undefined);

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
      setName("");
      setLocation("");
      setDescription("");
      setPictures([]);
      setPicturePreviews([]);
      setExistingPictureUrls([]);
      setUnavailableDates([]);
      setSelectedDates(undefined);
      setSelectedBusinessId("none");
    };

  const handlePictureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + pictures.length > 10) {
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

   const handleAddDates = () => {
     if (selectedDates && selectedDates.length > 0) {
       setUnavailableDates([...unavailableDates, ...selectedDates]);
       setSelectedDates(undefined);
     }
   };

  const removeUnavailableDate = (index: number) => {
    setUnavailableDates(unavailableDates.filter((_, i) => i !== index));
  };

  const formatDateForAPI = (date: Date) => format(date, "yyyy-MM-dd");

   const handleSave = async () => {
     if (!name || !location) {
       toast({ title: "Missing fields", description: "Please fill in all required fields", variant: "destructive" });
       return;
     }
 
     setLoading(true);
     try {
       let profile: any;
       if (editingProfile) {
         profile = await updateBookingProfile(editingProfile.id, {
           name,
           location,
           description: description || undefined,
           businessId: selectedBusinessId === "none" ? undefined : selectedBusinessId
         });
       } else {
         profile = await createBookingProfile({
           name,
           location,
           description: description || undefined,
           businessId: selectedBusinessId === "none" ? undefined : selectedBusinessId
         });
 
         if (pictures.length > 0) {
           await uploadBookingPictures(profile.id, pictures);
         }
 
         if (unavailableDates.length > 0) {
           const dateStrings = unavailableDates.map(formatDateForAPI);
           await addUnavailableDates(profile.id, dateStrings);
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
     setExistingPictureUrls(profile.pictures?.map((p: any) => p.imageUrl) || []);
     const dates = profile.unavailableDates?.map((d: any) => new Date(d.date)) || [];
     setUnavailableDates(dates);
     setSelectedBusinessId(profile.businessId || "none");
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
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingProfile ? "Edit Booking Page" : "Create Booking Page"}</DialogTitle>
              </DialogHeader>
              
              <div className="grid gap-6 md:grid-cols-2 mt-4">
                {/* Form Section */}
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Business Details</CardTitle>
                    </CardHeader>
                     <CardContent className="space-y-4">
                       <div className="space-y-2">
                          <Label>Associated Business</Label>
                          <Select
                            value={selectedBusinessId}
                            onValueChange={(val) => {
                              setSelectedBusinessId(val);
                              if (val !== "none") {
                                const business = businesses.find(b => b.id === val);
                                if (business) {
                                  setName(business.name);
                                }
                              }
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select a business" />
                            </SelectTrigger>
                            <SelectContent>
                              {businesses.map(business => (
                                <SelectItem key={business.id} value={business.id}>
                                  {business.name}
                                </SelectItem>
                              ))}
                              <SelectItem value="none">
                                None
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                       {selectedBusinessId === "none" && (
                         <div className="space-y-2">
                           <Label>Business Name <span className="text-red-500">*</span></Label>
                           <Input
                             placeholder="e.g., John's Salon"
                             value={name}
                             onChange={(e) => setName(e.target.value)}
                           />
                         </div>
                       )}

                       <div className="space-y-2">
                         <Label>Location <span className="text-red-500">*</span></Label>
                         <Input
                           placeholder="e.g., 123 Main St, Lagos"
                           value={location}
                           onChange={(e) => setLocation(e.target.value)}
                         />
                       </div>
                       <div className="space-y-2">
                         <Label>Description</Label>
                         <Textarea
                           placeholder="Tell customers about your business..."
                           value={description}
                           onChange={(e) => setDescription(e.target.value)}
                           rows={3}
                         />
                       </div>
                     </CardContent>
                   </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Business Pictures</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <Label htmlFor="pictures-modal" className="cursor-pointer">
                          <div className="border-2 border-dashed rounded-lg p-6 text-center hover:bg-muted/50 transition-colors">
                            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              Click to upload images (max 10)
                            </span>
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

                        {[...existingPictureUrls, ...picturePreviews].length > 0 && (
                          <div className="grid grid-cols-3 gap-2">
                            {existingPictureUrls.map((url, index) => (
                              <div key={`existing-${index}`} className="relative">
                                <img src={url} alt={`Existing ${index + 1}`} className="w-full h-24 object-cover rounded-lg" />
                              </div>
                            ))}
                            {picturePreviews.map((preview, index) => (
                              <div key={`new-${index}`} className="relative">
                                <img src={preview} alt={`Preview ${index + 1}`} className="w-full h-24 object-cover rounded-lg" />
                                <Button
                                  variant="destructive"
                                  size="icon"
                                  className="absolute -top-2 -right-2 h-6 w-6"
                                  onClick={() => removePicture(index)}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                   <Card>
                     <CardHeader>
                       <CardTitle>Unavailable Dates</CardTitle>
                     </CardHeader>
                     <CardContent className="space-y-4">
                       <div className="space-y-2">
                         <Label>Select Dates (click multiple dates)</Label>
                         <Popover>
                           <PopoverTrigger asChild>
                             <Button variant="outline" className="w-full justify-start text-left">
                               <CalendarIcon className="mr-2 h-4 w-4" />
                               {selectedDates && selectedDates.length > 0 ? (
                                 `${selectedDates.length} date${selectedDates.length > 1 ? 's' : ''} selected`
                               ) : (
                                 <span>Pick dates</span>
                               )}
                             </Button>
                           </PopoverTrigger>
                           <PopoverContent className="w-auto p-0" align="start">
                             <Calendar
                               initialFocus
                               mode="multiple"
                               defaultMonth={selectedDates?.[0]}
                               selected={selectedDates}
                               onSelect={setSelectedDates}
                               numberOfMonths={2}
                             />
                           </PopoverContent>
                         </Popover>
                         <Button
                           size="sm"
                           onClick={handleAddDates}
                           disabled={!selectedDates || selectedDates.length === 0}
                         >
                           Add {selectedDates?.length || 0} Date{selectedDates?.length !== 1 ? 's' : ''}
                         </Button>
                       </div>

                       {unavailableDates.length > 0 && (
                         <div className="space-y-2">
                           <Label>Selected Unavailable Dates ({unavailableDates.length})</Label>
                           <div className="max-h-32 overflow-y-auto border rounded-lg p-2 space-y-1">
                             {unavailableDates.map((date, index) => (
                               <div key={index} className="flex items-center justify-between text-sm">
                                 <span>{format(date, "EEE, MMM dd, yyyy")}</span>
                                 <Button
                                   variant="ghost"
                                   size="sm"
                                   onClick={() => removeUnavailableDate(index)}
                                 >
                                   <X className="h-3 w-3" />
                                 </Button>
                               </div>
                             ))}
                           </div>
                         </div>
                       )}
                     </CardContent>
                   </Card>

                  <Button 
                    className="w-full" 
                    onClick={handleSave}
                    disabled={loading}
                  >
                    {loading ? "Saving..." : editingProfile ? "Save Changes" : "Create Booking Page"}
                  </Button>
                </div>

                {/* Preview Section */}
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Preview</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {name || location || description ? (
                        <div className="space-y-4">
                          {picturePreviews.length > 0 && (
                            <div className="grid grid-cols-2 gap-2">
                              {picturePreviews.slice(0, 4).map((preview, index) => (
                                <img
                                  key={index}
                                  src={preview}
                                  alt={`Preview ${index + 1}`}
                                  className="w-full h-32 object-cover rounded-lg"
                                />
                              ))}
                            </div>
                          )}
                          <div>
                            <h3 className="font-bold text-lg">{name || "Business Name"}</h3>
                            <p className="text-sm text-muted-foreground">{location || "Location"}</p>
                            {description && (
                              <p className="mt-2 text-sm">{description}</p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <p>Your booking page preview will appear here</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
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
                <h3 className="text-2xl font-bold">{allBookings.length}</h3>
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

      <Tabs defaultValue="profiles" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="profiles">Booking Pages</TabsTrigger>
          <TabsTrigger value="appointments">All Appointments</TabsTrigger>
        </TabsList>

        <TabsContent value="profiles">
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
                  Create Your First Page
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
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 hover:bg-background hover:text-primary transition-colors"
                        onClick={() => handleEdit(profile)}
                        title="Edit Profile"
                      >
                        <Edit className="h-4.5 w-4.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-destructive hover:bg-destructive/10 hover:text-destructive transition-colors"
                        onClick={() => handleDelete(profile)}
                        title="Delete Profile"
                      >
                        <Trash2 className="h-4.5 w-4.5" />
                      </Button>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="default"
                        size="sm"
                        className="h-9 px-4 font-bold shadow-sm"
                        onClick={() => handleViewBookings(profile)}
                      >
                        <CalendarIcon className="h-4 w-4 mr-2" />
                        Bookings
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
        </TabsContent>

        <TabsContent value="appointments">
          {allBookings.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="text-center py-20">
                <div className="p-4 bg-muted rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <Clock className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No appointments yet</h3>
                <p className="text-muted-foreground">Once customers book through your pages, they will appear here.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-lg">All Customer Responses</h3>
                <Badge variant="outline" className="font-mono">
                  {allBookings.length} Total
                </Badge>
              </div>
              
              <div className="grid gap-4">
                {allBookings.map((booking: any) => (
                  <Card key={booking.id} className="overflow-hidden border-l-4 border-l-primary hover:shadow-md transition-shadow">
                    <CardContent className="p-0">
                      <div className="grid md:grid-cols-12">
                        <div className="md:col-span-2 bg-primary/5 p-4 flex flex-col items-center justify-center border-r">
                          <span className="text-xs font-bold text-primary uppercase">
                            {formatUTCDate(booking.date, "EEE")}
                          </span>
                          <span className="text-2xl font-black text-primary">
                            {formatUTCDate(booking.date, "dd")}
                          </span>
                          <span className="text-xs font-medium text-muted-foreground">
                            {formatUTCDate(booking.date, "MMM 'yy")}
                          </span>
                        </div>
                        
                        <div className="md:col-span-10 p-5">
                          <div className="flex flex-col md:flex-row justify-between gap-4">
                            <div className="space-y-4 flex-1">
                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold border border-primary/20">
                                    {booking.customerName.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <h4 className="font-bold text-lg leading-none">{booking.customerName}</h4>
                                    <p className="text-sm text-muted-foreground mt-1.5 flex items-center">
                                      <Phone className="h-3 w-3 mr-1.5" />
                                      {booking.customerPhone}
                                    </p>
                                  </div>
                                </div>
                                
                                <div className="flex flex-col items-end gap-2">
                                  <Badge variant="secondary" className="font-medium text-[10px] h-fit">
                                    {booking.bookingProfile.name}
                                  </Badge>
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
                              </div>

                              {booking.notes && (
                                <div className="bg-muted/40 p-4 rounded-xl border border-muted/60 relative group">
                                  <MessageSquare className="h-4 w-4 absolute -top-2 -left-2 text-primary bg-background rounded-full p-0.5 border" />
                                  <p className="text-[11px] uppercase font-bold text-muted-foreground mb-1 tracking-wider">Customer Message</p>
                                  <p className="text-sm italic text-foreground/90">"{booking.notes}"</p>
                                </div>
                              )}
                            </div>

                            <div className="flex flex-col items-end justify-between text-right gap-4 min-w-[120px]">
                              <div className="space-y-1">
                                <div className="text-[10px] font-mono text-muted-foreground">
                                  ID: {booking.id.slice(0, 8)}
                                </div>
                                <div className="flex items-center justify-end gap-1 text-[10px] text-muted-foreground font-medium">
                                  <Clock className="h-3 w-3" />
                                  Booked {format(new Date(booking.createdAt), "MMM dd, HH:mm")}
                                </div>
                              </div>
                              
                              <Button variant="outline" size="sm" className="h-8 text-xs font-bold" onClick={() => window.open(`/book/${booking.bookingProfile.publicId}`, '_blank')}>
                                View Page
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

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
              <div className="grid gap-6 md:grid-cols-4">
                {/* Profile Summary Sidebar */}
                <div className="md:col-span-1 space-y-4">
                  <div className="rounded-xl overflow-hidden border bg-card">
                    {selectedProfileForBookings.pictures?.length > 0 ? (
                      <img
                        src={selectedProfileForBookings.pictures[0].imageUrl}
                        alt={selectedProfileForBookings.name}
                        className="w-full aspect-square object-cover"
                      />
                    ) : (
                      <div className="w-full aspect-square bg-muted flex items-center justify-center">
                        <CalendarIcon className="h-12 w-12 opacity-10" />
                      </div>
                    )}
                    <div className="p-4 space-y-3">
                      <div>
                        <h3 className="font-bold">{selectedProfileForBookings.name}</h3>
                        <p className="text-xs text-muted-foreground flex items-center mt-1">
                          <MapPin className="h-3 w-3 mr-1" />
                          {selectedProfileForBookings.location}
                        </p>
                      </div>
                      
                      <div className="pt-3 border-t">
                        <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Stats</p>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">Total Bookings</span>
                          <span className="font-semibold">{bookings[selectedProfileForBookings.id]?.length || 0}</span>
                        </div>
                      </div>

                      {selectedProfileForBookings.description && (
                        <div className="pt-3 border-t">
                          <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">About</p>
                          <p className="text-xs text-muted-foreground leading-relaxed italic">
                            "{selectedProfileForBookings.description}"
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bookings List Area */}
                <div className="md:col-span-3">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold flex items-center">
                      Recent Appointments
                      <Badge variant="secondary" className="ml-2">
                        {bookings[selectedProfileForBookings.id]?.length || 0}
                      </Badge>
                    </h3>
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
