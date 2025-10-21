'use client';

import { useState, useEffect } from 'react';

export default function Home() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    console.log('Home component mounted');
    setIsClient(true);
    return () => {
      console.log('Home component unmounted');
    };
  }, []);

  if (!isClient) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Welcome to MemFlow</h1>
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Upload and organize your photos</h2>
          <p className="text-gray-600 mb-6">
            Get started by uploading your photos to begin organizing your memories.
          </p>
          <button
            onClick={() => {
              console.log('Upload button clicked');
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Upload Photos
          </button>
        </div>
      </div>
    </div>
  );
}
