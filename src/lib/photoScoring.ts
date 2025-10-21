// We'll use a lightweight blur detection instead of OpenCV
// since OpenCV.js is quite large and complex to set up
import { detectFaces } from '@/app/utils/faceDetection';

export interface PhotoScoreResult {
  faceDetected: boolean;
  smileScore: number; // 0 to 1
  eyesOpen: boolean;
  faceAreaRatio: number; // 0 to 1
  blurScore: number; // 0 = blurry, 1 = sharp
  finalScore: number; // weighted score
}

// Weightings for the final score calculation
const SCORE_WEIGHTS = {
  smile: 0.4,          // Increased weight for smiles
  eyesOpen: 0.2,       // Moderate weight for open eyes
  faceArea: 0.2,       // Moderate weight for face size
  blur: 0.2,           // Moderate weight for image sharpness
};

/**
 * Loads an image from a URL or data URL and returns it as an HTMLImageElement
 */
async function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(new Error(`Failed to load image: ${e}`));
    img.src = source;
  });
}

/**
 * Calculates a blur score using a simplified approach
 * @param imageData Image data from a canvas
 * @returns A blur score between 0 (blurry) and 1 (sharp)
 */
function calculateBlurScore(imageData: ImageData): number {
  try {
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    
    // Simple edge detection using Sobel operator
    let edgeIntensity = 0;
    const laplacianKernel = [0, 1, 0, 1, -4, 1, 0, 1, 0];
    
    // Sample points to reduce computation
    const step = Math.max(1, Math.floor(width * height / 1000));
    let samples = 0;
    
    for (let y = 1; y < height - 1; y += step) {
      for (let x = 1; x < width - 1; x += step) {
        const idx = (y * width + x) * 4;
        let sum = 0;
        
        // Simple 3x3 Laplacian kernel
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const kidx = ((y + ky) * width + (x + kx)) * 4;
            const kernelIdx = (ky + 1) * 3 + (kx + 1);
            const weight = laplacianKernel[kernelIdx] || 0;
            
            // Convert to grayscale using luminance
            const r = data[kidx];
            const g = data[kidx + 1];
            const b = data[kidx + 2];
            const gray = 0.299 * r + 0.587 * g + 0.114 * b;
            
            sum += gray * weight;
          }
        }
        
        edgeIntensity += Math.abs(sum);
        samples++;
      }
    }
    
    // Normalize the edge intensity
    edgeIntensity /= samples * 255; // Normalize to 0-1 range
    
    // Apply a sigmoid function to get a 0-1 score
    const score = 1 / (1 + Math.exp(-10 * (edgeIntensity - 0.1)));
    
    return Math.min(Math.max(score, 0), 1);
  } catch (error) {
    console.error('Error calculating blur score:', error);
    return 0.5; // Default to neutral score on error
  }
}

/**
 * Analyzes an image and returns a score based on various factors
 * @param imageSource URL, data URL, or File of the image to analyze
 * @returns A Promise that resolves to a PhotoScoreResult object
 */
export async function scorePhoto(imageSource: string | File): Promise<PhotoScoreResult> {
  try {
    // Load the image
    const img = await loadImage(
      imageSource instanceof File ? URL.createObjectURL(imageSource) : imageSource
    );
    
    // Create a canvas to work with the image
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not create canvas context');
    }
    
    // Set canvas dimensions to match the image
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    
    // Draw the image on the canvas
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    
    // Get image data for blur detection
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // Calculate blur score
    const blurScore = calculateBlurScore(imageData);
    
    // Detect faces and analyze expressions
    const detections = await detectFaces(img);
    
    if (detections.length === 0) {
      // No faces detected
      return {
        faceDetected: false,
        smileScore: 0,
        eyesOpen: false,
        faceAreaRatio: 0,
        blurScore,
        finalScore: 0, // No face means low score
      };
    }
    
    // For now, just analyze the first face
    const face = detections[0];
    
    // Calculate face area ratio (face area / image area)
    const faceBox = face.detection.box;
    const faceArea = faceBox.width * faceBox.height;
    const imageArea = canvas.width * canvas.height;
    const faceAreaRatio = Math.min(faceArea / imageArea, 0.5) * 2; // Normalize to 0-1 range, cap at 0.5
    
    // Get expression scores
    const expressions = face.expressions;
    const smileScore = expressions.happy || 0;
    
    // Check if eyes are open using landmarks
    let eyesOpen = true;
    if (face.landmarks) {
      const leftEye = face.landmarks.getLeftEye();
      const rightEye = face.landmarks.getRightEye();
      
      // Simple eye openness check based on eye aspect ratio (EAR)
      const getEAR = (eye: any[]) => {
        // Compute the euclidean distances between the two sets of
        // vertical eye landmarks (x, y)-coordinates
        const A = Math.hypot(eye[1].x - eye[5].x, eye[1].y - eye[5].y);
        const B = Math.hypot(eye[2].x - eye[4].x, eye[2].y - eye[4].y);
        
        // Compute the euclidean distance between the horizontal
        // eye landmark (x, y)-coordinates
        const C = Math.hypot(eye[0].x - eye[3].x, eye[0].y - eye[3].y);
        
        // Compute the eye aspect ratio
        return (A + B) / (2.0 * C);
      };
      
      const leftEAR = getEAR(leftEye);
      const rightEAR = getEAR(rightEye);
      const ear = (leftEAR + rightEAR) / 2.0;
      
      // Threshold for eye closed (adjust as needed)
      eyesOpen = ear > 0.25;
    }
    
    // Calculate final weighted score using the updated weight names
    const finalScore = 
      smileScore * SCORE_WEIGHTS.smile +           // 40% weight
      (eyesOpen ? SCORE_WEIGHTS.eyesOpen : 0) +    // 20% weight
      faceAreaRatio * SCORE_WEIGHTS.faceArea +     // 20% weight
      blurScore * SCORE_WEIGHTS.blur;              // 20% weight
    
    return {
      faceDetected: true,
      smileScore,
      eyesOpen,
      faceAreaRatio,
      blurScore,
      finalScore,
    };
  } catch (error) {
    console.error('Error scoring photo:', error);
    // Return a default low score on error
    return {
      faceDetected: false,
      smileScore: 0,
      eyesOpen: false,
      faceAreaRatio: 0,
      blurScore: 0,
      finalScore: 0,
    };
  }
}

/**
 * Finds the best photo from a group of similar photos
 * @param photoUrls Array of photo URLs or Files to compare
 * @returns The URL/File of the best photo and its score
 */
export async function findBestPhoto(photoUrls: (string | File)[]): Promise<{
  bestPhoto: string | File;
  score: number;
  scores: Record<string, number>;
}> {
  if (photoUrls.length === 0) {
    throw new Error('No photos provided');
  }
  
  // Score all photos
  const scores = await Promise.all(
    photoUrls.map(async (url) => {
      const score = await scorePhoto(url);
      return { url, score };
    })
  );
  
  // Find the photo with the highest score
  let bestPhoto = photoUrls[0];
  let bestScore = -1;
  const scoreMap: Record<string, number> = {};
  
  scores.forEach(({ url, score }, index) => {
    const urlStr = typeof url === 'string' ? url : `file_${index}`;
    scoreMap[urlStr] = score.finalScore;
    
    if (score.finalScore > bestScore) {
      bestScore = score.finalScore;
      bestPhoto = url;
    }
  });
  
  return {
    bestPhoto,
    score: bestScore,
    scores: scoreMap,
  };
}
