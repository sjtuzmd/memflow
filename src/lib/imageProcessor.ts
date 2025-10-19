import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import * as exifr from 'exifr';

export interface ProcessedImage {
  file: File;
  previewUrl: string;
  metadata: {
    width: number;
    height: number;
    aspectRatio: number;
    exif: any;
    objects: cocoSsd.DetectedObject[];
    score: number; // Overall quality score (0-1)
  };
}

export async function processImages(files: File[]): Promise<ProcessedImage[]> {
  // Load the COCO-SSD model
  await tf.ready();
  const model = await cocoSsd.load();

  const processedImages = await Promise.all(
    files.map(async (file) => {
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      
      // Read file as ArrayBuffer for EXIF data
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      // Get EXIF data
      const exifData = await exifr.parse(buffer);
      
      // Create image element for processing
      const img = new Image();
      const imgLoadPromise = new Promise<HTMLImageElement>((resolve) => {
        img.onload = () => resolve(img);
        img.src = previewUrl;
      });
      
      const imgElement = await imgLoadPromise;
      
      // Detect objects in the image
      const predictions = await model.detect(imgElement);
      
      // Calculate image score based on detected objects
      const score = calculateImageScore(predictions);
      
      return {
        file,
        previewUrl,
        metadata: {
          width: imgElement.width,
          height: imgElement.height,
          aspectRatio: imgElement.width / imgElement.height,
          exif: exifData || {},
          objects: predictions,
          score,
        },
      };
    })
  );

  return processedImages;
}

function calculateImageScore(objects: cocoSsd.DetectedObject[]): number {
  // Simple scoring based on detected objects
  let score = 0.5; // Base score
  
  // Increase score for good objects (faces, smiles, etc.)
  const goodObjects = ['person', 'dog', 'cat', 'smile', 'face'];
  objects.forEach((obj) => {
    if (goodObjects.some(good => obj.class.toLowerCase().includes(good))) {
      score += 0.1 * obj.score; // Add more weight to high-confidence detections
    }
  });
  
  // Cap the score between 0 and 1
  return Math.min(Math.max(score, 0), 1);
}

export function groupImagesByDate(images: ProcessedImage[]): Record<string, ProcessedImage[]> {
  return images.reduce((acc, image) => {
    const date = image.metadata.exif?.DateTimeOriginal 
      ? new Date(image.metadata.exif.DateTimeOriginal).toISOString().split('T')[0]
      : 'Unknown';
      
    if (!acc[date]) {
      acc[date] = [];
    }
    
    acc[date].push(image);
    return acc;
  }, {} as Record<string, ProcessedImage[]>);
}
