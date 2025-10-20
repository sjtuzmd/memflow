import { NextResponse } from 'next/server';
import { getImageFingerprint, compareHashes } from '@/app/utils/imageUtils';

interface ImageAnalysis {
  name: string;
  originalName: string;
  preview?: string;
  fingerprint: string;
  groupId?: string;
  score?: number;
}

interface AnalyzeRequest {
  files: Array<{
    name: string;
    originalName: string;
    preview?: string;
    data: string; // base64 encoded image data
  }>;
  similarityThreshold?: number; // Value between 0 and 1
}

export async function POST(request: Request) {
  console.log('\n--- Analyze API called ---');
  
  try {
    console.log('Parsing request body...');
    const body: AnalyzeRequest = await request.json();
    console.log('Request body received with files count:', body.files?.length || 0);
    
    const { files, similarityThreshold = 0.85 } = body;
    console.log('Using similarity threshold:', similarityThreshold);
    
    if (!files || !Array.isArray(files)) {
      console.error('Invalid files array in request body');
      return NextResponse.json(
        { success: false, error: 'Invalid request: files array is required' },
        { status: 400 }
      );
    }
    
    if (files.length === 0) {
      console.error('No files provided for analysis');
      return NextResponse.json(
        { success: false, error: 'No files provided for analysis' },
        { status: 400 }
      );
    }

    console.log(`Processing ${files.length} files...`);
    const results: ImageAnalysis[] = [];

    for (const file of files) {
      try {
        console.log(`\nProcessing file: ${file.name}`);
        
        // Get image fingerprint
        let fingerprint: string;
        try {
          console.log('Calculating image fingerprint...');
          
          if (!file.data) {
            throw new Error('No image data provided');
          }
          
          // Convert base64 to buffer
          const imageBuffer = Buffer.from(file.data, 'base64');
          
          // Verify the buffer contains valid image data
          if (imageBuffer.length === 0) {
            throw new Error('Empty image data');
          }
          
          fingerprint = await getImageFingerprint(imageBuffer);
          console.log('Fingerprint calculated');
        } catch (fingerprintError) {
          console.error('Error calculating fingerprint:', fingerprintError);
          throw new Error(`Failed to calculate fingerprint for ${file.name}: ${fingerprintError instanceof Error ? fingerprintError.message : 'Unknown error'}`);
        }

        results.push({
          name: file.name,
          originalName: file.originalName || file.name,
          preview: file.preview,
          fingerprint,
        });
        
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
        return NextResponse.json(
          { 
            success: false, 
            error: `Error processing file ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
            details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined
          },
          { status: 500 }
        );
      }
    }

    // Group similar images
    console.log('Grouping similar images...');
    const groups: ImageAnalysis[][] = [];
    const processed = new Set<number>();
    
    for (let i = 0; i < results.length; i++) {
      if (processed.has(i)) continue;
      
      const group: ImageAnalysis[] = [results[i]];
      processed.add(i);
      
      for (let j = i + 1; j < results.length; j++) {
        if (processed.has(j)) continue;
        
        const similarity = compareHashes(results[i].fingerprint, results[j].fingerprint);
        if (similarity >= similarityThreshold) {
          group.push({ ...results[j], score: similarity });
          processed.add(j);
        }
      }
      
      if (group.length > 1) {
        groups.push(group);
      }
    }
    
    console.log(`Found ${groups.length} groups of similar images`);
    
    // Assign group IDs
    const groupedResults = results.map(result => {
      // Find the group this result belongs to
      const group = groups.find(g => g.some(img => img.name === result.name));
      if (group) {
        const groupId = `group-${groups.indexOf(group)}`;
        result.groupId = groupId;
        
        // If this is the first item in the group, add a score
        if (group[0].name === result.name) {
          // Calculate average similarity score for the group
          const scores = group.map(img => img.score || 0);
          const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
          result.score = avgScore;
        }
      }
      return result;
    });

    return NextResponse.json({
      success: true,
      results: groupedResults,
      groups: groups.map((group, index) => ({
        id: `group-${index}`,
        count: group.length,
        preview: group[0].preview
      }))
    });

  } catch (error) {
    console.error('Error in analyze API:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'An unknown error occurred',
        stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined
      },
      { status: 500 }
    );
  }
}

// Face detection is now handled on the client side
