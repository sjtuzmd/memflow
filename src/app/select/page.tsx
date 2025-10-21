'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import * as faceapi from '@vladmandic/face-api';

export default function SelectPage() {
  const [groups, setGroups] = useState<any[]>([]);
  const [allPhotos, setAllPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAllPhotos, setShowAllPhotos] = useState(true);
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
          console.log('API Response:', JSON.stringify(result, null, 2));
          
          // Store the groups
          const groups = Array.isArray(result.groups) ? result.groups : [];
          setGroups(groups);
          
          // Extract all unique photos from results
          const allUniquePhotos = new Map<string, any>();
          
          // First, collect all unique photos from the results
          if (Array.isArray(result.results)) {
            result.results.forEach((img: any) => {
              const imgPath = img.path || `/uploads/${img.name}`;
              if (!allUniquePhotos.has(imgPath)) {
                allUniquePhotos.set(imgPath, {
                  ...img,
                  path: imgPath,
                  originalName: img.originalName || img.name || 'Unnamed Photo'
                });
              }
            });
          }
          
          // Also check for any images in the groups
          groups.forEach((group: any) => {
            if (group.images && Array.isArray(group.images)) {
              group.images.forEach((img: any) => {
                const imgPath = img.path || `/uploads/${img.name}`;
                if (!allUniquePhotos.has(imgPath)) {
                  allUniquePhotos.set(imgPath, {
                    ...img,
                    path: imgPath,
                    originalName: img.originalName || img.name || 'Unnamed Photo'
                  });
                }
              });
            }
          });
          
          const uniquePhotos = Array.from(allUniquePhotos.values());
          setAllPhotos(uniquePhotos);
          
          console.log('Total unique photos found:', uniquePhotos.length);
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
        {groups.map((group, groupIndex) => {
          // Find all images that belong to this group
          const groupImages = allPhotos.filter(photo => 
            group.fileNames.includes(photo.name) || group.fileNames.includes(photo.path?.split('/').pop())
          );
          
          return (
          <div key={groupIndex} className="border rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 border-b">
              <h3 className="font-medium text-gray-700">
                Group {groupIndex + 1} • {group.count || group.fileNames.length} {group.count === 1 ? 'photo' : 'photos'}
                <span className="ml-2 text-sm text-blue-600">
                  Similarity: {Math.round((group.score || 0) * 100)}%
                </span>
              </h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 p-4">
              {groupImages.map((image: any, imageIndex: number) => (
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

      {/* Unique Photos Section - Always show if we have photos */}
      {allPhotos.length > 0 && (
      <div className="mt-16">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">
            All Unique Photos
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({allPhotos.length} total)
            </span>
          </h2>
          <button
            onClick={() => setShowAllPhotos(!showAllPhotos)}
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
          >
            {showAllPhotos ? 'Hide' : 'Show'} All Photos
            <svg
              className={`w-4 h-4 ml-1 transition-transform ${showAllPhotos ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {showAllPhotos && (
          <div className="bg-white border rounded-lg overflow-hidden">
            <div className="p-4 border-b">
              <p className="text-sm text-gray-600">
                {allPhotos.length} unique photos found
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4 p-4">
              {allPhotos.map((photo, index) => (
                <div 
                  key={index}
                  className={`relative group cursor-pointer rounded-md overflow-hidden border-2 ${
                    selectedImages.has(photo.path) ? 'border-blue-500' : 'border-gray-100'
                  }`}
                  onClick={() => toggleSelect(photo.path)}
                >
                  <div className="aspect-square relative">
                    <Image
                      src={photo.path}
                      alt={photo.originalName}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 50vw, 25vw"
                    />
                    {selectedImages.has(photo.path) && (
                      <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
                        <div className="bg-blue-500 text-white rounded-full p-1">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="p-1 bg-white">
                    <div className="text-xs text-gray-500 truncate text-center">
                      {photo.originalName}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      )}

      {/* Debug Section */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-8 p-4 bg-gray-100 rounded-lg">
          <h3 className="font-medium text-gray-800 mb-2">Debug Info</h3>
          <div className="text-sm text-gray-600">
            <p>Groups: {groups.length}</p>
            <p>Total Photos: {allPhotos.length}</p>
            <pre className="mt-2 p-2 bg-white rounded text-xs overflow-auto max-h-40">
              {JSON.stringify({
                groups: groups.map(g => ({
                  id: g.id,
                  count: g.count,
                  score: g.score,
                  fileNames: g.fileNames?.length
                })),
                allPhotos: allPhotos.length
              }, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
