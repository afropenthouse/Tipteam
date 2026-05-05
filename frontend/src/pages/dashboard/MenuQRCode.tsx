import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import { Copy, Download, Upload, FileText, X, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getBusiness, getMenus, uploadMenu, deleteMenu } from "@/lib/store";
import { toast } from "@/hooks/use-toast";

export default function MenuQRCode() {
  const { id } = useParams<{ id: string }>();
  const [business, setBusiness] = useState<any>(null);
  const [menus, setMenus] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingMenu, setUploadingMenu] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [menuName, setMenuName] = useState('');

  useEffect(() => {
    if (!id) return;
    
    // Get business info first, then menus
    getBusiness(id)
      .then((biz) => {
        setBusiness(biz);
        if (biz) {
          getMenus(id)
            .then(setMenus)
            .catch(console.error);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

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

  const handleMenuUpload = async () => {
    if (!selectedFile || !id) return;

    setUploadingMenu(true);
    try {
      const result = await uploadMenu(id, selectedFile, menuName || 'Menu');
      setMenus([result.menu, ...menus]);
      setSelectedFile(null);
      setMenuName('');
      toast({ title: "Menu uploaded", description: "Your menu has been uploaded successfully" });
    } catch (error) {
      console.error("Menu upload error:", error);
      toast({ title: "Upload failed", description: error instanceof Error ? error.message : "Failed to upload menu", variant: "destructive" });
    } finally {
      setUploadingMenu(false);
    }
  };

  const handleMenuDelete = async (menuId: string) => {
    if (!id) return;
    
    try {
      await deleteMenu(id, menuId);
      setMenus(menus.filter(m => m.id !== menuId));
      toast({ title: "Menu deleted", description: "Menu has been deleted successfully" });
    } catch (error) {
      console.error("Menu delete error:", error);
      toast({ title: "Delete failed", description: error instanceof Error ? error.message : "Failed to delete menu", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Menu QR Code</h1>
          {business && <p className="text-muted-foreground">{business.name}</p>}
        </div>
        <Button asChild variant="outline">
          <Link to="/dashboard/businesses">Back to Businesses</Link>
        </Button>
      </div>

      {/* Upload Section */}
      <div className="rounded-2xl border bg-card p-6 shadow-card">
        <h2 className="font-semibold mb-4">Upload New Menu</h2>
        
        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
          <div className="text-center">
            <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground mb-4">
              Upload a new menu as PDF (max 10MB)
            </p>
            
            <div className="mb-4">
              <input
                type="text"
                placeholder="Menu name (e.g., Breakfast Menu, Dinner Menu)"
                value={menuName}
                onChange={(e) => setMenuName(e.target.value)}
                className="w-full px-3 py-2 border rounded-md text-sm"
              />
            </div>
            
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
                    onClick={handleMenuUpload}
                    disabled={uploadingMenu}
                    className="bg-gradient-primary"
                  >
                    {uploadingMenu ? "Uploading..." : "Upload Menu"}
                  </Button>
                  <Button
                    onClick={() => setSelectedFile(null)}
                    variant="outline"
                    disabled={uploadingMenu}
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
                  disabled={uploadingMenu}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Select PDF File
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Menus List */}
      {menus.length > 0 && (
        <div className="rounded-2xl border bg-card p-6 shadow-card">
          <h2 className="font-semibold mb-4">Your Menus ({menus.length})</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {menus.map((menu) => (
              <div key={menu.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-medium">{menu.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      Uploaded {new Date(menu.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    onClick={() => handleMenuDelete(menu.id)}
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-col items-center gap-3">
                   <QRCodeCanvas 
                     value={`${window.location.origin}/menu/${menu.publicId}`}
                     size={150} 
                     level="H" 
                     includeMargin 
                   />
                  <p className="text-xs text-muted-foreground text-center">
                    Scan to view {menu.name}
                  </p>
                  <div className="flex gap-2">
                     <Button 
                       onClick={() => window.open(`${window.location.origin}/menu/${menu.publicId}`, '_blank')}
                       variant="outline"
                       size="sm"
                       className="flex-1"
                     >
                       <FileText className="h-4 w-4 mr-2" />
                       View
                     </Button>
                     <Button 
                       onClick={() => navigator.clipboard.writeText(`${window.location.origin}/menu/${menu.publicId}`)}
                       variant="outline"
                       size="sm"
                       className="flex-1"
                     >
                       <Copy className="h-4 w-4 mr-2" />
                       Copy Link
                     </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
