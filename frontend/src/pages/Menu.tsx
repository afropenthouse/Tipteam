import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Loader2, FileText, Download, ExternalLink } from "lucide-react";
import { api } from "@/lib/api";

export default function Menu() {
  const { publicId } = useParams<{ publicId: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [menu, setMenu] = useState<any>(null);

  useEffect(() => {
    if (!publicId) {
      setError("Menu ID not found");
      setLoading(false);
      return;
    }

    const fetchMenu = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/businesses/menu/${publicId}`);
        if (!response.ok) {
          throw new Error("Menu not found");
        }
        const data = await response.json();
        setMenu(data.menu);
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
      <div className="min-h-screen flex items-center justify-center">
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{menu?.name}</h1>
          {menu?.business && (
            <div className="text-muted-foreground">
              <p>{menu.business.name}</p>
              <p className="text-sm">{menu.business.address}</p>
              <p className="text-sm">{menu.business.phone} | {menu.business.email}</p>
            </div>
          )}
        </div>
        
        <div className="border rounded-lg overflow-hidden shadow-lg">
          <div className="bg-card p-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              <span className="font-medium">PDF Document</span>
            </div>
            <div className="flex gap-2">
              <a
                href={menu?.cloudinaryUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                Open in New Tab
              </a>
              <a
                href={menu?.cloudinaryUrl}
                download
                className="inline-flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-muted transition-colors"
              >
                <Download className="h-4 w-4" />
                Download
              </a>
            </div>
          </div>
          <div className="bg-black min-h-[600px] flex items-center justify-center p-4">
            <iframe
              src={`${menu?.cloudinaryUrl}#toolbar=0&navpanes=0&scrollbar=0`}
              className="w-full max-w-4xl h-[800px] md:h-[900px]"
              title={`${menu?.name} PDF`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}