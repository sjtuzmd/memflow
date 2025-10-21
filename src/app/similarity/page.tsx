'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

type ImageFile = {
  name: string;
  path: string;
  preview: string;
};

export default function SimilarityPage() {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected1, setSelected1] = useState<string>('');
  const [selected2, setSelected2] = useState<string>('');
  const [similarity, setSimilarity] = useState<number | null>(null);
  const [comparing, setComparing] = useState(false);

  // Fetch all images from the server
  useEffect(() => {
    const fetchImages = async () => {
      try {
        const response = await fetch('/api/images');
        if (response.ok) {
          const data = await response.json();
          setImages(data.images);
        }
      } catch (error) {
        console.error('Error fetching images:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchImages();
  }, []);  

  const handleCompare = async () => {
    if (!selected1 || !selected2) return;
    
    setComparing(true);
    try {
      const response = await fetch('/api/compare', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image1: selected1,
          image2: selected2,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSimilarity(data.similarity);
      }
    } catch (error) {
      console.error('Error comparing images:', error);
    } finally {
      setComparing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading images...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Image Similarity Checker</h1>
          <p className="text-gray-600">Select two images to compare their similarity score</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">First Image</label>
              <select
                className="w-full p-2 border border-gray-300 rounded-md"
                value={selected1}
                onChange={(e) => setSelected1(e.target.value)}
              >
                <option value="">Select an image</option>
                {images.map((img) => (
                  <option key={`img1-${img.name}`} value={img.path}>
                    {img.name}
                  </option>
                ))}
              </select>
              {selected1 && (
                <div className="mt-4 border rounded-md p-2">
                  <Image
                    src={selected1}
                    alt="Selected 1"
                    width={300}
                    height={200}
                    className="max-w-full h-auto rounded"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Second Image</label>
              <select
                className="w-full p-2 border border-gray-300 rounded-md"
                value={selected2}
                onChange={(e) => setSelected2(e.target.value)}
              >
                <option value="">Select an image</option>
                {images
                  .filter((img) => img.path !== selected1) // Don't show the same image in both selects
                  .map((img) => (
                    <option key={`img2-${img.name}`} value={img.path}>
                      {img.name}
                    </option>
                  ))}
              </select>
              {selected2 && (
                <div className="mt-4 border rounded-md p-2">
                  <Image
                    src={selected2}
                    alt="Selected 2"
                    width={300}
                    height={200}
                    className="max-w-full h-auto rounded"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-center">
            <button
              onClick={handleCompare}
              disabled={!selected1 || !selected2 || comparing}
              className={`px-6 py-2 rounded-md text-white font-medium ${
                !selected1 || !selected2 || comparing
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {comparing ? 'Comparing...' : 'Compare Images'}
            </button>
          </div>

          {similarity !== null && (
            <div className="mt-8 text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Similarity Result</h3>
              <div className="bg-gray-100 p-4 rounded-md inline-block">
                <span className="text-3xl font-bold text-blue-600">
                  {(similarity * 100).toFixed(1)}%
                </span>
                <p className="text-sm text-gray-500 mt-1">
                  {similarity >= 0.8
                    ? 'Very similar'
                    : similarity >= 0.6
                    ? 'Somewhat similar'
                    : 'Not very similar'}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="text-center text-sm text-gray-500">
          <p>Select any two images to compare their similarity score.</p>
          <p className="mt-1">
            Scores range from 0.0 (completely different) to 1.0 (identical).
          </p>
        </div>
      </div>
    </div>
  );
}
