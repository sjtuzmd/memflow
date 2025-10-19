'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon, PhotoIcon } from '@heroicons/react/24/outline';

export default function EditorPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [albumData, setAlbumData] = useState(null);

  useEffect(() => {
    // TODO: Fetch album data from API or context
    const loadAlbumData = async () => {
      // Simulate loading
      await new Promise(resolve => setTimeout(resolve, 1000));
      setIsLoading(false);
      // TODO: Set actual album data
      setAlbumData({
        title: 'My Photo Album',
        pages: [],
      });
    };

    loadAlbumData();
  }, []);

  const handleBack = () => {
    router.push('/');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Preparing your album...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center mb-6">
          <button
            onClick={handleBack}
            className="mr-4 p-2 rounded-full hover:bg-gray-100"
            aria-label="Back to upload"
          >
            <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Edit Album</h1>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-center h-64 border-2 border-dashed border-gray-300 rounded-lg">
              <div className="text-center">
                <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No pages yet</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Start by adding photos to create your album pages.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Album Pages</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Placeholder for album pages */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-4">
                <div className="aspect-w-3 aspect-h-2 bg-gray-200 rounded-md overflow-hidden">
                  <div className="w-full h-48 bg-gray-100 flex items-center justify-center">
                    <span className="text-gray-400">Page 1</span>
                  </div>
                </div>
                <div className="mt-2 text-sm font-medium text-gray-900">
                  Cover
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
