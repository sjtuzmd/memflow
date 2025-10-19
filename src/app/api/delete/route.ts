import { NextResponse } from 'next/server';
import { unlink, readFile, writeFile } from 'fs/promises';
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

// Helper to write metadata file
const writeMetadata = async (data: Record<string, { originalName: string }>) => {
  await writeFile(METADATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
};

export async function POST(request: Request) {
  try {
    const { fileName } = await request.json();
    
    if (!fileName) {
      return NextResponse.json(
        { success: false, error: 'File name is required' },
        { status: 400 }
      );
    }
    
    const filePath = join(process.cwd(), 'public', 'uploads', fileName);
    
    try {
      // Update metadata to remove the deleted file
      const metadata = await readMetadata();
      if (metadata[fileName]) {
        delete metadata[fileName];
        await writeMetadata(metadata);
      }
      
      // Try to delete the file
      await unlink(filePath);
      
      return NextResponse.json({
        success: true,
        message: 'Photo deleted successfully',
      });
    } catch (error) {
      // If file doesn't exist, it's already deleted
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return NextResponse.json({
          success: true,
          message: 'Photo was already deleted',
        });
      }
      throw error;
    }
  } catch (error) {
    console.error('Error deleting photo:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete photo',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
