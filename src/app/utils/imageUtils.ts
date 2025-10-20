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
  let diff = 0;
  for (let i = 0; i < hash1.length; i++) {
    if (hash1[i] !== hash2[i]) diff++;
  }
  return (hash1.length - diff) / hash1.length; // similarity ratio (0-1)
}
