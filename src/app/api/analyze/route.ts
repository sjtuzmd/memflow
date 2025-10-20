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

    console.log(`Processing ${files.length} files for 1:1 comparison...`);
    const results: ImageAnalysis[] = [];
    const processedFiles: Array<{name: string, originalName: string, preview?: string, fingerprint: string}> = [];
    const groups: {[key: string]: string[]} = {}; // groupId -> array of file names
    let nextGroupId = 1;

    // First, calculate fingerprints for all images
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
          
          // Store the processed file data
          processedFiles.push({
            name: file.name,
            originalName: file.originalName || file.name,
            preview: file.preview,
            fingerprint
          });
          
        } catch (fingerprintError) {
          console.error('Error calculating fingerprint:', fingerprintError);
          throw new Error(`Failed to calculate fingerprint for ${file.name}: ${fingerprintError instanceof Error ? fingerprintError.message : 'Unknown error'}`);
        }
        
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
    
    // Now perform 1:1 comparison between all pairs of images
    console.log('\nPerforming 1:1 comparisons...');
    const totalComparisons = (processedFiles.length * (processedFiles.length - 1)) / 2;
    console.log(`Total comparisons to perform: ${totalComparisons}`);
    
    // Initialize results with unique group IDs
    const fileToGroupMap: {[key: string]: string} = {};
    
    for (let i = 0; i < processedFiles.length; i++) {
      const file1 = processedFiles[i];
      
      // If file is not in any group yet, create a new group for it
      if (!fileToGroupMap[file1.name]) {
        const groupId = `group-${nextGroupId++}`;
        groups[groupId] = [file1.name];
        fileToGroupMap[file1.name] = groupId;
      }
      
      // Compare with all subsequent files
      for (let j = i + 1; j < processedFiles.length; j++) {
        const file2 = processedFiles[j];
        const progress = ((i * processedFiles.length + j) / (processedFiles.length * processedFiles.length)) * 100;
        console.log(`Comparing ${file1.name} with ${file2.name} (${progress.toFixed(1)}%)`);
        
        try {
          // Compare the two fingerprints
          const similarity = compareHashes(file1.fingerprint, file2.fingerprint);
          
          if (similarity >= similarityThreshold) {
            console.log(`  - Similarity: ${(similarity * 100).toFixed(1)}% (above threshold ${(similarityThreshold * 100).toFixed(1)}%)`);
            
            const group1 = fileToGroupMap[file1.name];
            const group2 = fileToGroupMap[file2.name];
            
            if (!group1 && !group2) {
              // Neither file is in a group yet, create a new group
              const groupId = `group-${nextGroupId++}`;
              groups[groupId] = [file1.name, file2.name];
              fileToGroupMap[file1.name] = groupId;
              fileToGroupMap[file2.name] = groupId;
            } else if (group1 && !group2) {
              // Add file2 to file1's group
              groups[group1].push(file2.name);
              fileToGroupMap[file2.name] = group1;
            } else if (!group1 && group2) {
              // Add file1 to file2's group
              groups[group2].push(file1.name);
              fileToGroupMap[file1.name] = group2;
            } else if (group1 !== group2) {
              // Merge the two groups
              const [smallerGroup, largerGroup] = 
                groups[group1].length < groups[group2].length ? [group1, group2] : [group2, group1];
              
              // Move all files from smaller group to larger group
              for (const fileName of groups[smallerGroup]) {
                groups[largerGroup].push(fileName);
                fileToGroupMap[fileName] = largerGroup;
              }
              
              // Remove the smaller group
              delete groups[smallerGroup];
            }
          }
        } catch (error) {
          console.error(`Error comparing ${file1.name} with ${file2.name}:`, error);
          // Continue with other comparisons even if one fails
        }
      }
    }
    
    // Prepare the final results with group information
    for (const file of processedFiles) {
      const groupId = fileToGroupMap[file.name] || `solo-${file.name}`;
      results.push({
        name: file.name,
        originalName: file.originalName,
        preview: file.preview,
        fingerprint: file.fingerprint,
        groupId: groups[groupId]?.length > 1 ? groupId : undefined
      });
    }

    // Group similar images using connected components algorithm
    console.log('Grouping complete');
    console.log(`Found ${Object.keys(groups).filter(id => groups[id].length > 1).length} groups of similar images`);
    
    // Process the results to include group information and calculate scores
    for (const result of results) {
      if (result.groupId) {
        const groupFiles = groups[result.groupId] || [];
        if (groupFiles.length > 1) {
          // For the first file in the group, calculate the average similarity
          if (groupFiles[0] === result.name) {
            const currentFile = processedFiles.find(f => f.name === result.name);
            if (currentFile) {
              let totalSimilarity = 0;
              let count = 0;
              
              for (const otherFile of groupFiles) {
                if (otherFile !== result.name) {
                  const otherFileData = processedFiles.find(f => f.name === otherFile);
                  if (otherFileData) {
                    const similarity = compareHashes(
                      currentFile.fingerprint,
                      otherFileData.fingerprint
                    );
                    totalSimilarity += similarity;
                    count++;
                  }
                }
              }
              
              if (count > 0) {
                result.score = totalSimilarity / count;
              }
            }
          }
        }
      }
    }
    
    // Prepare the response with groups information
    const response = {
      success: true,
      results,
      groups: Object.entries(groups)
        .filter(([_, fileNames]) => fileNames.length > 1) // Only include groups with multiple files
        .map(([groupId, fileNames]) => {
          // Calculate the group score as the average of all pairwise similarities
          let totalSimilarity = 0;
          let comparisonCount = 0;
          
          for (let i = 0; i < fileNames.length; i++) {
            const file1 = processedFiles.find(f => f.name === fileNames[i]);
            if (!file1) continue;
            
            for (let j = i + 1; j < fileNames.length; j++) {
              const file2 = processedFiles.find(f => f.name === fileNames[j]);
              if (!file2) continue;
              
              const similarity = compareHashes(file1.fingerprint, file2.fingerprint);
              totalSimilarity += similarity;
              comparisonCount++;
            }
          }
          
          const avgScore = comparisonCount > 0 ? totalSimilarity / comparisonCount : 0;
          
          return {
            id: groupId,
            fileNames,
            score: avgScore,
            count: fileNames.length
          };
        })
        .sort((a, b) => b.count - a.count || b.score - a.score) // Sort by group size, then by score
    };
    
    return NextResponse.json(response);

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
