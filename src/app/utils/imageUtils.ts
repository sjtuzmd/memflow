import * as faceapi from '@vladmandic/face-api';
import sharp from 'sharp';

// Load face-api models
let modelsLoaded = false;

export async function loadModels() {
  if (modelsLoaded) return;
  
  await faceapi.nets.ssdMobilenetv1.loadFromUri('/models');
  await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
  await faceapi.nets.faceExpressionNet.loadFromUri('/models');
  
  modelsLoaded = true;
}

export async function getImageFingerprint(imageBuffer: Buffer): Promise<string> {
  // Resize to 8x8 and convert to grayscale for simple perceptual hash
  const resized = await sharp(imageBuffer)
    .resize(8, 8, { fit: 'inside' })
    .grayscale()
    .raw()
    .toBuffer();
  
  // Calculate average
  let sum = 0;
  for (let i = 0; i < resized.length; i++) {
    sum += resized[i];
  }
  const avg = sum / resized.length;
  
  // Generate hash
  let hash = '';
  for (let i = 0; i < resized.length; i++) {
    hash += resized[i] > avg ? '1' : '0';
  }
  
  return hash;
}

export function compareHashes(hash1: string, hash2: string): number {
  let diff = 0;
  for (let i = 0; i < hash1.length; i++) {
    if (hash1[i] !== hash2[i]) diff++;
  }
  return (hash1.length - diff) / hash1.length; // similarity ratio (0-1)
}

export async function analyzeFaces(imageBuffer: Buffer) {
  // Convert to tensor
  const tensor = faceapi.bufferToImage(imageBuffer);
  
  // Detect faces with expressions
  const detections = await faceapi
    .detectAllFaces(tensor as HTMLImageElement, new faceapi.SsdMobilenetv1Options())
    .withFaceLandmarks()
    .withFaceExpressions();
    
  if (detections.length === 0) return null;
  
  // Calculate face scores
  const faceScores = detections.map(face => {
    // Get eye landmarks (points 36-47)
    const leftEye = face.landmarks.getLeftEye();
    const rightEye = face.landmarks.getRightEye();
    
    // Calculate eye openness (simplified)
    const leftEyeOpenness = Math.abs(leftEye[1].y - leftEye[5].y) / Math.abs(leftEye[0].x - leftEye[3].x);
    const rightEyeOpenness = Math.abs(rightEye[1].y - rightEye[5].y) / Math.abs(rightEye[0].x - rightEye[3].x);
    const avgEyeOpenness = (leftEyeOpenness + rightEyeOpenness) / 2;
    
    // Get expression probabilities
    const expressions = face.expressions.asSortedArray();
    const happiness = expressions.find(e => e.expression === 'happy')?.probability || 0;
    
    // Calculate score (0-100)
    const score = Math.min(100, Math.round(
      (avgEyeOpenness * 0.4 + happiness * 0.6) * 100
    ));
    
    return {
      score,
      expressions: face.expressions,
      landmarks: face.landmarks
    };
  });
  
  // Return the best face (highest score)
  return faceScores.sort((a, b) => b.score - a.score)[0];
}
