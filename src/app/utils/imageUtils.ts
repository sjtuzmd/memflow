import sharp from 'sharp';

export type SimilarityAlgorithm = 'grayscale' | 'dhash' | 'color';

// Base function that handles common image processing
async function processImage(
  imageBuffer: Buffer, 
  width: number, 
  height: number,
  grayscale: boolean
) {
  let pipeline = sharp(imageBuffer)
    .resize(width, height, { fit: 'inside' });
    
  if (grayscale) {
    pipeline = pipeline.grayscale();
  }
  
  return await pipeline.raw().toBuffer();
}

// Original grayscale method (8x8)
export async function getGrayscaleHash(imageBuffer: Buffer): Promise<string> {
  try {
    const resized = await processImage(imageBuffer, 8, 8, true);
    
    // Calculate average
    let sum = 0;
    for (let i = 0; i < resized.length; i++) {
      sum += resized[i];
    }
    const avg = sum / resized.length;
    
    // Generate hash
    let hash = '';
    for (let i = 0; i < resized.length; i++) {
      hash += resized[i] > avg ? '1' : '0';
    }
    
    return hash;
  } catch (error) {
    console.error('Error in getImageFingerprint:', error);
    throw error;
  }
}

// Difference Hash (dHash) implementation
export async function getDHash(imageBuffer: Buffer): Promise<string> {
  try {
    // Resize to 9x8 (1px wider to compare adjacent pixels)
    const resized = await processImage(imageBuffer, 9, 8, true);
    
    let hash = '';
    for (let i = 0; i < 8; i++) {
      const rowStart = i * 9;
      for (let j = 0; j < 8; j++) {
        // Compare adjacent pixels
        hash += resized[rowStart + j] > resized[rowStart + j + 1] ? '1' : '0';
      }
    }
    
    return hash;
  } catch (error) {
    console.error('Error in getDHash:', error);
    throw error;
  }
}

// Color-Sensitive Hashing
export async function getColorHash(imageBuffer: Buffer): Promise<string> {
  try {
    // Process each RGB channel separately
    const [rHash, gHash, bHash] = await Promise.all([0, 1, 2].map(async (channel) => {
      const channelBuffer = await processImage(imageBuffer, 8, 8, false)
        .then(buffer => {
          // Extract specific color channel
          const channelData = Buffer.alloc(buffer.length / 3);
          for (let i = 0; i < channelData.length; i++) {
            channelData[i] = buffer[i * 3 + channel];
          }
          return channelData;
        });
      
      // Calculate average for this channel
      const sum = channelBuffer.reduce((a, b) => a + b, 0);
      const avg = sum / channelBuffer.length;
      
      // Generate hash for this channel
      return Array.from(channelBuffer).map(val => val > avg ? '1' : '0').join('');
    }));
    
    // Combine all channels
    return rHash + gHash + bHash;
  } catch (error) {
    console.error('Error in getColorHash:', error);
    throw error;
  }
}

// Main function to get fingerprint based on algorithm
export async function getImageFingerprint(
  imageBuffer: Buffer, 
  algorithm: SimilarityAlgorithm = 'grayscale'
): Promise<string> {
  switch (algorithm) {
    case 'dhash':
      return getDHash(imageBuffer);
    case 'color':
      return getColorHash(imageBuffer);
    case 'grayscale':
    default:
      return getGrayscaleHash(imageBuffer);
  }
}

export function compareHashes(hash1: string, hash2: string): number {
  console.log('\n--- Comparing Hashes ---');
  console.log('Hash 1:', hash1);
  console.log('Hash 2:', hash2);
  
  // Log the 8x8 grid visualization
  console.log('\n8x8 Grid Visualization:');
  for (let y = 0; y < 8; y++) {
    let row1 = '';
    let row2 = '';
    for (let x = 0; x < 8; x++) {
      const idx = y * 8 + x;
      row1 += hash1[idx] === '1' ? '██' : '  ';
      row2 += hash2[idx] === '1' ? '██' : '  ';
    }
    console.log(`Row ${y+1}: ${row1}  |  ${row2}`);
  }
  
  // Calculate differences
  let diff = 0;
  const diffPositions: number[] = [];
  
  for (let i = 0; i < hash1.length; i++) {
    if (hash1[i] !== hash2[i]) {
      diff++;
      diffPositions.push(i);
    }
  }
  
  const similarity = (hash1.length - diff) / hash1.length;
  
  // Log detailed comparison
  console.log('\n--- Comparison Results ---');
  console.log(`Total bits: ${hash1.length}`);
  console.log(`Differing bits: ${diff} at positions:`, diffPositions);
  console.log(`Similarity: ${(similarity * 100).toFixed(1)}%`);
  
  return similarity;
}
