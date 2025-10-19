'use client';

import { useState } from 'react';
import { DownloadIcon, SaveIcon, SettingsIcon, CheckIcon } from './Icons';
import { exportAlbum, downloadFile, saveToLocalStorage } from '@/lib/exportUtils';
import { useAlbumStore } from '@/lib/store';

export function ExportPanel() {
  const { pages, images } = useAlbumStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'jpg' | 'png'>('pdf');
  const [quality, setQuality] = useState(90);
  const [dpi, setDpi] = useState(300);
  const [isSaved, setIsSaved] = useState(false);

  const handleExport = async () => {
    if (isExporting) return;
    
    try {
      setIsExporting(true);
      
      // Convert images to the format expected by exportAlbum
      const imagesMap = images.reduce((acc, img) => {
        acc[img.id] = img;
        return acc;
      }, {} as Record<string, any>);
      
      const blob = await exportAlbum(
        pages.map(page => ({
          ...page,
          // Ensure images is always an array
          images: Array.isArray(page.images) ? page.images : []
        })),
        imagesMap,
        {
          format: exportFormat,
          quality: quality / 100,
          dpi
        }
      );
      
      const extension = exportFormat === 'pdf' ? 'pdf' : exportFormat;
      downloadFile(blob, `album-${new Date().toISOString().slice(0, 10)}.${extension}`);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleSave = () => {
    const success = saveToLocalStorage('album', {
      pages,
      images,
      lastSaved: new Date().toISOString()
    });
    
    if (success) {
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    } else {
      alert('Failed to save. Please check the console for errors.');
    }
  };

  return (
    <div className="relative">
      <div className="flex items-center space-x-2">
        <button
          onClick={handleSave}
          className="p-2 rounded-md hover:bg-gray-100 text-gray-700"
          title="Save project"
        >
          {isSaved ? (
            <CheckIcon className="h-5 w-5 text-green-500" />
          ) : (
            <SaveIcon className="h-5 w-5" />
          )}
        </button>
        
        <div className="relative">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 rounded-md hover:bg-gray-100 text-gray-700"
            title="Export options"
          >
            <DownloadIcon className="h-5 w-5" />
          </button>
          
          {isOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg py-1 z-10">
              <div className="px-4 py-2 border-b border-gray-100">
                <h3 className="text-sm font-medium text-gray-900">Export Options</h3>
              </div>
              
              <div className="px-4 py-2 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Format
                  </label>
                  <select
                    value={exportFormat}
                    onChange={(e) => setExportFormat(e.target.value as any)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                  >
                    <option value="pdf">PDF (Recommended)</option>
                    <option value="jpg">JPEG</option>
                    <option value="png">PNG</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quality: {quality}%
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={quality}
                    onChange={(e) => setQuality(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    DPI: {dpi}
                  </label>
                  <select
                    value={dpi}
                    onChange={(e) => setDpi(Number(e.target.value))}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                  >
                    <option value="150">150 (Web)</option>
                    <option value="300">300 (Print)</option>
                    <option value="600">600 (High Quality Print)</option>
                  </select>
                </div>
                
                <button
                  onClick={handleExport}
                  disabled={isExporting}
                  className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                    isExporting
                      ? 'bg-indigo-400 cursor-not-allowed'
                      : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  {isExporting ? 'Exporting...' : 'Export Album'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {isOpen && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
