import sharp from 'sharp';

/**
 * Calculate a perceptual hash of an image using the dHash algorithm
 * This is more accurate than a simple average hash
 */
export async function getImageFingerprint(imageBuffer: Buffer): Promise<string> {
  try {
    // Resize to 9x8 and convert to grayscale
    // We use 9x8 to compare adjacent pixels in the next step
    const { data, info } = await sharp(imageBuffer)
      .resize(9, 8, { fit: 'cover' }) // Note: 9x8 to allow for 8x8 difference matrix
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true });
    
    const width = info.width;
    const pixels = new Uint8Array(data);
    
    // Calculate the difference between adjacent pixels
    // This creates a 8x8 matrix of bits (64 bits total)
    let hash = '';
    
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const idx = y * width + x;
        const nextIdx = y * width + (x + 1);
        
        // Compare adjacent pixels
        hash += pixels[idx] > pixels[nextIdx] ? '1' : '0';
      }
    }
    
    return hash;
  } catch (error) {
    console.error('Error in getImageFingerprint:', error);
    throw error;
  }
}

/**
 * Compare two image hashes using Hamming distance
 * Returns a similarity score between 0 and 1, where 1 is identical
 */
export function compareHashes(hash1: string, hash2: string): number {
  if (hash1.length !== hash2.length) {
    throw new Error('Hashes must be of the same length');
  }
  
  let diff = 0;
  const length = Math.min(hash1.length, hash2.length);
  
  for (let i = 0; i < length; i++) {
    if (hash1[i] !== hash2[i]) {
      diff++;
    }
  }
  
  // Convert to similarity score (0-1)
  const similarity = 1 - (diff / length);
  
  // Apply a sigmoid function to make the similarity score more discriminative
  // This helps to better separate similar and dissimilar images
  return 1 / (1 + Math.exp(-10 * (similarity - 0.8)));
}
