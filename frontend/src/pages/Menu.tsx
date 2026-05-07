import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Loader2, FileText, Download, ExternalLink, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Menu() {
  const { publicId } = useParams<{ publicId: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [menuExists, setMenuExists] = useState<boolean>(false);
  const [menuName, setMenuName] = useState<string>("Menu");
  const [googleBusinessUrl, setGoogleBusinessUrl] = useState<string | null>(null);

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

  if (menuExists) {
    return (
      <div className="min-h-screen bg-white">
        <iframe
          src={`${import.meta.env.VITE_API_URL}/businesses/menu/${publicId}/pdf`}
          className="w-full h-screen"
          title="Menu PDF"
        ></iframe>
      </div>
    );
  }

  return null;
}