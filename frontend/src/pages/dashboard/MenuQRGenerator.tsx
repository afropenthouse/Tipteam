import { useState, useEffect } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Copy, Download, Upload, FileText, X, Share2, Building2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectTrigger, SelectValue, SelectItem } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { listBusinesses, getMenus, uploadMenu, deleteMenu } from "@/lib/api";

interface Business {
  id: string;
  name: string;
}

interface Menu {
  id: string;
  name: string;
  cloudinaryUrl: string;
  publicId: string;
  createdAt: string;
}

export default function MenuQRGenerator() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [menuName, setMenuName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadedMenu, setUploadedMenu] = useState<{ publicId: string; name: string; url: string } | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>("");
  const [menus, setMenus] = useState<Menu[]>([]);
  const { toast } = useToast();

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
      const result = await uploadMenu(selectedBusinessId, selectedFile, menuName || 'Menu');
      
       const menuUrl = `${window.location.origin}/menu-qr-view/${result.menu.publicId}`;

      setUploadedMenu({
        publicId: result.menu.publicId,
        name: result.menu.name,
        url: menuUrl
      });
      
      // Add the new menu to the menus array
      setMenus([result.menu, ...menus]);
      
      setSelectedFile(null);
      setMenuName('');
      toast({ title: "Menu uploaded", description: "Your menu QR code has been generated successfully" });
    } catch (error) {
      console.error("Upload error:", error);
      toast({ title: "Upload failed", description: error instanceof Error ? error.message : "Failed to upload menu", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleMenuDelete = async (menuId: string) => {
    if (!selectedBusinessId) return;
    
    try {
      await deleteMenu(selectedBusinessId, menuId);
      setMenus(menus.filter(m => m.id !== menuId));
      toast({ title: "Menu deleted", description: "Menu has been deleted successfully" });
    } catch (error) {
      console.error("Menu delete error:", error);
      toast({ title: "Delete failed", description: error instanceof Error ? error.message : "Failed to delete menu", variant: "destructive" });
    }
  };

  const downloadQRCode = () => {
    if (!uploadedMenu) return;
    
    const canvas = document.querySelector(`#qr-code-${uploadedMenu.publicId} canvas`) as HTMLCanvasElement;
    if (canvas) {
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `${uploadedMenu.name.replace(/\s+/g, '-').toLowerCase()}-qr-code.png`;
      link.href = url;
      link.click();
    }
  };

  const copyLink = () => {
    if (!uploadedMenu) return;
    
    navigator.clipboard.writeText(uploadedMenu.url);
    toast({ title: "Link copied", description: "Menu link copied to clipboard" });
  };

  const shareQRCode = async () => {
    if (!uploadedMenu) return;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: uploadedMenu.name,
          text: `Check out our menu: ${uploadedMenu.name}`,
          url: uploadedMenu.url,
        });
      } catch (error) {
        console.log('Share cancelled or failed:', error);
      }
    } else {
      copyLink();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Menu QR Generator</h1>
        <p className="text-sm text-muted-foreground">Create QR codes for your menus instantly</p>
      </div>

      {/* Upload New Menu */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Menu</CardTitle>
          <CardDescription>
            Upload a PDF file to generate a QR code
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
              <Label htmlFor="menuName">Menu Name</Label>
              <Input
                id="menuName"
                type="text"
                placeholder="e.g., Restaurant Menu, Cafe Menu"
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
                        {uploading ? "Generating..." : "Generate QR Code"}
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

      {/* Just Uploaded Menu */}
      {uploadedMenu && (
        <Card>
          <CardHeader>
            <CardTitle>QR Code Generated</CardTitle>
            <CardDescription>Your menu QR code is ready to use</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center space-y-6">
              <div className="p-4 bg-white rounded-lg border">
                <div id={`qr-code-${uploadedMenu.publicId}`}>
                  <QRCodeCanvas 
                    value={uploadedMenu.url}
                    size={200} 
                    level="H" 
                  />
                </div>
              </div>
              
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-1">{uploadedMenu.name}</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {uploadedMenu.url}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
                <Button
                  onClick={downloadQRCode}
                  variant="outline"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download QR
                </Button>
                <Button
                  onClick={copyLink}
                  variant="outline"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Link
                </Button>
                <Button
                  onClick={shareQRCode}
                  variant="outline"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
                <Button
                  onClick={() => {
                    setUploadedMenu(null);
                    setSelectedFile(null);
                    setMenuName('');
                  }}
                  variant="outline"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  New Menu
                </Button>
              </div>

              <Button
                onClick={() => window.open(uploadedMenu.url, '_blank')}
                className="w-full max-w-sm"
              >
                <FileText className="h-4 w-4 mr-2" />
                Preview Menu
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Existing Menus */}
      {menus.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Your Menus ({menus.length})</CardTitle>
            <CardDescription>All menus for the selected business</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {menus.map((menu) => {
                    const menuUrl = `${window.location.origin}/menu-qr-view/${menu.publicId}`;
                    return (
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
                          value={menuUrl}
                          size={150} 
                          level="H" 
                        />
                       <p className="text-xs text-muted-foreground text-center">
                          Scan to view {menu.name}
                       </p>
                       <div className="flex gap-2">
                          <Button 
                            onClick={() => window.open(menuUrl, '_blank')}
                            variant="outline"
                            size="sm"
                            className="flex-1"
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            View
                          </Button>
                          <Button 
                            onClick={() => navigator.clipboard.writeText(menuUrl)}
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
                 );
               })}
             </div>
           </CardContent>
         </Card>
       )}
     </div>
  );
}
