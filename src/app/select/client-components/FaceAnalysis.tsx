'use client';

import { useEffect, useState } from 'react';
import * as faceapi from '@vladmandic/face-api';

interface FaceAnalysisProps {
  imageUrl: string;
  onAnalysisComplete: (result: any) => void;
}

export default function FaceAnalysis({ imageUrl, onAnalysisComplete }: FaceAnalysisProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const analyzeImage = async () => {
      try {
        setLoading(true);
        
        // Load models if not already loaded
        if (!faceapi.nets.ssdMobilenetv1.params) {
          await faceapi.nets.ssdMobilenetv1.loadFromUri('/models');
        }
        if (!faceapi.nets.faceLandmark68Net.params) {
          await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
        }
        if (!faceapi.nets.faceExpressionNet.params) {
          await faceapi.nets.faceExpressionNet.loadFromUri('/models');
        }

        // Load image
        const img = await faceapi.fetchImage(imageUrl);
        
        // Detect faces with expressions and landmarks
        const detections = await faceapi
          .detectAllFaces(img, new faceapi.SsdMobilenetv1Options())
          .withFaceLandmarks()
          .withFaceExpressions();

        if (isMounted) {
          if (detections.length === 0) {
            onAnalysisComplete({ faces: [], score: 0 });
            return;
          }

          // Calculate scores for each face
          const analyzedFaces = detections.map(face => {
            // Calculate eye openness (simplified)
            const leftEye = face.landmarks.getLeftEye();
            const rightEye = face.landmarks.getRightEye();
            
            const leftEyeOpenness = Math.abs(leftEye[1].y - leftEye[5].y) / 
                                 Math.abs(leftEye[0].x - leftEye[3].x);
            const rightEyeOpenness = Math.abs(rightEye[1].y - rightEye[5].y) / 
                                  Math.abs(rightEye[0].x - rightEye[3].x);
            const avgEyeOpenness = (leftEyeOpenness + rightEyeOpenness) / 2;
            
            // Get expression with highest probability
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

          // Sort by score (highest first)
          analyzedFaces.sort((a, b) => b.score - a.score);
          
          onAnalysisComplete({
            faces: analyzedFaces,
            score: analyzedFaces[0]?.score || 0
          });
        }
      } catch (err) {
        console.error('Error analyzing image:', err);
        if (isMounted) {
          setError('Failed to analyze image');
          onAnalysisComplete({ faces: [], score: 0, error: 'Analysis failed' });
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    analyzeImage();

    return () => {
      isMounted = false;
    };
  }, [imageUrl, onAnalysisComplete]);

  if (loading) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-10">
        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-red-100 text-red-600 text-xs p-1">
        {error}
      </div>
    );
  }

  return null;
}
