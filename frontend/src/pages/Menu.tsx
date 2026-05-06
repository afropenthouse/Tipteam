import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Loader2, FileText, Download, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Menu() {
  const { publicId } = useParams<{ publicId: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cloudinaryUrl, setCloudinaryUrl] = useState<string | null>(null);
  const [menuName, setMenuName] = useState<string>("Menu");

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
        
        setMenuName(data.menu.name || "Menu");
        setCloudinaryUrl(data.menu.cloudinaryUrl);
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
          {cloudinaryUrl && (
            <div className="mt-6">
              <Button asChild>
                <a href={`https://res.cloudinary.com/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/raw/upload/${cloudinaryUrl}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                  <ExternalLink className="h-4 w-4" />
                  Open Menu in New Tab
                </a>
              </Button>
            </div>
          )}
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

  if (cloudinaryUrl) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <div className="bg-gray-100 p-4 flex justify-between items-center">
          <h2 className="font-semibold">{menuName}</h2>
          <div className="flex gap-2">
             <Button asChild variant="secondary">
               <a href={`${import.meta.env.VITE_API_URL}/businesses/menu/${publicId}/pdf`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                 <ExternalLink className="h-4 w-4" />
                 Open Menu
               </a>
             </Button>
             <a
               href={`${import.meta.env.VITE_API_URL}/businesses/menu/${publicId}/pdf`}
               download={`${menuName}.pdf`}
               className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
             >
               <Download className="h-4 w-4" />
               Download PDF
             </a>
           </div>
         </div>
        <iframe
          src={`${import.meta.env.VITE_API_URL}/businesses/menu/${publicId}/pdf`}
          className="flex-1 w-full min-h-[600px]"
          title="Menu PDF"
        ></iframe>
      </div>
    );
  }

  return null;
}