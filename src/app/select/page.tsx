'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import * as faceapi from '@vladmandic/face-api';

export default function SelectPage() {
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const router = useRouter();

  useEffect(() => {
    // Load models and analyze images when component mounts
    const loadAndAnalyze = async () => {
      try {
        // Load face-api models
        await faceapi.nets.ssdMobilenetv1.load('/models');
        await faceapi.nets.faceLandmark68Net.load('/models');
        await faceapi.nets.faceExpressionNet.load('/models');
        
        // Analyze images
        const response = await fetch('/api/analyze', { method: 'POST' });
        const result = await response.json();
        
        if (result.success) {
          setGroups(result.groups);
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadAndAnalyze();
  }, []);

  const toggleSelect = (imagePath: string) => {
    setSelectedImages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(imagePath)) {
        newSet.delete(imagePath);
      } else {
        newSet.add(imagePath);
      }
      return newSet;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Analyzing your photos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Select Best Photos</h1>
        <div className="flex space-x-4">
          <span className="text-gray-600">
            {selectedImages.size} {selectedImages.size === 1 ? 'photo' : 'photos'} selected
          </span>
          <button
            onClick={() => {
              // Handle selection completion
              alert(`Selected ${selectedImages.size} photos`);
            }}
            disabled={selectedImages.size === 0}
            className={`px-4 py-2 rounded-md ${
              selectedImages.size > 0
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Save Selection
          </button>
        </div>
      </div>

      <div className="space-y-12">
        {groups.map((group, groupIndex) => (
          <div key={groupIndex} className="border rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 border-b">
              <h3 className="font-medium text-gray-700">
                Group {groupIndex + 1} • {group.images.length} {group.images.length === 1 ? 'photo' : 'photos'}
                <span className="ml-2 text-sm text-blue-600">
                  Best score: {Math.round(group.bestScore)}%
                </span>
              </h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 p-4">
              {group.images.map((image: any, imageIndex: number) => (
                <div 
                  key={imageIndex}
                  className={`relative group cursor-pointer rounded-md overflow-hidden border-2 ${
                    selectedImages.has(image.path) ? 'border-blue-500' : 'border-transparent'
                  }`}
                  onClick={() => toggleSelect(image.path)}
                >
                  <div className="aspect-square relative">
                    <Image
                      src={image.path}
                      alt={image.originalName}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 50vw, 33vw"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
                      {selectedImages.has(image.path) && (
                        <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full p-1">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="p-2 bg-white">
                    <div className="text-xs text-gray-500 truncate">
                      {image.originalName}
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-xs font-medium">
                        Score: {Math.round(image.score)}%
                      </span>
                      {image.expressions && (
                        <span className="text-xs text-gray-500">
                          {Object.entries(image.expressions)
                            .sort((a: any, b: any) => b[1] - a[1])
                            .slice(0, 1)
                            .map(([emotion]) => emotion)
                            .join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
