import { NextResponse } from 'next/server';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

// Metadata file to store original filenames
const METADATA_FILE = join(process.cwd(), 'public', 'uploads', '.metadata.json');

// Helper to read metadata file
const readMetadata = async (): Promise<Record<string, { originalName: string }>> => {
  try {
    const data = await readFile(METADATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return {};
  }
};

export async function GET() {
  try {
    const uploadDir = join(process.cwd(), 'public', 'uploads');
    
    // Read all files in the upload directory
    const files = await readdir(uploadDir);
    
    // Filter out any non-image files (just in case)
    const imageFiles = files.filter(file => 
      /\.(jpg|jpeg|png|gif|heic)$/i.test(file) && file !== '.metadata.json'
    );
    
    // Read metadata for original filenames
    const metadata = await readMetadata();
    
    return NextResponse.json({
      success: true,
      files: imageFiles.map(file => ({
        name: file,
        originalName: metadata[file]?.originalName || file,
        path: `/uploads/${file}`
      }))
    });
    
  } catch (error) {
    console.error('Error reading upload directory:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to list files',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
