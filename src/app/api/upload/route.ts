import { NextResponse } from 'next/server';
import { writeFile, mkdir, readFile, readdir } from 'fs/promises';
import { join, extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import * as exifr from 'exifr';

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

interface UploadedFile {
  originalName: string;
  savedName: string;
  path: string;
  size: number;
  type: string;
  exif: any;
  uploadedAt: string;
  isDuplicate?: boolean;
  error?: string;
  details?: any;
}

// Ensure upload directory exists
const uploadDir = join(process.cwd(), 'public', 'uploads');

const ensureUploadDir = async () => {
  try {
    await mkdir(uploadDir, { recursive: true });
  } catch (error) {
    console.error('Error creating upload directory:', error);
  }
};

export async function POST(request: Request) {
  try {
    await ensureUploadDir();
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    
    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files uploaded' },
        { status: 400 }
      );
    }

    const processedImages: UploadedFile[] = await Promise.all(
      files.map(async (file) => {
        try {
          const buffer = await file.arrayBuffer();
          const bufferData = Buffer.from(buffer);
          
          // Check for duplicates before processing
          const existingFiles = await readdir(uploadDir);
          
          // Find first matching file (if any)
          let existingMatch: string | null = null;
          for (const existingFileName of existingFiles) {
            if (existingFileName === '.metadata.json') continue;
            
            try {
              const existingFilePath = join(uploadDir, existingFileName);
              const existingFileData = await readFile(existingFilePath);
              
              // Compare file sizes first (quick check)
              if (existingFileData.length !== bufferData.length) continue;
              
              // If sizes match, compare content
              if (bufferData.equals(existingFileData)) {
                existingMatch = existingFileName;
                break;
              }
            } catch (e) {
              console.error(`Error checking file ${existingFileName}:`, e);
              continue;
            }
          }
          
          if (existingMatch) {
            console.log(`Skipping duplicate file: ${file.name} (duplicate of ${existingMatch})`);
            return {
              originalName: file.name,
              savedName: existingMatch,
              path: `/uploads/${existingMatch}`,
              size: bufferData.length,
              type: file.type,
              exif: {},
              uploadedAt: new Date().toISOString(),
              isDuplicate: true
            };
          }
          
          // Always use .jpg extension for converted files, or original extension for others
          const isConvertedJpg = file.type === 'image/jpeg' && 
                               (file.name.toLowerCase().endsWith('.heic') || 
                                file.name.toLowerCase().endsWith('.heif'));
          
          const ext = isConvertedJpg ? '.jpg' : extname(file.name).toLowerCase();
          const finalFileName = `${uuidv4()}${ext}`;
          const filePath = join(uploadDir, finalFileName);
          
          // Store original filename in metadata
          const metadata = await readMetadata();
          metadata[finalFileName] = { originalName: file.name };
          await writeMetadata(metadata);
          
          // Write the file to disk
          await writeFile(filePath, bufferData);
          
          // Get image metadata (EXIF data)
          let exifData = {};
          try {
            exifData = await exifr.parse(Buffer.from(buffer)) || {};
            
            // If this was a converted HEIC file, update the original filename in EXIF if possible
            const exifWithFilename = exifData as { originalFilename?: string };
            if (isConvertedJpg && !exifWithFilename.originalFilename) {
              exifWithFilename.originalFilename = file.name;
              exifData = exifWithFilename;
            }
          } catch (exifError) {
            console.warn('Error reading EXIF data:', exifError);
          }
          
          return {
            originalName: file.name,
            savedName: finalFileName,
            path: `/uploads/${finalFileName}`,
            size: file.size,
            type: file.type,
            exif: exifData,
            uploadedAt: new Date().toISOString()
          } as UploadedFile;
        } catch (error) {
          console.error(`Error processing file ${file.name}:`, error);
          return {
            originalName: file.name,
            savedName: '',
            path: '',
            size: 0,
            type: file.type,
            exif: {},
            uploadedAt: new Date().toISOString(),
            error: 'Failed to process image',
            details: error instanceof Error ? error.message : 'Unknown error'
          } as UploadedFile;
        }
      })
    );

    const successfulUploads = processedImages.filter(img => !img.error);
    const failedUploads = processedImages.filter(img => img.error);
    
    const response = {
      success: true,
      totalProcessed: successfulUploads.length,
      totalFailed: failedUploads.length,
      successfulUploads: successfulUploads.map(({ error, details, ...rest }) => rest),
      failedUploads: failedUploads.map(({ error, details, ...rest }) => ({
        ...rest,
        error: error || 'Unknown error',
        details: details || 'No details available'
      }))
    };
    
    console.log(`Upload completed: ${successfulUploads.length} succeeded, ${failedUploads.length} failed`);
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in upload handler:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to process images',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined
      },
      { status: 500 }
    );
  }
}