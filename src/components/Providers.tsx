'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAlbumStore } from '@/lib/store';

export function Providers({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { status, error, setStatus, setError } = useAlbumStore();

  // Handle global loading and error states
  useEffect(() => {
    if (error) {
      // You could integrate with a toast notification system here
      console.error('Album Error:', error);
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error, setError]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Global loading overlay */}
      {status === 'processing' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-700">Processing your photos...</p>
          </div>
        </div>
      )}
      
      {/* Main content */}
      <div className="flex-1">
        {children}
      </div>
      
      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500">
            &copy; {new Date().getFullYear()} MemFlow. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
