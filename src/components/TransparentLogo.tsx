import React, { useState, useEffect } from 'react';

interface TransparentLogoProps {
  src: string;
  alt?: string;
  className?: string;
  sizeClassName?: string;
}

export const TransparentLogo: React.FC<TransparentLogoProps> = ({
  src,
  alt = 'NgolaTeste Logo',
  className = '',
}) => {
  const [processedSrc, setProcessedSrc] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          if (isMounted) setProcessedSrc(src);
          return;
        }

        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Loop through all pixels and make white / near-white pixels 100% transparent
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          // Check if pixel is white or close to white/light grey
          const brightness = (r + g + b) / 3;
          if (r > 210 && g > 210 && b > 210) {
            // Pure white or light background -> transparent
            data[i + 3] = 0;
          } else if (brightness > 180) {
            // Anti-aliased edge smoothing
            const alpha = Math.max(0, Math.floor(255 - (brightness - 180) * 8));
            data[i + 3] = Math.min(data[i + 3], alpha);
          }
        }

        ctx.putImageData(imageData, 0, 0);
        const dataUrl = canvas.toDataURL('image/png');
        if (isMounted) {
          setProcessedSrc(dataUrl);
        }
      } catch {
        // Fallback if canvas is tainted by CORS
        if (isMounted) setProcessedSrc(src);
      }
    };

    img.onerror = () => {
      if (isMounted) setProcessedSrc(src);
    };

    img.src = src;

    return () => {
      isMounted = false;
    };
  }, [src]);

  return (
    <img
      src={processedSrc || src}
      alt={alt}
      className={`${className} ${!processedSrc ? 'mix-blend-multiply' : ''}`}
      referrerPolicy="no-referrer"
    />
  );
};
