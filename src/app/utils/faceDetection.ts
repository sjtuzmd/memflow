// Import types only to avoid server-side execution
import type * as FaceApi from '@vladmandic/face-api';

// Global flag to track if models are loaded
let modelsLoaded = false;
let faceapi: typeof FaceApi;

/**
 * Loads the face detection models
 */
export async function loadFaceDetectionModels() {
  if (typeof window === 'undefined') {
    // Skip on server-side
    return false;
  }

  if (modelsLoaded) return true;
  
  try {
    console.log('Loading face detection models...');
    
    // Dynamically import face-api only on client-side
    faceapi = await import('@vladmandic/face-api');
    
    // Load the models from the public directory
    const modelPath = '/models';
    
    // Load the models in parallel
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri(modelPath),
      faceapi.nets.faceLandmark68Net.loadFromUri(modelPath),
      faceapi.nets.faceRecognitionNet.loadFromUri(modelPath),
      faceapi.nets.faceExpressionNet.loadFromUri(modelPath)
    ]);
    
    console.log('Face detection models loaded successfully');
    modelsLoaded = true;
    return true;
  } catch (error) {
    console.error('Error loading face detection models:', error);
    throw new Error(`Failed to load face detection models: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Detects faces in an image and returns the detections with landmarks and expressions
 * @param imageElement HTML image element to detect faces in
 * @returns Array of face detections with landmarks and expressions
 */
export async function detectFaces(imageElement: HTMLImageElement) {
  if (typeof window === 'undefined') {
    throw new Error('Face detection is only available in the browser');
  }

  if (!modelsLoaded) {
    await loadFaceDetectionModels();
  }
  
  try {
    console.log('Detecting faces...');
    
    // Detect all faces with landmarks and expressions
    const detections = await faceapi
      .detectAllFaces(imageElement, new faceapi.SsdMobilenetv1Options())
      .withFaceLandmarks()
      .withFaceExpressions();
    
    console.log(`Found ${detections.length} faces`);
    return detections;
  } catch (error) {
    console.error('Error detecting faces:', error);
    throw new Error(`Failed to detect faces: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Draws face detections on a canvas
 * @param canvas Canvas element to draw on
 * @param imageElement Image element containing the source image
 * @param detections Face detections to draw
 */
export function drawDetections(
  canvas: HTMLCanvasElement,
  imageElement: HTMLImageElement,
  detections: any[] // Using any[] to avoid complex type imports
) {
  // Set canvas dimensions to match the image
  canvas.width = imageElement.width;
  canvas.height = imageElement.height;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  // Clear the canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Draw the image
  ctx.drawImage(imageElement, 0, 0, canvas.width, canvas.height);
  
  // Draw detections
  detections.forEach((detection: any) => {
    // Draw the bounding box
    const box = detection.detection.box;
    const drawBox = new faceapi.draw.DrawBox(box, { 
      label: `Confidence: ${Math.round(detection.detection.score * 100)}%`,
      lineWidth: 2
    });
    drawBox.draw(canvas);
    
    // Draw the face landmarks
    const landmarks = detection.landmarks;
    const drawLandmarks = new faceapi.draw.DrawFaceLandmarks(landmarks, { 
      lineWidth: 2
    });
    drawLandmarks.draw(canvas);
  });
}

/**
 * Creates a data URL from an image with face detections drawn on it
 * @param imageUrl URL of the image to process
 * @returns Data URL of the processed image with face detections
 */
export async function getImageWithDetections(imageUrl: string): Promise<string> {
  if (typeof window === 'undefined') {
    return imageUrl; // Return original URL on server-side
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = async () => {
      try {
        // Create a canvas to draw on
        const canvas = document.createElement('canvas');
        
        // Detect faces
        const detections = await detectFaces(img);
        
        if (detections.length === 0) {
          console.log('No faces detected');
          resolve(imageUrl); // Return original if no faces found
          return;
        }
        
        // Draw detections on canvas
        drawDetections(canvas, img, detections);
        
        // Convert canvas to data URL
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        resolve(dataUrl);
      } catch (error) {
        console.error('Error processing image:', error);
        resolve(imageUrl); // Return original on error
      }
    };
    
    img.onerror = () => {
      console.error('Error loading image');
      resolve(imageUrl); // Return original on error
    };
    
    img.src = imageUrl;
  });
}
