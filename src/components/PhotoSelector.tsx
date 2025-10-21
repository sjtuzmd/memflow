'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid';

interface FileWithPreview {
  file: File;
  preview: string | null;
  originalName: string;
  savedName: string;
  path?: string;
  size?: number;
  type?: string;
  exif?: any;
  uploadedAt?: string;
  isDuplicate?: boolean;
}

interface PhotoSelectorProps {
  groupedPhotos: { [key: string]: FileWithPreview[] };
  onSelect: (groupId: string, file: FileWithPreview, selected: boolean) => void;
  selectedPhotos: Set<string>;
  highlightPhoto?: string | null;
}

export default function PhotoSelector({ 
  groupedPhotos, 
  onSelect, 
  selectedPhotos, 
  highlightPhoto 
}: PhotoSelectorProps) {

  // Separate photos with no similar matches (groups with only one photo)
  const { groups, noMatches } = Object.entries(groupedPhotos).reduce<{
    groups: { [key: string]: any[] };
    noMatches: any[];
  }>((acc, [groupId, group]) => {
    if (group.length === 1) {
      acc.noMatches.push(...group);
    } else {
      acc.groups[groupId] = group;
    }
    return acc;
  }, { groups: {}, noMatches: [] });

  if (Object.keys(groups).length === 0 && noMatches.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No photos to display. Please upload some photos first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* Groups with similar photos */}
      {Object.entries(groups).length > 0 && (
        <div className="space-y-8">
          <h2 className="text-xl font-semibold text-gray-900">Similar Photo Groups</h2>
          {Object.entries(groups).map(([groupId, group], groupIndex) => (
        <div key={groupId} className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Group {groupIndex + 1}</h3>
            <span className="text-sm text-gray-500">{group.length} {group.length === 1 ? 'photo' : 'photos'}</span>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 auto-rows-fr">
            {group.map((file) => {
              const isSelected = selectedPhotos.has(file.savedName || file.name);
              // Ensure we have a valid URL - check for blob URLs or data URLs
              const imageUrl = file.preview || 
                             (file.file && URL.createObjectURL(file.file)) || 
                             file.path || '';
              
              // Debug log to check file structure
              if (!imageUrl) {
                console.warn('No valid image URL found for file:', file);
              }
              
              return (
                <div key={file.savedName || file.name} className="flex flex-col h-full">
                  <motion.div 
                    className={`relative group h-40 bg-gray-100 rounded-lg overflow-hidden shadow-sm flex items-center justify-center ${
                      isSelected ? 'ring-2 ring-indigo-500' : ''
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onSelect(groupId, file, !isSelected)}
                  >
                    {imageUrl ? (
                      <Image
                        src={imageUrl}
                        alt={file.originalName || file.name || 'Grouped photo'}
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
                  
                  {/* File name - Hidden as per request */}
                  
                  {/* Score badge */}
                  {file.score !== undefined && (
                    <div className="mt-1 text-xs text-gray-400">
                      Similarity: {Math.round(file.score * 100)}%
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  )}

      {/* Photos with no similar matches */}
      {noMatches.length > 0 && (
        <div className="space-y-8 pt-8 border-t border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Unique Photos</h2>
          <p className="text-sm text-gray-500 mb-4">These photos don't have any similar matches.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 auto-rows-fr">
            {noMatches.map((file) => {
              const isSelected = selectedPhotos.has(file.savedName || file.name);
              const imageUrl = file.preview || 
                             (file.file && URL.createObjectURL(file.file)) || 
                             file.path || '';

              return (
                <div key={file.savedName || file.name} className="flex flex-col h-full">
                  <motion.div 
                    className={`relative group h-40 bg-gray-100 rounded-lg overflow-hidden shadow-sm flex items-center justify-center ${
                      isSelected ? 'ring-2 ring-indigo-500' : ''
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onSelect('unique', file, !isSelected)}
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
                  
                  {/* File name - Hidden as per request */}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
