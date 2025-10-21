import { NextResponse } from 'next/server';
import { getImageFingerprint, compareHashes } from '@/app/utils/imageUtils';
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    const { image1, image2 } = await request.json();

    if (!image1 || !image2) {
      return NextResponse.json(
        { error: 'Both image1 and image2 are required' },
        { status: 400 }
      );
    }

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

    // Get fingerprints
    const fingerprint1 = await getImageFingerprint(image1Buffer);
    const fingerprint2 = await getImageFingerprint(image2Buffer);

    // Compare fingerprints
    const similarity = compareHashes(fingerprint1, fingerprint2);

    return NextResponse.json({ 
      success: true,
      similarity,
      image1: image1,
      image2: image2
    });

  } catch (error) {
    console.error('Error comparing images:', error);
    return NextResponse.json(
      { error: 'Failed to compare images' },
      { status: 500 }
    );
  }
}
