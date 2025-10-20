'use client';

import { useEffect, useState } from 'react';
import { getImageWithDetections } from '@/app/utils/faceDetection';

interface FaceDetectionImageProps {
  src: string;
  alt: string;
  className?: string;
  onDetect?: (hasFaces: boolean) => void;
}

export default function FaceDetectionImage({ 
  src, 
  alt, 
  className = '',
  onDetect 
}: FaceDetectionImageProps) {
  const [imageSrc, setImageSrc] = useState<string>(src);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const processImage = async () => {
      if (typeof window === 'undefined') return;
      
      try {
        setIsProcessing(true);
        const processedImage = await getImageWithDetections(src);
        setImageSrc(processedImage);
        onDetect?.(processedImage !== src); // Callback with true if faces were detected
      } catch (error) {
        console.error('Error processing image:', error);
        setImageSrc(src); // Fallback to original image on error
      } finally {
        setIsProcessing(false);
      }
    };

    processImage();
  }, [src, onDetect]);

  return (
    <div className={`relative ${className}`}>
      <img 
        src={imageSrc} 
        alt={alt} 
        className="w-full h-auto"
      />
      {isProcessing && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="text-white">Processing...</div>
        </div>
      )}
    </div>
  );
}
