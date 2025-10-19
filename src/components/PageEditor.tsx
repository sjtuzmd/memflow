'use client';

import { useCallback } from 'react';
import { useDrop } from 'react-dnd';
import { ProcessedImage } from '@/lib/imageProcessor';
import { DraggableItem } from './DraggableItem';

interface PageEditorProps {
  page: {
    id: string;
    title: string;
    images: string[];
    layout: string;
    theme: string;
  };
  images: ProcessedImage[];
  onUpdatePage: (updates: any) => void;
  onImageSelect: (imageId: string) => void;
  selectedImageId: string | null;
}

export function PageEditor({ 
  page, 
  images, 
  onUpdatePage, 
  onImageSelect,
  selectedImageId
}: PageEditorProps) {
  const moveImage = useCallback((dragIndex: number, hoverIndex: number) => {
    const newImages = [...page.images];
    const [movedImage] = newImages.splice(dragIndex, 1);
    newImages.splice(hoverIndex, 0, movedImage);
    onUpdatePage({ images: newImages });
  }, [page.images, onUpdatePage]);

  const removeImage = (imageId: string) => {
    onUpdatePage({
      images: page.images.filter(id => id !== imageId)
    });
  };

  const [, drop] = useDrop({
    accept: 'LIBRARY_IMAGE',
    drop: (item: { id: string }, monitor) => {
      if (!page.images.includes(item.id)) {
        onUpdatePage({
          images: [...page.images, item.id]
        });
      }
      return { pageId: page.id };
    },
  });

  const renderImage = (imageId: string, index: number) => {
    const image = images.find(img => img.id === imageId);
    if (!image) return null;

    const isSelected = selectedImageId === imageId;

    return (
      <DraggableItem
        key={imageId}
        id={imageId}
        index={index}
        type="PAGE_IMAGE"
        moveItem={moveImage}
      >
        <div 
          className={`relative w-full h-full group ${isSelected ? 'ring-2 ring-indigo-500' : ''}`}
          onClick={() => onImageSelect(imageId)}
        >
          <img
            src={image.previewUrl}
            alt=""
            className="w-full h-full object-cover"
          />
          <button
            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              removeImage(imageId);
            }}
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </DraggableItem>
    );
  };

  const renderLayout = () => {
    switch (page.layout) {
      case 'grid-2x2':
        return (
          <div className="grid grid-cols-2 gap-2 w-full h-full p-2">
            {page.images.slice(0, 4).map((imgId, idx) => (
              <div key={imgId} className="aspect-square">
                {renderImage(imgId, idx)}
              </div>
            ))}
            {Array(4 - Math.min(page.images.length, 4)).fill(0).map((_, idx) => (
              <div key={`empty-${idx}`} className="aspect-square border-2 border-dashed border-gray-300 rounded"></div>
            ))}
          </div>
        );
      case 'full-bleed':
        return page.images.length > 0 ? (
          <div className="w-full h-full">
            {renderImage(page.images[0], 0)}
          </div>
        ) : (
          <div className="w-full h-full border-2 border-dashed border-gray-300 rounded"></div>
        );
      case 'collage':
        return (
          <div className="relative w-full h-full p-4">
            {page.images.length > 0 && (
              <div className="absolute inset-0 grid grid-cols-3 gap-2 p-2">
                <div className="col-span-2 row-span-2">
                  {page.images[0] && renderImage(page.images[0], 0)}
                </div>
                <div className="col-span-1">
                  {page.images[1] && renderImage(page.images[1], 1)}
                </div>
                <div className="col-span-1">
                  {page.images[2] && renderImage(page.images[2], 2)}
                </div>
              </div>
            )}
            {page.images.length === 0 && (
              <div className="w-full h-full border-2 border-dashed border-gray-300 rounded"></div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div 
      ref={drop}
      className="relative bg-white shadow-lg w-full h-full overflow-hidden"
      style={{ aspectRatio: '3/4' }}
    >
      {renderLayout()}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
        <input
          type="text"
          value={page.title}
          onChange={(e) => onUpdatePage({ title: e.target.value })}
          className="w-full bg-transparent text-white font-medium text-lg border-b border-transparent focus:border-white focus:outline-none"
          placeholder="Page title..."
        />
      </div>
    </div>
  );
}
