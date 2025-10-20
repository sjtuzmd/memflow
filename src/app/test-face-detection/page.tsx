'use client';

import { useEffect, useState } from 'react';

export default function TestFaceDetection() {
  const [status, setStatus] = useState('Initializing...');
  const [image, setImage] = useState<string | null>(null);
  const [detections, setDetections] = useState<any[]>([]);
  const [faceDetector, setFaceDetector] = useState<any>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);

  // Load the face detector
  useEffect(() => {
    async function loadFaceDetector() {
      try {
        setStatus('Loading face detection model...');
        
        // Dynamically import the face detection library
        const faceapi = await import('@vladmandic/face-api');
        
        // Load all required models
        await faceapi.nets.ssdMobilenetv1.loadFromUri('/models');
        await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
        await faceapi.nets.faceExpressionNet.loadFromUri('/models');
        
        setFaceDetector(faceapi);
        setStatus('Model loaded. Upload an image to detect faces.');
        
        // Log model information
        console.log('Face detection models loaded successfully');
        console.log('Using backend:', faceapi.tf.getBackend());
      } catch (error) {
        console.error('Error loading face detector:', error);
        setStatus(`Error loading face detector: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    loadFaceDetector();
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const detectFaces = async () => {
    if (!faceDetector || !image) return;

    try {
      setStatus('Detecting faces...');
      
      const img = document.createElement('img');
      img.src = image;
      
      // Wait for image to load
      await new Promise((resolve) => {
        img.onload = resolve;
      });

      // First detect faces with bounding boxes
      const detections = await faceDetector.detectAllFaces(img)
        .withFaceLandmarks();
        
      console.log('Face detections:', detections);
      setDetections(detections);
      setStatus(`Detected ${detections.length} face(s)`);
      
      // Draw bounding boxes on the image
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      // Set canvas dimensions to match the image
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Draw the original image
      ctx.drawImage(img, 0, 0);
      
      // Draw bounding boxes
      ctx.strokeStyle = '#00FF00';
      ctx.lineWidth = 2;
      ctx.font = '16px Arial';
      ctx.fillStyle = '#00FF00';
      
      detections.forEach((detection: any, i: number) => {
        const box = detection.detection.box;
        
        // Draw rectangle
        ctx.strokeRect(box.x, box.y, box.width, box.height);
        
        // Draw label background
        const text = `Face ${i + 1}`;
        const textWidth = ctx.measureText(text).width;
        ctx.fillStyle = 'rgba(0, 255, 0, 0.5)';
        ctx.fillRect(box.x, box.y - 20, textWidth + 10, 20);
        
        // Draw text
        ctx.fillStyle = '#000000';
        ctx.fillText(text, box.x + 5, box.y - 5);
      });
      
      // Update the displayed image
      setProcessedImage(canvas.toDataURL('image/jpeg'));
      
    } catch (error) {
      console.error('Error detecting faces:', error);
      setStatus(`Error detecting faces: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Face Detection Test</h1>
      <div style={{ marginBottom: '20px' }}>
        <p>Status: {status}</p>
        <input 
          type="file" 
          accept="image/*" 
          onChange={handleImageUpload} 
          style={{ marginBottom: '10px', display: 'block' }}
        />
        <button 
          onClick={detectFaces} 
          disabled={!faceDetector || !image}
          style={{
            padding: '10px 20px',
            backgroundColor: !faceDetector || !image ? '#ccc' : '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: !faceDetector || !image ? 'not-allowed' : 'pointer',
            marginBottom: '20px'
          }}
        >
          Detect Faces
        </button>
      </div>
      
      {image && (
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <div style={{ position: 'relative' }}>
            <img 
              src={processedImage || image} 
              alt="Preview" 
              style={{ 
                maxWidth: '100%', 
                maxHeight: '500px',
                border: detections.length > 0 ? '3px solid #4CAF50' : 'none',
                borderRadius: '4px',
                display: 'block'
              }} 
            />
            {detections.length > 0 && (
              <div style={{
                position: 'absolute',
                top: '10px',
                left: '10px',
                backgroundColor: 'rgba(76, 175, 80, 0.8)',
                color: 'white',
                padding: '5px 10px',
                borderRadius: '4px',
                fontWeight: 'bold'
              }}>
                {detections.length} face{detections.length !== 1 ? 's' : ''} detected
              </div>
            )}
          </div>
          
        </div>
      )}
    </div>
  );
}
