import { useEffect, useState } from "react";
import api from "../lib/api";

interface Props {
  src: string;
  alt: string;
  className?: string;
  refreshKey?: number;
}

/** Loads protected profile images with the app's credentialed Axios client. */
export default function AuthenticatedProfileImage({
  src,
  alt,
  className,
  refreshKey = 0,
}: Props) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let createdUrl: string | null = null;
    setObjectUrl(null);

    async function loadImage() {
      try {
        const response = await api.get<Blob>(src, {
          responseType: "blob",
          params: { _imageVersion: refreshKey || undefined },
          headers: { "Cache-Control": "no-cache" },
        });
        if (cancelled) return;
        createdUrl = URL.createObjectURL(response.data);
        setObjectUrl(createdUrl);
      } catch {
        if (!cancelled) setObjectUrl(null);
      }
    }

    if (src) void loadImage();

    return () => {
      cancelled = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [src, refreshKey]);

  if (!objectUrl) return null;
  return <img src={objectUrl} alt={alt} className={className} />;
}
