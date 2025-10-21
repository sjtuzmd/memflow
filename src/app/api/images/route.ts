import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    // Path to your uploads directory
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    
    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(uploadsDir)) {
      console.log('Uploads directory does not exist, creating it...');
      fs.mkdirSync(uploadsDir, { recursive: true });
      return NextResponse.json({ images: [] });
    }
    
    // Read the directory contents
    const files = fs.readdirSync(uploadsDir)
      .filter(file => {
        try {
          // Filter out non-image files, hidden files, and directories
          const filePath = path.join(uploadsDir, file);
          const stat = fs.statSync(filePath);
          if (stat.isDirectory()) return false;
          
          const ext = path.extname(file).toLowerCase();
          return ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext) && !file.startsWith('.');
        } catch (err) {
          console.error(`Error processing file ${file}:`, err);
          return false;
        }
      })
      .map(file => ({
        name: file,
        path: `/uploads/${file}`,
        preview: `/uploads/${file}`,
        size: fs.statSync(path.join(uploadsDir, file)).size
      }));

    console.log(`Found ${files.length} images in uploads directory`);
    return NextResponse.json({ images: files });
  } catch (error) {
    console.error('Error reading uploads directory:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch images',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
