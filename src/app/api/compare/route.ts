import { NextResponse } from 'next/server';
import { getImageFingerprint, compareHashes, getGrayscaleHash, getDHash, getColorHash } from '@/app/utils/imageUtils';
import fs from 'fs';
import path from 'path';

type SimilarityAlgorithm = 'grayscale' | 'dhash' | 'color';

export async function POST(request: Request) {
  try {
    const { image1, image2, algorithm = 'grayscale', debug = false } = await request.json();

    if (!image1 || !image2) {
      return NextResponse.json(
        { error: 'Both image1 and image2 are required' },
        { status: 400 }
      );
    }
    
    // Debug output
    let debugOutput: string[] = [];
    const log = (message: string) => {
      debugOutput.push(`[${new Date().toISOString()}] ${message}`);
      if (debug) console.log(`[CompareAPI] ${message}`);
    };
    
    log(`Starting comparison with algorithm: ${algorithm}`);

    // Get absolute paths
    const getAbsolutePath = (imagePath: string) => {
      // Remove leading slash if present
      const relativePath = imagePath.startsWith('/') ? imagePath.substring(1) : imagePath;
      return path.join(process.cwd(), 'public', relativePath);
    };

    const image1Path = getAbsolutePath(image1);
    const image2Path = getAbsolutePath(image2);

    // Check if files exist
    if (!fs.existsSync(image1Path) || !fs.existsSync(image2Path)) {
      return NextResponse.json(
        { error: 'One or both images not found' },
        { status: 404 }
      );
    }

    // Read image files
    const image1Buffer = fs.readFileSync(image1Path);
    const image2Buffer = fs.readFileSync(image2Path);

    // Get fingerprints based on selected algorithm
    log('Processing image 1...');
    const image1Data = await getImageFingerprint(image1Buffer, algorithm);
    log('Processing image 2...');
    const image2Data = await getImageFingerprint(image2Buffer, algorithm);
    
    let fingerprint1: string;
    let fingerprint2: string;
    
    // Extract fingerprints and debug info
    fingerprint1 = typeof image1Data === 'string' ? image1Data : (image1Data as any).fingerprint || '';
    fingerprint2 = typeof image2Data === 'string' ? image2Data : (image2Data as any).fingerprint || '';
    
    if (debug) {
      if (typeof image1Data !== 'string') {
        log('\n--- Image 1 Debug Info ---');
        log(`Resolution: ${(image1Data as any).width || 'N/A'}x${(image1Data as any).height || 'N/A'}`);
      }
      log(`Hash 1: ${fingerprint1}`);
      
      log('\n--- Image 2 Debug Info ---');
      if (typeof image2Data !== 'string') {
        log(`Resolution: ${(image2Data as any).width || 'N/A'}x${(image2Data as any).height || 'N/A'}`);
      }
      log(`Hash 2: ${fingerprint2}`);
    }

    // Compare fingerprints
    log('\n--- Comparing Hashes ---');
    log(`Algorithm: ${algorithm}`);
    log(`Hash length: ${fingerprint1.length} bits`);
    
    const similarity = compareHashes(fingerprint1, fingerprint2);
    log(`Similarity: ${(similarity * 100).toFixed(2)}%`);

    return NextResponse.json({ 
      success: true,
      similarity,
      image1: image1,
      image2: image2,
      algorithm,
      debug: debug ? debugOutput.join('\n') : undefined
    });

  } catch (error) {
    console.error('Error comparing images:', error);
    return NextResponse.json(
      { error: 'Failed to compare images' },
      { status: 500 }
    );
  }
}
