import sharp from 'sharp';

export async function getImageFingerprint(imageBuffer: Buffer): Promise<string> {
  try {
    // Resize to 8x8 and convert to grayscale for simple perceptual hash
    const resized = await sharp(imageBuffer)
      .resize(8, 8, { fit: 'inside' })
      .grayscale()
      .raw()
      .toBuffer();
    
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
