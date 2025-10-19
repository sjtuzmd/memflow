'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PhotoUpload } from '@/components/PhotoUpload';

export default function HomePage() {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleUploadComplete = async (files: File[]) => {
    setIsProcessing(true);
    // TODO: Process files with TensorFlow and other logic
    console.log('Files uploaded:', files);
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Navigate to editor with the processed data
    router.push('/editor');
  };

  return (
    <div className="py-12">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl md:text-6xl">
          <span className="block">Create Beautiful</span>
          <span className="block text-indigo-600">Photo Albums</span>
        </h1>
        <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
          Upload your photos and let our AI create stunning, print-ready photo albums automatically.
        </p>
      </div>

      <PhotoUpload onUploadComplete={handleUploadComplete} />

      <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900">1. Upload Photos</h3>
            <p className="mt-2 text-sm text-gray-500">
              Select your best moments from any device or import from cloud storage.
            </p>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900">2. AI-Powered Organization</h3>
            <p className="mt-2 text-sm text-gray-500">
              Our AI analyzes and groups your photos by date, location, and content.
            </p>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900">3. Stunning Designs</h3>
            <p className="mt-2 text-sm text-gray-500">
              Get professional-quality album designs tailored to your photos.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
