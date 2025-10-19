import { NextResponse } from 'next/server';
import { rm } from 'fs/promises';
import { join } from 'path';

export async function POST() {
  try {
    const uploadsDir = join(process.cwd(), 'public', 'uploads');
    
    // Remove the uploads directory and all its contents
    await rm(uploadsDir, { recursive: true, force: true });
    
    // Recreate the directory
    const { mkdir } = await import('fs/promises');
    await mkdir(uploadsDir, { recursive: true });
    
    return NextResponse.json({
      success: true,
      message: 'All photos have been deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting photos:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete photos',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
