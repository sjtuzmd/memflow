'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeftIcon, 
  PhotoIcon, 
  PlusIcon,
  TrashIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  AdjustmentsHorizontalIcon,
  DocumentTextIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { useAlbumStore } from '@/lib/store';

export default function EditorPage() {
  const router = useRouter();
  const { 
    images, 
    groupedImages, 
    pages, 
    addPage, 
    updatePage, 
    removePage,
    setStatus 
  } = useAlbumStore();
  
  const [activeTab, setActiveTab] = useState('pages');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedPage, setSelectedPage] = useState<string | null>(null);

  useEffect(() => {
    // Initialize with a cover page if no pages exist
    if (pages.length === 0 && Object.keys(groupedImages).length > 0) {
      const firstDate = Object.keys(groupedImages)[0];
      addPage({
        title: 'Cover',
        images: [],
        layout: 'cover',
        theme: 'classic'
      });
    }
  }, [groupedImages, pages.length, addPage]);

  const handleBack = () => {
    router.push('/home');
  };

  const handleAddPage = () => {
    const newPage = {
      title: `Page ${pages.length + 1}`,
      images: [],
      layout: 'grid-2x2',
      theme: 'classic',
    };
    const pageId = addPage(newPage);
    setSelectedPage(pageId);
  };

  const handlePageSelect = (pageId: string) => {
    setSelectedPage(pageId);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const renderPagePreview = (page: any) => {
    return (
      <div 
        key={page.id}
        className={`relative rounded-lg overflow-hidden border-2 ${
          selectedPage === page.id ? 'border-indigo-500' : 'border-transparent'
        } transition-all duration-200`}
      >
        <div className="aspect-[3/4] bg-gray-100 flex items-center justify-center">
          {page.images.length > 0 ? (
            <div className="grid grid-cols-2 gap-1 w-full h-full p-1">
              {page.images.slice(0, 4).map((imgId: string, idx: number) => {
                const img = images.find(img => img.id === imgId);
                return img ? (
                  <div key={idx} className="bg-gray-200 overflow-hidden">
                    <img 
                      src={img.previewUrl} 
                      alt="" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : null;
              })}
            </div>
          ) : (
            <div className="text-center p-4">
              <PhotoIcon className="mx-auto h-8 w-8 text-gray-400 mb-2" />
              <p className="text-xs text-gray-500">Add photos</p>
            </div>
          )}
        </div>
        <div className="p-2 bg-white">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-900 truncate">
              {page.title}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                removePage(page.id);
                if (selectedPage === page.id) {
                  setSelectedPage(null);
                }
              }}
              className="text-gray-400 hover:text-red-500"
              aria-label="Delete page"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`flex h-screen bg-gray-100 ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold text-gray-900">Album Editor</h1>
            <button
              onClick={toggleFullscreen}
              className="text-gray-400 hover:text-gray-600"
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
              {isFullscreen ? (
                <ArrowsPointingInIcon className="h-5 w-5" />
              ) : (
                <ArrowsPointingOutIcon className="h-5 w-5" />
              )}
            </button>
          </div>
          <button
            onClick={handleBack}
            className="mt-2 flex items-center text-sm text-indigo-600 hover:text-indigo-800"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-1" /> Back to upload
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('pages')}
                className={`flex-1 py-4 px-1 text-center border-b-2 font-medium text-sm ${
                  activeTab === 'pages'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Pages
              </button>
              <button
                onClick={() => setActiveTab('photos')}
                className={`flex-1 py-4 px-1 text-center border-b-2 font-medium text-sm ${
                  activeTab === 'photos'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Photos
              </button>
            </nav>
          </div>

          <div className="p-4">
            {activeTab === 'pages' ? (
              <div className="space-y-4">
                <button
                  onClick={handleAddPage}
                  className="w-full flex items-center justify-center px-4 py-2 border border-dashed border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Add Page
                </button>

                <div className="space-y-3 mt-4">
                  {pages.map((page) => (
                    <div 
                      key={page.id}
                      onClick={() => handlePageSelect(page.id)}
                      className="cursor-pointer"
                    >
                      {renderPagePreview(page)}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search photos..."
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                  <svg
                    className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-4">
                  {images.map((img) => (
                    <div 
                      key={img.id}
                      className="aspect-square bg-gray-200 rounded overflow-hidden"
                    >
                      <img 
                        src={img.previewUrl} 
                        alt="" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="bg-white border-b border-gray-200 p-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button className="p-2 rounded hover:bg-gray-100">
              <AdjustmentsHorizontalIcon className="h-5 w-5 text-gray-600" />
            </button>
            <button className="p-2 rounded hover:bg-gray-100">
              <DocumentTextIcon className="h-5 w-5 text-gray-600" />
            </button>
            <button className="p-2 rounded hover:bg-gray-100">
              <SparklesIcon className="h-5 w-5 text-gray-600" />
            </button>
          </div>
          <div className="flex items-center space-x-2">
            <button className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
              Save Draft
            </button>
            <button className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700">
              Export Album
            </button>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 overflow-auto bg-gray-50 flex items-center justify-center p-8">
          {selectedPage ? (
            <div className="bg-white shadow-lg" style={{ width: '794px', height: '1123px' }}>
              {/* Album page content will go here */}
              <div className="h-full flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <PhotoIcon className="mx-auto h-12 w-12 mb-2" />
                  <p>Add photos to this page</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <PhotoIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No page selected</h3>
              <p className="mt-1 text-sm text-gray-500">
                Select a page from the sidebar or create a new one.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
