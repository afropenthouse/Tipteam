import { useState, useEffect } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Copy, Download, Upload, FileText, X, Share2, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { getBusiness, getMenus, uploadMenu } from "@/lib/store";

interface Business {
  id: string;
  name: string;
}

export default function MenuQRGenerator() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [menuName, setMenuName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadedMenu, setUploadedMenu] = useState<{ publicId: string; name: string; url: string } | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>("");

  useEffect(() => {
    // Load businesses for user to select
    const loadBusinesses = async () => {
      try {
        const bizList = await getBusiness();
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
      const menuUrl = `${window.location.origin}/menu/${result.menu.publicId}`;
      
      setUploadedMenu({
        publicId: result.menu.publicId,
        name: result.menu.name,
        url: menuUrl
      });
      
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Menu QR Code Generator
          </h1>
          <p className="text-gray-600 text-lg">
            Upload your PDF menu and generate a QR code instantly. Anyone can scan to view your menu!
          </p>
        </div>

        {/* Upload Section */}
        {!uploadedMenu && (
          <div className="bg-white rounded-2xl shadow-xl p-8">
            {businesses.length > 0 && (
              <div className="mb-6">
                <label className="text-sm font-medium mb-2 block">Select Business</label>
                <Select value={selectedBusinessId} onValueChange={setSelectedBusinessId}>
                  <SelectTrigger>
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
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Upload Your Menu
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                Upload a PDF file of your menu (max 10MB)
              </p>
              
              <div className="mb-6">
                <input
                  type="text"
                  placeholder="Menu name (e.g., Restaurant Menu, Cafe Menu)"
                  value={menuName}
                  onChange={(e) => setMenuName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              {selectedFile ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-2 p-3 bg-gray-50 rounded-lg">
                    <FileText className="h-5 w-5 text-gray-600" />
                    <span className="text-sm text-gray-700">{selectedFile.name}</span>
                    <Button
                      onClick={() => setSelectedFile(null)}
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-gray-500 hover:text-red-500"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="flex gap-3 justify-center">
                    <Button
                      onClick={handleUpload}
                      disabled={uploading || !menuName.trim() || !selectedBusinessId}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
                    >
                      {uploading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Generate QR Code
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => setSelectedFile(null)}
                      variant="outline"
                      disabled={uploading}
                      className="px-6 py-2"
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
                    className="border-2 border-dashed border-gray-300 hover:border-blue-500 px-6 py-3"
                  >
                    <Upload className="h-5 w-5 mr-2" />
                    Select PDF File
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* QR Code Result */}
        {uploadedMenu && (
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Your QR Code is Ready!
              </h2>
              <p className="text-gray-600">
                Customers can scan this QR code to view your menu
              </p>
            </div>

            <div className="flex flex-col items-center space-y-6">
              {/* QR Code */}
              <div className="p-4 bg-white border-2 border-gray-200 rounded-lg">
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
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  {uploadedMenu.name}
                </h3>
                <p className="text-sm text-gray-500 mb-4">
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
                  Download QR
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
                className="bg-blue-600 hover:bg-blue-700 text-white w-full max-w-sm"
              >
                <FileText className="h-4 w-4 mr-2" />
                Preview Menu
              </Button>
            </div>
          </div>
        )}

        {/* Features */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="bg-blue-100 rounded-full h-12 w-12 flex items-center justify-center mx-auto mb-3">
              <Upload className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Easy Upload</h3>
            <p className="text-sm text-gray-600">Simply upload your PDF menu</p>
          </div>
          <div className="text-center">
            <div className="bg-green-100 rounded-full h-12 w-12 flex items-center justify-center mx-auto mb-3">
              <Copy className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Instant QR Code</h3>
            <p className="text-sm text-gray-600">Generate QR code immediately</p>
          </div>
          <div className="text-center">
            <div className="bg-purple-100 rounded-full h-12 w-12 flex items-center justify-center mx-auto mb-3">
              <Share2 className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Share Anywhere</h3>
            <p className="text-sm text-gray-600">Use QR code anywhere you want</p>
          </div>
        </div>
      </div>
    </div>
  );
}