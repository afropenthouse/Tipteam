import { useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Copy, Download, Upload, FileText, X, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function MenuQRGenerator() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [menuName, setMenuName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadedMenu, setUploadedMenu] = useState<{ publicId: string; name: string; url: string; pdfUrl: string } | null>(null);

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
    if (!selectedFile) return;

    setUploading(true);
    try {
      // Create blob URL for the PDF
      const pdfUrl = URL.createObjectURL(selectedFile);
      
      // Generate a mock publicId
      const mockPublicId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const menuUrl = `${window.location.origin}/menu-qr-view/${mockPublicId}`;
      
      // Store the PDF in sessionStorage for the viewer
      sessionStorage.setItem(`menu-${mockPublicId}`, pdfUrl);
      sessionStorage.setItem(`menu-name-${mockPublicId}`, menuName || 'Menu');
      
      // Simulate upload delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setUploadedMenu({
        publicId: mockPublicId,
        name: menuName || 'Menu',
        url: menuUrl,
        pdfUrl: pdfUrl
      });
      
      setSelectedFile(null);
      setMenuName('');
      toast({ title: "Menu uploaded", description: "Your menu QR code has been generated successfully" });
    } catch (error) {
      console.error("Upload error:", error);
      toast({ title: "Upload failed", description: "Failed to upload menu. Please try again.", variant: "destructive" });
    } finally {
      setUploading(false);
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
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Menu QR Generator</h1>
        <p className="text-muted-foreground">
          Create QR codes for your menus instantly
        </p>
      </div>

      {!uploadedMenu ? (
        /* Upload Section */
        <Card>
          <CardHeader>
            <CardTitle>Upload Menu</CardTitle>
            <CardDescription>
              Upload a PDF file to generate a QR code
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Menu Name</label>
                <input
                  type="text"
                  placeholder="e.g., Restaurant Menu"
                  value={menuName}
                  onChange={(e) => setMenuName(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">PDF File</label>
                <div className="mt-1 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  {selectedFile ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-center gap-2 p-2 bg-gray-50 rounded">
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
                          disabled={uploading || !menuName.trim()}
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
      ) : (
        /* QR Code Result */
        <Card>
          <CardHeader>
            <CardTitle>QR Code Generated</CardTitle>
            <CardDescription>
              Your menu QR code is ready to use
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center space-y-6">
              {/* QR Code */}
              <div className="p-4 bg-white rounded-lg border">
                <div id={`qr-code-${uploadedMenu.publicId}`}>
                  <QRCodeCanvas 
                    value={uploadedMenu.url}
                    size={200} 
                    level="H" 
                    includeMargin 
                  />
                </div>
              </div>

              {/* Menu Info */}
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">
                  {uploadedMenu.name}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {uploadedMenu.url}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
                <Button
                  onClick={downloadQRCode}
                  variant="outline"
                  className="flex items-center justify-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download
                </Button>
                <Button
                  onClick={copyLink}
                  variant="outline"
                  className="flex items-center justify-center gap-2"
                >
                  <Copy className="h-4 w-4" />
                  Copy Link
                </Button>
                <Button
                  onClick={shareQRCode}
                  variant="outline"
                  className="flex items-center justify-center gap-2"
                >
                  <Share2 className="h-4 w-4" />
                  Share
                </Button>
                <Button
                  onClick={() => {
                    setUploadedMenu(null);
                    setSelectedFile(null);
                    setMenuName('');
                  }}
                  variant="outline"
                  className="flex items-center justify-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  New Menu
                </Button>
              </div>

              {/* Preview Button */}
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
    </div>
  );
}
