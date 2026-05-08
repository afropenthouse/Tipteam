import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Loader2, FileText, Download, ExternalLink, Star, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Menu() {
  const { publicId } = useParams<{ publicId: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [menuExists, setMenuExists] = useState<boolean>(false);
  const [menuName, setMenuName] = useState<string>("Menu");
  const [googleBusinessUrl, setGoogleBusinessUrl] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    // Detect mobile device
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      setIsMobile(/android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent));
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (!publicId) {
      setError("Menu ID not found");
      setLoading(false);
      return;
    }

     const fetchMenu = async () => {
      try {
        let response = await fetch(`${import.meta.env.VITE_API_URL}/businesses/menu/${publicId}`);
        if (!response.ok) {
          throw new Error("Menu not found");
        }
        const data = await response.json();
        
        const pdfUrl = `${import.meta.env.VITE_API_URL}/businesses/menu/${publicId}/pdf`;
        setPdfUrl(pdfUrl);
        setMenuName(data.menu.name || "Menu");
        setMenuExists(true);
        setGoogleBusinessUrl(data.menu.business?.googleBusinessUrl || null);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load menu");
        setLoading(false);
      }
    };

    fetchMenu();
  }, [publicId]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <FileText className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <h1 className="text-2xl font-bold mb-2 text-gray-800">Menu Not Found</h1>
          <p className="text-gray-600">{error}</p>
                  </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-600" />
          <p className="text-gray-600">Loading menu...</p>
        </div>
      </div>
    );
  }

  const handleDownloadPDF = () => {
    if (pdfUrl) {
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = `${menuName}.pdf`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleOpenInNewTab = () => {
    if (pdfUrl) {
      window.open(pdfUrl, '_blank');
    }
  };

  if (menuExists) {
    return (
      <div className="min-h-screen bg-white">
        {/* Direct PDF display - open in browser immediately */}
        <div className="flex flex-col items-center justify-center min-h-screen p-8">
          <div className="text-center max-w-md">
            <FileText className="h-16 w-16 text-gray-400 mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{menuName}</h1>
            <p className="text-gray-600 mb-6">Menu PDF</p>
            
            <div className="flex flex-col gap-4 w-full">
              {/* Option 1: Open PDF in browser (primary) */}
              <Button
                onClick={handleOpenInNewTab}
                className="w-full bg-gradient-primary text-white"
                size="lg"
              >
                <ExternalLink className="h-5 w-5 mr-2" />
                Open Menu PDF
              </Button>
              
              {/* Option 2: Download PDF */}
              <Button
                onClick={handleDownloadPDF}
                variant="outline"
                className="w-full"
                size="lg"
              >
                <Download className="h-5 w-5 mr-2" />
                Download Menu PDF
              </Button>
              
              {/* Option 3: Google Docs Viewer */}
              <Button
                onClick={() => window.open(`https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(pdfUrl)}`, '_blank')}
                variant="secondary"
                className="w-full"
                size="lg"
              >
                <Eye className="h-5 w-5 mr-2" />
                View in Google Docs
              </Button>
            </div>
            
            <p className="text-sm text-gray-500 mt-6">
              Choose how you'd like to view the menu. The PDF will open directly in your browser or download to your device.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}