'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { PhotoIcon, CloudArrowUpIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

interface PhotoUploadProps {
  onUploadComplete: (files: File[]) => void;
}

export default function PhotoUpload({ onUploadComplete }: PhotoUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setIsUploading(true);
    // Simulate upload progress
    let progress = 0;
    const interval = setInterval(() => {
      progress += 5;
      setUploadProgress(progress);
      if (progress >= 100) {
        clearInterval(interval);
        setIsUploading(false);
        onUploadComplete(acceptedFiles);
      }
    }, 100);
  }, [onUploadComplete]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.heic', '.heif']
    },
    maxFiles: 100,
    multiple: true
  });

  return (
    <div className="mt-12">
      <div
        {...getRootProps()}
        className={`mt-8 border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
          isDragActive ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400'
        }`}
      >
        <input {...getInputProps()} />
        {isUploading ? (
          <div className="space-y-4">
            <ArrowPathIcon className="mx-auto h-12 w-12 text-indigo-500 animate-spin" />
            <p className="text-gray-600">Processing your photos... {uploadProgress}%</p>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        ) : (
          <>
            <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
            <div className="mt-4 flex text-sm text-gray-600 justify-center">
              <label
                htmlFor="file-upload"
                className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none"
              >
                <span>Upload photos</span>
                <input id="file-upload" name="file-upload" type="file" className="sr-only" />
              </label>
              <p className="pl-1">or drag and drop</p>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              PNG, JPG, HEIC up to 10MB
            </p>
          </>
        )}
      </div>
    </div>
  );
}
