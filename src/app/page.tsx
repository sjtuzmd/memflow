'use client';

import { useState, useCallback, useEffect } from 'react';
import { join } from 'path';

declare global {
  interface Window {
    electron?: {
      openFolder: (path: string) => Promise<void>;
    };
  }
}

import { useDropzone } from 'react-dropzone';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowPathIcon, PhotoIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import PhotoSelector from '@/components/PhotoSelector';
// @ts-ignore - No type definitions available for heic2any
import * as heic2any from 'heic2any';

// Animation variants
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.4, 0, 0.2, 1]
    }
  }
};

const fadeIn = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      duration: 0.5,
      ease: [0.4, 0, 0.2, 1]
    }
  }
};

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

export default function Home() {
  // State management
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState<FileWithPreview[]>([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [groupedPhotos, setGroupedPhotos] = useState<{[key: string]: FileWithPreview[]}>({});
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [isDragActive, setIsDragActive] = useState(false);
  const [similarityThreshold, setSimilarityThreshold] = useState(80); // Default 80% (0-100 range)
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
    timestamp: number;
  } | null>(null);

  // Helper function to check if file is HEIC/HEIF
  const isHeicFile = (file: File): boolean => {
    return file.name.toLowerCase().endsWith('.heic') || 
           file.name.toLowerCase().endsWith('.heif') ||
           file.type === 'image/heic' || 
           file.type === 'image/heif';
  };

  // Convert HEIC to JPG in the browser before upload
  const convertHeicToJpg = async (file: File): Promise<File> => {
    if (!isHeicFile(file)) return file;
    
    console.log(`Converting HEIC file: ${file.name}`);

    try {
      // Use heic2any for HEIC conversion as it's more reliable
      const jpegBlob = await (heic2any as unknown as (options: { blob: Blob, toType: string, quality: number }) => Promise<Blob>)({
        blob: file,
        toType: 'image/jpeg',
        quality: 0.8
      }) as Blob;
      
      // Create a new File object with the converted blob
      const newFileName = file.name.replace(/\.[^/.]+$/, '.jpg');
      const newFile = new File(
        [jpegBlob as BlobPart],
        newFileName,
        { type: 'image/jpeg', lastModified: Date.now() }
      );
      
      console.log(`Successfully converted ${file.name} to ${newFileName} (${(newFile.size / 1024 / 1024).toFixed(2)}MB)`);
      return newFile;
      
    } catch (error) {
      console.error('Error converting HEIC to JPG:', error);
      // Fallback to canvas-based conversion if heic2any fails
      try {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new (window as any).Image() as HTMLImageElement;
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = dataUrl;
        });
        
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          throw new Error('Could not create canvas context');
        }
        
        ctx.drawImage(img, 0, 0);
        
        const jpegBlob = await new Promise<Blob | null>((resolve) => {
          canvas.toBlob(
            (blob) => resolve(blob),
            'image/jpeg',
            0.8
          );
        });
        
        if (!jpegBlob) {
          throw new Error('Failed to convert image to JPEG');
        }
        
        const newFileName = file.name.replace(/\.[^/.]+$/, '.jpg');
        const newFile = new File(
          [jpegBlob],
          newFileName,
          { type: 'image/jpeg', lastModified: Date.now() }
        );
        
        console.log(`Fallback conversion successful for ${file.name}`);
        return newFile;
        
      } catch (fallbackError) {
        console.error('Fallback conversion failed:', fallbackError);
        // Return original file if all conversion attempts fail
        return file;
      }
    }
  };

  // Create preview URLs
  const createPreview = async (file: File): Promise<string> => {
    try {
      if (!file.type.startsWith('image/')) {
        console.log('Not an image file:', file.name);
        return '';
      }
      
      return URL.createObjectURL(file);
    } catch (error) {
      console.error('Error creating preview:', error);
      return '';
    }
  };

  // Delete a single photo
  const deletePhoto = async (fileName: string) => {
    if (!confirm('Are you sure you want to delete this photo? This action cannot be undone.')) {
      return;
    }

    try {
      setIsUploading(true);
      
      // Call the API to delete the photo
      const response = await fetch('/api/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileName })
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        // Remove the deleted photo from state
        setUploadedFiles(prev => prev.filter(file => file.savedName !== fileName));
        showNotification('Photo has been deleted', 'success');
      } else {
        throw new Error(result.error || 'Failed to delete photo');
      }
    } catch (error) {
      console.error('Error deleting photo:', error);
      showNotification(
        `Error deleting photo: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'error'
      );
    } finally {
      setIsUploading(false);
    }
  };

  // Delete all uploaded photos
  const deleteAllPhotos = async () => {
    if (!confirm('Are you sure you want to delete all uploaded photos? This action cannot be undone.')) {
      return;
    }

    try {
      setIsUploading(true);
      
      // Call the API to delete all photos
      const response = await fetch('/api/delete-all', {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        // Clear the uploaded files from state
        setUploadedFiles([]);
        showNotification('All photos have been deleted', 'success');
      } else {
        throw new Error(result.error || 'Failed to delete photos');
      }
    } catch (error) {
      console.error('Error deleting photos:', error);
      showNotification(
        `Error deleting photos: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'error'
      );
    } finally {
      setIsUploading(false);
    }
  };

  // Show notification message
  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({
      message,
      type,
      timestamp: Date.now()
    });
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      setNotification(prev => prev?.timestamp === Date.now() ? null : prev);
    }, 5000);
  };

  // Clean up preview URLs
  const revokePreview = (preview: string | null) => {
    if (preview) {
      URL.revokeObjectURL(preview);
    }
  };
  
  // Load previously uploaded files on component mount
  useEffect(() => {
    const loadUploadedFiles = async () => {
      try {
        const response = await fetch('/api/files');
        const result = await response.json();
        
        if (result.success) {
          const loadedFiles = await Promise.all(
            result.files.map(async (file: any) => {
              const response = await fetch(file.path);
              const blob = await response.blob();
              const preview = URL.createObjectURL(blob);
              const originalName = file.originalName || file.name;
              
              return {
                file: new File([blob], originalName, { type: blob.type }),
                preview,
                originalName,
                savedName: file.name,
                path: file.path,
                size: blob.size,
                type: blob.type,
                uploadedAt: new Date().toISOString(),
                exif: {}
              };
            })
          );
          
          setUploadedFiles(loadedFiles);
        }
      } catch (error) {
        console.error('Error loading uploaded files:', error);
      }
    };
    
    loadUploadedFiles();
    
    // Clean up all previews when component unmounts
    return () => {
      uploadedFiles.forEach(file => {
        revokePreview(file.preview);
      });
    };
  }, []);

  // Process a single file (convert HEIC to JPG if needed)
  const processFile = async (file: File): Promise<File> => {
    if (isHeicFile(file)) {
      return await convertHeicToJpg(file);
    }
    return file;
  };

  // Toggle photo selection
  const togglePhotoSelection = (groupId: string, file: FileWithPreview, selected: boolean) => {
    setSelectedPhotos(prev => {
      const newSelection = new Set(prev);
      const fileKey = file.savedName || file.originalName;
      
      if (selected) {
        newSelection.add(fileKey);
      } else {
        newSelection.delete(fileKey);
      }
      
      return newSelection;
    });
  };

  // Handle file upload
  const handleFileUpload = async (files: File[]) => {
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      const formData = new FormData();
      const processedFiles: File[] = [];
      
      // Process and convert files
      for (const file of files) {
        const processedFile = await processFile(file);
        formData.append('files', processedFile);
        processedFiles.push(processedFile);
      }
      
      // Create previews for all files
      const previews = await Promise.all(
        processedFiles.map(file => createPreview(file))
      );
      
      // Create file objects with previews
      const filesWithPreviews = processedFiles.map((file, index) => ({
        file,
        preview: previews[index],
        originalName: files[index].name, // Keep original filename for reference
        savedName: file.name,
        path: '',
        size: file.size,
        type: file.type,
        exif: {},
        uploadedAt: new Date().toISOString()
      } as FileWithPreview));
      
      // Update UI with previews by appending new files to existing ones
      setUploadedFiles(prevFiles => [...prevFiles, ...filesWithPreviews]);
      setUploadProgress(50);
      
      // Upload to server
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to upload files');
      }
      
      // First, update the state with the new files
      const newFiles = await new Promise<FileWithPreview[]>((resolve) => {
        setUploadedFiles(prevFiles => {
          // Create a map of existing files by original name for quick lookup
          const existingFilesMap = new Map(prevFiles.map(f => [f.originalName, f]));
          
          // Update the newly uploaded files with server data
          const updatedNewFiles = filesWithPreviews.map(file => {
            const serverFile = result.successfulUploads.find(
              (f: any) => f.originalName === file.originalName
            );
            
            return serverFile 
              ? { ...file, ...serverFile }
              : file;
          });
          
          // Create a map of updated files to avoid duplicates
          const updatedFilesMap = new Map(updatedNewFiles.map(f => [f.originalName, f]));
          
          // Merge existing files with updated ones, keeping the order
          const mergedFiles = [
            // Keep all existing files that weren't just updated
            ...prevFiles.filter(f => !updatedFilesMap.has(f.originalName)),
            // Add all the newly updated files
            ...updatedNewFiles
          ];
          
          // Resolve with the new state for the notification
          resolve(mergedFiles);
          return mergedFiles;
        });
      });
      
      setUploadProgress(100);
      
      // Count how many files were actually uploaded (not duplicates)
      const uploadedCount = filesWithPreviews.filter(file => !file.isDuplicate).length;
      const duplicateCount = filesWithPreviews.length - uploadedCount;
      
      let message = '';
      if (uploadedCount > 0) {
        message += `Successfully uploaded ${uploadedCount} ${uploadedCount === 1 ? 'photo' : 'photos'}. `;
      }
      if (duplicateCount > 0) {
        message += `Skipped ${duplicateCount} duplicate ${duplicateCount === 1 ? 'file' : 'files'}. `;
      }
      message += `Total: ${newFiles.length} ${newFiles.length === 1 ? 'photo' : 'photos'} in gallery.`;
      
      showNotification(message, 'success');

      return {
        success: true,
        files: newFiles,
        uploadedCount,
        duplicateCount
      };
    } catch (error) {
      console.error('Error uploading files:', error);
      showNotification(
        `Error uploading files: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'error'
      );
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files;
    if (!fileList || fileList.length === 0) return;

    try {
      // Convert FileList to File[]
      const files = Array.from(fileList);
      await handleFileUpload(files);
    } catch (error) {
      console.error('Error processing files:', error);
      alert(`Error processing files: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      // Reset the input value to allow selecting the same file again
      event.target.value = '';
    }
  };

  const handleFeatureClick = (step: number) => {
    if (step < 1 || step > 3) return;
    setCurrentStep(step);
  };

  const { getRootProps, getInputProps, open } = useDropzone({
    onDrop: useCallback(async (acceptedFiles: File[]) => {
      if (!acceptedFiles?.length) return;
      
      try {
        await handleFileUpload(acceptedFiles);
      } catch (error) {
        console.error('Error in file upload:', error);
        alert(`Error uploading files: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setIsUploading(false);
        setUploadProgress(100);
      }
    }, []),
    onDragEnter: () => setIsDragActive(true),
    onDragLeave: () => setIsDragActive(false),
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.heic', '.heif']
    },
    multiple: true
  });

  const handleNextStep = async () => {
    if (currentStep === 1) {
      // When moving from Upload to Select, analyze and group photos
      await analyzeAndGroupPhotos();
    }
    if (currentStep < 4) setCurrentStep(currentStep + 1);
  };

  const handlePrevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  // Analyze and group photos by similarity
  const analyzeAndGroupPhotos = async () => {
    try {
      setIsUploading(true);
      showNotification('Analyzing photos for similarities...', 'info');
      
      // Prepare files for analysis - convert images to base64
      const filesForAnalysis = await Promise.all(
        uploadedFiles.map(async (file) => {
          // If we have a preview URL (data URL), use that
          if (file.preview && file.preview.startsWith('data:image')) {
            return {
              name: file.savedName,
              originalName: file.originalName,
              preview: file.preview,
              data: file.preview.split(',')[1] // Extract base64 data
            };
          }
          
          // Otherwise, try to fetch the image and convert to base64
          try {
            const response = await fetch(file.preview || `/uploads/${file.savedName}`);
            const blob = await response.blob();
            const base64 = await new Promise((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => {
                const base64String = (reader.result as string).split(',')[1];
                resolve(base64String);
              };
              reader.readAsDataURL(blob);
            });
            
            return {
              name: file.savedName,
              originalName: file.originalName,
              preview: file.preview,
              data: base64
            };
          } catch (error) {
            console.error('Error processing file:', file.file.name, error);
            return null;
          }
        })
      );
      
      // Filter out any null values from failed processing
      const validFiles = filesForAnalysis.filter(Boolean);
      
      if (validFiles.length === 0) {
        throw new Error('No valid images to analyze');
      }
      
      console.log('Sending files for analysis:', validFiles);
      
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          files: validFiles,
          similarityThreshold: similarityThreshold / 100 // Convert to 0-1 range
        })
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success && result.results) {
        // Create groups of similar photos
        const groups: {[key: string]: FileWithPreview[]} = {};
        
        // First, create a map of file names to their full file objects
        const fileMap = new Map(uploadedFiles.map(file => [file.savedName, file]));
        
        // Process the results to update files with group information
        result.results.forEach((fileInfo: any) => {
          const file = fileMap.get(fileInfo.name);
          if (file) {
            if (fileInfo.groupId) {
              if (!groups[fileInfo.groupId]) {
                groups[fileInfo.groupId] = [];
              }
              groups[fileInfo.groupId].push(file);
            }
          }
        });
        
        // Convert the groups object to the expected format
        const formattedGroups: {[key: string]: FileWithPreview[]} = {};
        Object.entries(groups).forEach(([groupId, groupFiles]) => {
          if (groupFiles.length > 1) {  // Only include groups with more than one file
            formattedGroups[groupId] = groupFiles;
          }
        });
        
        setGroupedPhotos(formattedGroups);
        showNotification('Photos have been grouped by similarity', 'success');
      } else {
        throw new Error(result.error || 'Failed to analyze photos');
      }
    } catch (error) {
      console.error('Error analyzing photos:', error);
      showNotification(
        `Error analyzing photos: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'error'
      );
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      {/* Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className={`fixed top-4 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-lg shadow-lg z-50 ${
              notification.type === 'success' 
                ? 'bg-green-100 text-green-800 border border-green-200' 
                : notification.type === 'error'
                ? 'bg-red-100 text-red-800 border border-red-200'
                : 'bg-blue-100 text-blue-800 border border-blue-200'
            }`}
          >
            <div className="flex items-center">
              <span>{notification.message}</span>
              <button 
                onClick={() => setNotification(null)}
                className="ml-4 text-gray-500 hover:text-gray-700"
                aria-label="Close notification"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="max-w-5xl mx-auto">
        {/* Progress Steps */}
        <motion.div 
          className="mb-12"
          variants={fadeIn}
          initial="hidden"
          animate="show"
        >
          <nav className="flex items-center justify-center">
            <motion.ol 
              className="flex items-center w-full"
              variants={container}
              initial="hidden"
              animate="show"
            >
              {[1, 2, 3, 4].map((step) => (
                <motion.li 
                  key={step}
                  className={`flex items-center ${
                    step < 4 ? 'w-full' : 'flex-shrink-0'
                  }`}
                  variants={item}
                >
                  <div className="flex flex-col items-center">
                    <motion.div 
                      className={`flex items-center justify-center w-10 h-10 rounded-full font-medium text-sm ${
                        currentStep >= step 
                          ? 'bg-indigo-600 text-white shadow-lg' 
                          : 'bg-white border-2 border-gray-200 text-gray-400'
                      }`}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                    >
                      {currentStep > step ? (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <span>{step}</span>
                      )}
                    </motion.div>
                    <motion.span 
                      className={`mt-2 text-sm font-medium ${
                        currentStep >= step ? 'text-indigo-600' : 'text-gray-400'
                      }`}
                    >
                      {step === 1 ? 'Upload' : step === 2 ? 'Select' : step === 3 ? 'Organize' : 'Export'}
                    </motion.span>
                  </div>
                  {step < 4 && (
                    <motion.div 
                      className={`flex-1 h-1 mx-2 ${
                        currentStep > step ? 'bg-indigo-600' : 'bg-gray-200'
                      }`}
                      initial={{ scaleX: 0, originX: 0 }}
                      animate={{ 
                        scaleX: 1,
                        transition: { delay: 0.3 + (step * 0.1) }
                      }}
                    />
                  )}
                </motion.li>
              ))}
            </motion.ol>
          </nav>
        </motion.div>

        {/* Main Content */}
        <div className="mt-12">
          {currentStep === 1 && (
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              {/* Step 1: Upload */}
              <div className="p-8">
                <div 
                  {...getRootProps()}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center cursor-pointer hover:border-indigo-500 transition-colors"
                >
                  <input {...getInputProps()} />
                  <div className="flex flex-col items-center justify-center space-y-4">
                    <PhotoIcon className="h-12 w-12 text-gray-400" />
                    <h3 className="text-lg font-medium text-gray-900">Upload your photos</h3>
                    <p className="text-sm text-gray-500">Drag and drop files here, or click to select</p>
                    <button
                      type="button"
                      className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Select Files
                    </button>
                  </div>
                </div>

                {/* Upload Progress */}
                {isUploading && (
                  <div className="mt-6">
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div 
                        className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300 ease-out" 
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <p className="mt-2 text-sm text-gray-500 text-center">
                      Uploading... {Math.round(uploadProgress)}%
                    </p>
                  </div>
                )}

                {/* File Previews */}
                {uploadedFiles.length > 0 && (
                  <div className="mt-8">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                      Uploaded Files: {uploadedFiles.length} {uploadedFiles.length === 1 ? 'photo' : 'photos'}
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 auto-rows-fr">
                      {uploadedFiles.map((file, index) => (
                        <div key={index} className="flex flex-col h-full">
                          <div className="relative group h-40 bg-gray-100 rounded-lg overflow-hidden shadow-sm flex items-center justify-center">
                            {file.preview && (
                              <div className="w-full h-full flex items-center justify-center p-2">
                                <Image
                                  src={file.preview}
                                  alt={file.originalName || file.file.name}
                                  width={200}
                                  height={200}
                                  className="h-full w-auto max-w-full group-hover:opacity-75 transition-opacity"
                                  style={{
                                    objectFit: 'contain',
                                    maxHeight: '100%',
                                    maxWidth: '100%'
                                  }}
                                />
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deletePhoto(file.savedName);
                                  }}
                                  disabled={isUploading}
                                  className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                  title="Delete photo"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Delete All Photos Button */}
                {uploadedFiles.length > 0 && (
                  <div className="mt-8 flex justify-center">
                    <button
                      onClick={deleteAllPhotos}
                      disabled={isUploading}
                      className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${
                        isUploading 
                          ? 'bg-gray-400 cursor-not-allowed' 
                          : 'bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500'
                      }`}
                    >
                      <svg 
                        className={`-ml-1 mr-2 h-5 w-5 ${isUploading ? 'animate-spin' : ''}`} 
                        xmlns="http://www.w3.org/2000/svg" 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        {isUploading ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        ) : (
                          <>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </>
                        )}
                      </svg>
                      {isUploading ? 'Deleting...' : 'Delete All Photos'}
                    </button>
                  </div>
                )}
              </div>
              
              {/* Similarity Threshold Slider */}
              <div className="w-full max-w-2xl mx-auto mt-4 p-4 bg-white rounded-lg shadow">
                <div className="mb-2 flex justify-between">
                  <label className="block text-sm font-medium text-gray-700">
                    Similarity Threshold: {similarityThreshold}%
                  </label>
                  <span className="text-sm text-gray-500">
                    {similarityThreshold < 30 ? 'Very Loose' : 
                     similarityThreshold < 60 ? 'Loose' : 
                     similarityThreshold < 80 ? 'Balanced' : 
                     similarityThreshold < 95 ? 'Precise' : 'Very Precise'}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={similarityThreshold}
                  onChange={(e) => setSimilarityThreshold(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0%</span>
                  <span>100%</span>
                </div>
                <p className="mt-2 text-sm text-gray-600">
                  Lower values group more photos together, while higher values require stronger similarity for grouping.
                </p>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Select Photos to Keep</h2>
              <PhotoSelector
                groupedPhotos={groupedPhotos}
                onSelect={togglePhotoSelection}
                selectedPhotos={selectedPhotos}
              />
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="px-8 py-4 bg-gray-50 border-t border-gray-200 flex justify-between">
              <button
                onClick={handlePrevStep}
                disabled={currentStep === 1}
                className={`px-4 py-2 rounded-md ${
                  currentStep === 1 
                    ? 'text-gray-400 cursor-not-allowed' 
                    : 'text-indigo-600 hover:bg-indigo-50'
                }`}
              >
                Previous
              </button>
              
              <button
                onClick={handleNextStep}
                disabled={currentStep === 3}
                className={`px-4 py-2 rounded-md ${
                  currentStep === 3
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-indigo-600 hover:bg-indigo-50'
                }`}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }