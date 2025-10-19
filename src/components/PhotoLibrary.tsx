'use client';

import { useCallback, useState } from 'react';
import { useDrop } from 'react-dnd';
import { ProcessedImage } from '@/lib/imageProcessor';
import { DraggableItem } from './DraggableItem';

interface PhotoLibraryProps {
  images: ProcessedImage[];
  onDropImage: (item: any, monitor: any) => void;
  onSelectImage: (image: ProcessedImage) => void;
  selectedImages: string[];
}

export function PhotoLibrary({ 
  images, 
  onDropImage, 
  onSelectImage, 
  selectedImages 
}: PhotoLibraryProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const [, drop] = useDrop({
    accept: 'PAGE_IMAGE',
    drop: onDropImage,
  });

  const filteredImages = images.filter(img => 
    img.file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="relative">
        <input
          type="text"
          placeholder="Search photos..."
          className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md text-sm"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <svg
          className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>

      <div 
        ref={drop}
        className="grid grid-cols-3 gap-2 overflow-y-auto"
        style={{ maxHeight: 'calc(100vh - 300px)' }}
      >
        {filteredImages.map((img, index) => (
          <DraggableItem
            key={img.id}
            id={img.id}
            index={index}
            type="LIBRARY_IMAGE"
            moveItem={() => {}}
            className={`relative aspect-square rounded overflow-hidden cursor-move ${
              selectedImages.includes(img.id) ? 'ring-2 ring-indigo-500' : ''
            }`}
            onClick={() => onSelectImage(img)}
          >
            <img 
              src={img.previewUrl} 
              alt="" 
              className="w-full h-full object-cover"
            />
            {selectedImages.includes(img.id) && (
              <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
                <div className="bg-indigo-500 rounded-full p-1">
                  <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
            )}
          </DraggableItem>
        ))}
      </div>
    </div>
  );
}
