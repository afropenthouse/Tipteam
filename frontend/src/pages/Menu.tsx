import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Loader2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Menu() {
  const { publicId } = useParams<{ publicId: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [menuExists, setMenuExists] = useState(false);
  const [menuName, setMenuName] = useState("Menu");
  const [googleBusinessUrl, setGoogleBusinessUrl] = useState<string | null>(null);
  const [website, setWebsite] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!publicId) {
      setError("Menu ID not found");
      setLoading(false);
      return;
    }

    const fetchMenu = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/businesses/menu/${publicId}`
        );
        if (!response.ok) throw new Error("Menu not found");

        const data = await response.json();
        setPdfUrl(`${import.meta.env.VITE_API_URL}/businesses/menu/${publicId}/pdf`);
        setMenuName(data.menu.name || "Menu");
        setMenuExists(true);
        setGoogleBusinessUrl(data.menu.business?.googleBusinessUrl || null);
        setWebsite(data.menu.business?.website || null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load menu");
      } finally {
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

  if (!menuExists || !pdfUrl) return null;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {(website || googleBusinessUrl) && (
        <div className="bg-white border-b px-4 py-2 flex items-center justify-between sticky top-0 z-10">
          <span className="text-sm font-medium truncate">{menuName}</span>
          <div className="flex gap-2">
            {website && (
              <Button asChild variant="outline" size="sm" className="h-8">
                <a 
                  href={website.startsWith('http') ? website : `https://${website}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  Website
                </a>
              </Button>
            )}
            {googleBusinessUrl && (
              <Button asChild variant="outline" size="sm" className="h-8">
                <a href={googleBusinessUrl} target="_blank" rel="noopener noreferrer">
                  Rate
                </a>
              </Button>
            )}
          </div>
        </div>
      )}
      <div className="flex-1 w-full h-full">
        <iframe 
          src={`/pdfjs/web/viewer.html?file=${encodeURIComponent(pdfUrl)}`}
          className="w-full h-full border-0 block"
          style={{ height: (website || googleBusinessUrl) ? 'calc(100dvh - 49px)' : '100dvh' }}
          title={menuName}
        />
      </div>
    </div>
  );
}