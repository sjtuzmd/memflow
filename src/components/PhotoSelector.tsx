'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { CheckCircleIcon } from '@heroicons/react/24/solid';

interface PhotoSelectorProps {
  groupedPhotos: { [key: string]: any[] };
  uniquePhotos?: any[];
  onSelect: (groupId: string, file: any, selected: boolean) => void;
  selectedPhotos: Set<string>;
}

// Reusable Photo Thumbnail Component
function PhotoThumbnail({ file, isSelected, onClick }: { file: any, isSelected: boolean, onClick: () => void }) {
  const imageUrl = file.preview || 
                  (file.file && URL.createObjectURL(file.file)) || 
                  file.path || '';
                  
  if (!imageUrl) {
    console.warn('No valid image URL found for file:', file);
  }
  
  return (
    <div className="flex flex-col h-full">
      <motion.div 
        className={`relative group h-40 bg-gray-100 rounded-lg overflow-hidden shadow-sm flex items-center justify-center ${
          isSelected ? 'ring-2 ring-indigo-500' : ''
        }`}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
      >
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={file.originalName || file.name || 'Photo'}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            onError={(e) => {
              console.error('Error loading image:', imageUrl, e);
              const target = e.currentTarget as HTMLImageElement;
              target.src = '/placeholder-image.png';
            }}
          />
        ) : (
          <div className="w-full h-full bg-gray-100 flex items-center justify-center">
            <span className="text-gray-400 text-sm">No preview</span>
          </div>
        )}
      
        {/* Selection indicator */}
        <div 
          className={`absolute inset-0 flex items-center justify-center transition-opacity ${
            isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
        >
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative">
            {isSelected ? (
              <CheckCircleIcon className="w-10 h-10 text-green-400" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-white/80 flex items-center justify-center">
                <div className="w-5 h-5 rounded border-2 border-gray-400" />
              </div>
            )}
          </div>
        </div>
      </motion.div>
      
      {/* File name */}
      <div className="mt-2 text-xs text-gray-500 truncate">
        {file.originalName || file.name}
      </div>
      
      {/* Score badge */}
      {file.score !== undefined && (
        <div className="mt-1 text-xs text-gray-400">
          Similarity: {Math.round(file.score * 100)}%
        </div>
      )}
    </div>
  );
}

export default function PhotoSelector({ groupedPhotos, uniquePhotos = [], onSelect, selectedPhotos }: PhotoSelectorProps) {
  if (Object.keys(groupedPhotos).length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No photos to display. Please upload some photos first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {Object.entries(groupedPhotos).map(([groupId, group], groupIndex) => (
        <div key={groupId} className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Group {groupIndex + 1}</h3>
            <span className="text-sm text-gray-500">{group.length} {group.length === 1 ? 'photo' : 'photos'}</span>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 auto-rows-fr">
            {group.map((file) => (
              <PhotoThumbnail 
                key={file.savedName || file.name}
                file={file}
                isSelected={selectedPhotos.has(file.savedName || file.name)}
                onClick={() => onSelect(groupId, file, !selectedPhotos.has(file.savedName || file.name))}
              />
            ))}
          </div>
        </div>
      ))}
      
      {/* Unique Photos Section */}
      {uniquePhotos && uniquePhotos.length > 0 && (
        <div className="space-y-4 mt-12">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Unique Photos</h3>
            <span className="text-sm text-gray-500">{uniquePhotos.length} {uniquePhotos.length === 1 ? 'photo' : 'photos'}</span>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 auto-rows-fr">
            {uniquePhotos.map((file) => (
              <PhotoThumbnail 
                key={file.savedName || file.name}
                file={file}
                isSelected={selectedPhotos.has(file.savedName || file.name)}
                onClick={() => onSelect('unique', file, !selectedPhotos.has(file.savedName || file.name))}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
