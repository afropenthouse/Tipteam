import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Loader2, FileText } from "lucide-react";

export default function MenuQRViewer() {
  const { publicId } = useParams<{ publicId: string }>();
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

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    
    // Fetch menu from backend API
    fetch(`${apiUrl}/businesses/menu/${publicId}`)
      .then(res => {
        if (!res.ok) throw new Error('Menu not found');
        return res.json();
      })
      .then(data => {
        // Use proxy endpoint for PDF display through backend
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        setPdfUrl(`${apiUrl}/businesses/menu/${publicId}/pdf`);
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

  return (
    <div className="min-h-screen bg-background">
      {pdfUrl ? (
        <iframe
          src={pdfUrl}
          className="w-full h-screen"
          title={menuName}
        />
      ) : (
        <div className="flex items-center justify-center h-screen">
          <p className="text-muted-foreground">No PDF available</p>
        </div>
      )}
    </div>
  );
}