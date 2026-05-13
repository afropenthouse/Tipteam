import { useState, useEffect } from "react";
import { Upload, FileText, X, Building2, Trash2, Eye, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectTrigger, SelectValue, SelectItem } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { listBusinesses, getMenus, uploadMenu, deleteMenu, updateMenu } from "@/lib/api";

interface Business {
  id: string;
  name: string;
}

interface Menu {
  id: string;
  name: string;
  publicId: string;
  createdAt: string;
}

export default function MenuManager() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [menuName, setMenuName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>("");
  const [menus, setMenus] = useState<Menu[]>([]);
  const { toast } = useToast();

  // Edit dialog state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingMenu, setEditingMenu] = useState<Menu | null>(null);
  const [editName, setEditName] = useState('');
  const [editFile, setEditFile] = useState<File | null>(null);
  const [updating, setUpdating] = useState(false);

  // Load businesses
  useEffect(() => {
    const loadBusinesses = async () => {
      try {
        const bizList = await listBusinesses();
        setBusinesses(bizList);
        if (bizList.length > 0 && !selectedBusinessId) {
          setSelectedBusinessId(bizList[0].id);
        }
      } catch (error) {
        console.error("Failed to load businesses:", error);
      }
    };
    loadBusinesses();
  }, []);

  // Load menus when selected business changes
  useEffect(() => {
    if (!selectedBusinessId) return;

    const loadMenus = async () => {
      try {
        const menusList = await getMenus(selectedBusinessId);
        setMenus(menusList);
      } catch (error) {
        console.error("Failed to load menus:", error);
      }
    };
    loadMenus();
  }, [selectedBusinessId]);

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

  const handleUpload = async () => {
    if (!selectedFile || !selectedBusinessId) {
      toast({ title: "Missing info", description: "Please select a business and a file", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const result = await uploadMenu(selectedBusinessId, selectedFile, menuName || 'Price List');
      
      // Add the new menu to the menus array
      setMenus([result.menu, ...menus]);
      
      setSelectedFile(null);
      setMenuName('');
      toast({ title: "Price List uploaded", description: "Your price list has been uploaded successfully" });
    } catch (error) {
      console.error("Upload error:", error);
      toast({ title: "Upload failed", description: error instanceof Error ? error.message : "Failed to upload price list", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleMenuDelete = async (menuId: string) => {
    if (!selectedBusinessId) return;
    
    try {
      await deleteMenu(selectedBusinessId, menuId);
      setMenus(menus.filter(m => m.id !== menuId));
      toast({ title: "Price List deleted", description: "Price List has been deleted successfully" });
    } catch (error) {
      console.error("Menu delete error:", error);
      toast({ title: "Delete failed", description: error instanceof Error ? error.message : "Failed to delete price list", variant: "destructive" });
    }
  };

  // Edit handlers
  const openEditDialog = (menu: Menu) => {
    setEditingMenu(menu);
    setEditName(menu.name);
    setEditFile(null);
    setIsEditDialogOpen(true);
  };

  const handleEditFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
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
      setEditFile(file);
    }
  };

  const handleUpdateMenu = async () => {
    if (!editingMenu || !selectedBusinessId) return;

    setUpdating(true);
    try {
      await updateMenu(selectedBusinessId, editingMenu.id, editFile || undefined, editName);
      
      // Refresh menu list
      const menusList = await getMenus(selectedBusinessId);
      setMenus(menusList);
      
      setIsEditDialogOpen(false);
      setEditingMenu(null);
      setEditFile(null);
      toast({ title: "Price List updated", description: "Your price list has been updated successfully" });
    } catch (error) {
      console.error("Update error:", error);
      toast({ title: "Update failed", description: error instanceof Error ? error.message : "Failed to update price list", variant: "destructive" });
    } finally {
      setUpdating(false);
    }
  };

  const viewMenu = (publicId: string) => {
    window.open(`/menu/${publicId}`, '_blank');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Price List Manager</h1>
        <p className="text-sm text-muted-foreground">Upload and manage your price lists</p>
      </div>

      {/* Upload New Menu */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Price List/Product/Service list</CardTitle>
          <CardDescription>
            Upload a PDF file to create a new price list
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {businesses.length > 0 && (
              <div>
                <Label htmlFor="business">Select Business</Label>
                <Select value={selectedBusinessId} onValueChange={setSelectedBusinessId}>
                  <SelectTrigger id="business">
                    <SelectValue placeholder="Select a business" />
                  </SelectTrigger>
                  <SelectContent>
                    {businesses.map((biz) => (
                      <SelectItem key={biz.id} value={biz.id}>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          {biz.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div>
              <Label htmlFor="menuName">Price List Name</Label>
              <Input
                id="menuName"
                type="text"
                placeholder="e.g., Restaurant Price List, Cafe Price List"
                value={menuName}
                onChange={(e) => setMenuName(e.target.value)}
              />
            </div>
            
            <div>
              <Label>PDF File</Label>
              <div className="mt-2 border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                {selectedFile ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-center gap-2 p-2 bg-muted rounded">
                      <FileText className="h-4 w-4" />
                      <span className="text-sm">{selectedFile.name}</span>
                      <Button
                        onClick={() => setSelectedFile(null)}
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="flex gap-2 justify-center">
                      <Button
                        onClick={handleUpload}
                        disabled={uploading || !menuName.trim() || !selectedBusinessId}
                      >
                        {uploading ? "Uploading..." : "Upload Price List"}
                      </Button>
                      <Button
                        onClick={() => setSelectedFile(null)}
                        variant="outline"
                        disabled={uploading}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <input
                      type="file"
                      id="menu-upload"
                      accept=".pdf"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <Button
                      onClick={() => document.getElementById('menu-upload')?.click()}
                      variant="outline"
                      disabled={uploading}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Select PDF File
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

       {/* Existing Price Lists */}
       {menus.length > 0 && (
         <Card>
           <CardHeader>
             <CardTitle>Your Price Lists ({menus.length})</CardTitle>
             <CardDescription>All price lists for the selected business</CardDescription>
           </CardHeader>
           <CardContent>
             <div className="space-y-4">
               {menus.map((menu) => (
                 <div key={menu.id} className="border rounded-lg p-4">
                   <div className="flex items-center justify-between">
                     <div>
                       <h3 className="font-medium">{menu.name}</h3>
                       <p className="text-sm text-muted-foreground">
                         Uploaded {new Date(menu.createdAt).toLocaleDateString()}
                       </p>
                     </div>
                     <div className="flex gap-2">
                       <Button 
                         onClick={() => viewMenu(menu.publicId)}
                         variant="outline"
                         size="sm"
                       >
                         <Eye className="h-4 w-4 mr-2" />
                         View
                       </Button>
                       <Button
                         onClick={() => openEditDialog(menu)}
                         variant="outline"
                         size="sm"
                       >
                         <Edit className="h-4 w-4 mr-2" />
                         Edit
                       </Button>
                       <Button
                         onClick={() => handleMenuDelete(menu.id)}
                         variant="ghost"
                         size="sm"
                         className="text-red-500 hover:text-red-700"
                       >
                         <Trash2 className="h-4 w-4" />
                       </Button>
                     </div>
                   </div>
                 </div>
               ))}
             </div>
           </CardContent>
         </Card>
       )}

       {/* Edit Menu Dialog */}
       <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
         if (!open) {
           setIsEditDialogOpen(false);
           setEditingMenu(null);
           setEditFile(null);
         }
       }}>
         <DialogContent>
           <DialogHeader>
             <DialogTitle>Edit Price List</DialogTitle>
             <DialogDescription>
               Update the price list name and/or replace the PDF file.
             </DialogDescription>
           </DialogHeader>
           <div className="space-y-4 py-4">
             <div className="space-y-2">
               <Label htmlFor="edit-menu-name">Price List Name</Label>
               <Input
                 id="edit-menu-name"
                 value={editName}
                 onChange={(e) => setEditName(e.target.value)}
                 placeholder="Enter price list name"
               />
             </div>
             <div className="space-y-2">
               <Label>PDF File (optional)</Label>
               <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center">
                 {editFile ? (
                   <div className="space-y-3">
                     <div className="flex items-center justify-center gap-2 p-2 bg-muted rounded">
                       <FileText className="h-4 w-4" />
                       <span className="text-sm">{editFile.name}</span>
                       <Button
                         onClick={() => setEditFile(null)}
                         variant="ghost"
                         size="sm"
                         className="h-6 w-6 p-0"
                       >
                         <X className="h-3 w-3" />
                       </Button>
                     </div>
                   </div>
                 ) : (
                   <div>
                     <input
                       type="file"
                       id="edit-menu-upload"
                       accept=".pdf"
                       onChange={handleEditFileSelect}
                       className="hidden"
                     />
                     <Button
                       onClick={() => document.getElementById('edit-menu-upload')?.click()}
                       variant="outline"
                       type="button"
                     >
                       <Upload className="h-4 w-4 mr-2" />
                       Select New PDF (optional)
                     </Button>
                     <p className="text-xs text-muted-foreground mt-2">
                       Leave blank to keep the current PDF
                     </p>
                   </div>
                 )}
               </div>
             </div>
           </div>
           <DialogFooter>
             <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={updating}>
               Cancel
             </Button>
             <Button onClick={handleUpdateMenu} disabled={updating || !editName.trim()}>
               {updating ? "Saving..." : "Save Changes"}
             </Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>
     </div>
   );
 }
