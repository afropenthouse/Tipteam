import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, FileText, Download, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function MenuQRViewer() {
  const { publicId } = useParams<{ publicId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [menuName, setMenuName] = useState<string>('Menu');

  useEffect(() => {
    if (!publicId) {
      setError("Menu ID not found");
      setLoading(false);
      return;
    }

    // Retrieve PDF URL and name from sessionStorage
    const storedPdfUrl = sessionStorage.getItem(`menu-${publicId}`);
    const storedName = sessionStorage.getItem(`menu-name-${publicId}`);

    if (storedPdfUrl) {
      setPdfUrl(storedPdfUrl);
      setMenuName(storedName || 'Menu');
      setLoading(false);
    } else {
      setError("Menu not found or expired");
      setLoading(false);
    }
  }, [publicId]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Menu Not Found</h1>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => navigate('/dashboard/menu-qr-generator')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to QR Generator
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading menu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Button 
            variant="outline" 
            onClick={() => navigate('/dashboard/menu-qr-generator')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to QR Generator
          </Button>
          <h1 className="text-3xl font-bold mb-2">{menuName}</h1>
          <p className="text-muted-foreground">Generated QR Code Menu</p>
        </div>
        
        <div className="border rounded-lg overflow-hidden shadow-lg">
          <div className="bg-card p-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              <span className="font-medium">PDF Document</span>
            </div>
            <div className="flex gap-2">
              <a
                href={pdfUrl || ''}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                <Download className="h-4 w-4" />
                Download
              </a>
            </div>
          </div>
          <div className="bg-black min-h-[600px] flex items-center justify-center p-4">
            {pdfUrl && (
              <iframe
                src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                className="w-full max-w-4xl h-[800px] md:h-[900px]"
                title={`${menuName} PDF`}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
