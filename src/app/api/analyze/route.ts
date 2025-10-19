import { NextResponse } from 'next/server';
import { readFile, readdir } from 'fs/promises';
import { join } from 'path';
import { getImageFingerprint, compareHashes, analyzeFaces } from '@/app/utils/imageUtils';

interface ImageAnalysis {
  path: string;
  originalName: string;
  fingerprint: string;
  faceAnalysis: any;
  groupId?: string;
}

export async function POST() {
  try {
    const uploadDir = join(process.cwd(), 'public', 'uploads');
    const files = (await readdir(uploadDir)).filter(f => !f.startsWith('.'));
    
    // Load models
    await loadModels();
    
    // Analyze all images
    const analysis: ImageAnalysis[] = [];
    
    for (const file of files) {
      try {
        const filePath = join(uploadDir, file);
        const imageBuffer = await readFile(filePath);
        
        const fingerprint = await getImageFingerprint(imageBuffer);
        const faceAnalysis = await analyzeFaces(imageBuffer);
        
        analysis.push({
          path: `/uploads/${file}`,
          originalName: file, // You might want to get the original name from metadata
          fingerprint,
          faceAnalysis
        });
      } catch (error) {
        console.error(`Error processing ${file}:`, error);
      }
    }
    
    // Group similar images (90% similarity threshold)
    const groups: ImageAnalysis[][] = [];
    const SIMILARITY_THRESHOLD = 0.9;
    
    for (const img of analysis) {
      let addedToGroup = false;
      
      for (const group of groups) {
        const similarity = compareHashes(img.fingerprint, group[0].fingerprint);
        if (similarity >= SIMILARITY_THRESHOLD) {
          group.push(img);
          addedToGroup = true;
          break;
        }
      }
      
      if (!addedToGroup) {
        groups.push([img]);
      }
    }
    
    // Sort groups by best face score
    const sortedGroups = groups.map(group => ({
      images: group.sort((a, b) => 
        (b.faceAnalysis?.score || 0) - (a.faceAnalysis?.score || 0)
      ),
      bestScore: Math.max(...group.map(img => img.faceAnalysis?.score || 0))
    })).sort((a, b) => b.bestScore - a.bestScore);
    
    return NextResponse.json({
      success: true,
      groups: sortedGroups.map(g => ({
        images: g.images.map(img => ({
          path: img.path,
          originalName: img.originalName,
          score: img.faceAnalysis?.score || 0,
          expressions: img.faceAnalysis?.expressions
        })),
        bestScore: g.bestScore
      }))
    });
    
  } catch (error) {
    console.error('Error analyzing images:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to analyze images' },
      { status: 500 }
    );
  }
}

// This is a workaround since we can't use top-level await in Next.js API routes
let modelsLoaded = false;
async function loadModels() {
  if (modelsLoaded) return;
  
  // We'll need to serve these models from the public directory
  const modelPath = join(process.cwd(), 'public', 'models');
  
  // In a real app, you'd load the models here
  // For now, we'll just set a flag
  modelsLoaded = true;
}
