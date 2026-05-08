import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Loader2, FileText, Download, ExternalLink, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function MenuQRViewer() {
  const { publicId } = useParams<{ publicId: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [menuName, setMenuName] = useState<string>('Menu');
  const [isMobile, setIsMobile] = useState(false);

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

    const apiUrl = import.meta.env.VITE_API_URL;
    
    // Fetch menu from backend API to verify it exists
    fetch(`${apiUrl}/businesses/menu/${publicId}`)
      .then(res => {
        if (!res.ok) throw new Error('Menu not found');
        return res.json();
      })
      .then(data => {
        // Use backend PDF proxy endpoint (streams through backend, no Cloudinary exposure)
        const pdfUrl = `${apiUrl}/businesses/menu/${publicId}/pdf`;
        setPdfUrl(pdfUrl);
        setMenuName(data.menu.name);
      })
      .catch(err => {
        setError(err.message || "Menu not found or expired");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [publicId]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Menu Not Found</h1>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading menu...</p>
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

  return (
    <div className="min-h-screen bg-background">
      {pdfUrl ? (
        <>
          
          {/* PDF Viewer */}
          <div className="relative" style={{ height: '100vh' }}>
            {isMobile ? (
              // Mobile: Multiple fallback strategies
              <div className="w-full h-full flex flex-col">
                <div className="flex-1 relative">
                  {/* Strategy 1: Try iframe first (works on some mobile browsers) */}
                  <iframe
                    src={pdfUrl}
                    className="w-full h-full absolute inset-0"
                    title={menuName}
                    style={{ display: 'none' }}
                    sandbox="allow-same-origin allow-scripts allow-popups allow-downloads"
                    onLoad={(e) => {
                      const iframe = e.target as HTMLIFrameElement;
                      // Check if iframe loaded successfully
                      try {
                        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
                        if (iframeDoc && iframeDoc.body.innerHTML.includes('pdf')) {
                          iframe.style.display = 'block';
                          document.getElementById('fallback-ui-viewer')!.style.display = 'none';
                        }
                      } catch (error) {
                        // Cross-origin error, show fallback
                        iframe.style.display = 'none';
                        document.getElementById('fallback-ui-viewer')!.style.display = 'flex';
                      }
                    }}
                    onError={() => {
                      document.getElementById('fallback-ui-viewer')!.style.display = 'flex';
                    }}
                  />
                  
                  {/* Strategy 2: Try embed tag */}
                  <object
                    data={pdfUrl}
                    type="application/pdf"
                    className="w-full h-full absolute inset-0"
                    title={menuName}
                    style={{ display: 'none' }}
                    onLoad={() => {
                      document.querySelector('object')!.style.display = 'block';
                      document.getElementById('fallback-ui-viewer')!.style.display = 'none';
                    }}
                    onError={() => {
                      document.getElementById('fallback-ui-viewer')!.style.display = 'flex';
                    }}
                  >
                    {/* Strategy 3: Fallback UI with multiple options */}
                    <div id="fallback-ui-viewer" className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-white">
                      <FileText className="h-16 w-16 text-gray-400 mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">{menuName}</h3>
                      <p className="text-gray-600 mb-6">View the menu PDF using one of these options:</p>
                      
                      <div className="flex flex-col gap-3 w-full max-w-sm">
                        {/* Option 1: Open in new tab */}
                        <Button
                          onClick={handleOpenInNewTab}
                          className="w-full bg-gradient-primary text-white"
                          size="lg"
                        >
                          <ExternalLink className="h-5 w-5 mr-2" />
                          Open Menu in Browser
                        </Button>
                        
                        {/* Option 2: Download */}
                        <Button
                          onClick={handleDownloadPDF}
                          variant="outline"
                          className="w-full"
                          size="lg"
                        >
                          <Download className="h-5 w-5 mr-2" />
                          Download Menu PDF
                        </Button>
                        
                        {/* Option 3: Google Docs Viewer (works well on mobile) */}
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
                      
                      <p className="text-xs text-gray-500 mt-6 max-w-xs">
                        For best viewing experience, use the "Open Menu in Browser" option or download the PDF to your device.
                      </p>
                    </div>
                  </object>
                </div>
              </div>
            ) : (
              // Desktop: Use iframe for better experience
              <iframe
                src={pdfUrl}
                className="w-full h-full"
                title={menuName}
                sandbox="allow-same-origin allow-scripts allow-popups allow-downloads"
              />
            )}
          </div>
        </>
      ) : (
        <div className="flex items-center justify-center h-screen">
          <p className="text-muted-foreground">No PDF available</p>
        </div>
      )}
    </div>
  );
}