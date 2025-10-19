import { jsPDF } from 'jspdf';
import { ProcessedImage } from './imageProcessor';

interface ExportOptions {
  format: 'pdf' | 'jpg' | 'png';
  quality?: number;
  dpi?: number;
  includeMetadata?: boolean;
}

export async function exportAlbum(
  pages: Array<{
    title: string;
    images: string[];
    layout: string;
  }>,
  images: Record<string, ProcessedImage>,
  options: ExportOptions = {
    format: 'pdf',
    quality: 0.9,
    dpi: 300,
    includeMetadata: true
  }
): Promise<Blob> {
  const { format, quality, dpi = 300, includeMetadata } = options;
  
  // Create a new PDF document (8.5 x 11 inches at 300 DPI)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'in',
    format: [8.5, 11],
    filters: ['ASCIIHexEncode']
  });

  // Add each page to the PDF
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    
    if (i > 0) {
      doc.addPage();
    }

    // Add page title
    doc.setFontSize(18);
    doc.text(page.title, 0.5, 0.75);

    // Add images based on layout
    switch (page.layout) {
      case 'grid-2x2':
        await addGridLayout(doc, page.images, images, 0.5, 1.5, 7.5, 8);
        break;
      case 'full-bleed':
        if (page.images[0]) {
          await addImageToPage(doc, page.images[0], images, 0.25, 1, 8, 9.5);
        }
        break;
      case 'collage':
        await addCollageLayout(doc, page.images, images, 0.5, 1.5, 7.5, 8);
        break;
    }

    // Add page number
    doc.setFontSize(10);
    doc.text(
      `Page ${i + 1} of ${pages.length}`,
      7.5,
      10.5,
      { align: 'right' }
    );
  }

  // Generate the PDF as a blob
  const pdfBlob = doc.output('blob');
  
  // Convert to requested format if needed
  if (format === 'pdf') {
    return pdfBlob;
  } else {
    return await convertPdfToImage(pdfBlob, format, quality);
  }
}

async function addGridLayout(
  doc: jsPDF,
  imageIds: string[],
  images: Record<string, ProcessedImage>,
  x: number,
  y: number,
  width: number,
  height: number
) {
  const rows = 2;
  const cols = 2;
  const cellWidth = width / cols;
  const cellHeight = height / rows;
  const padding = 0.1;

  for (let i = 0; i < Math.min(imageIds.length, 4); i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const imgX = x + col * cellWidth + padding;
    const imgY = y + row * cellHeight + padding;
    const imgWidth = cellWidth - 2 * padding;
    const imgHeight = cellHeight - 2 * padding;

    await addImageToPage(doc, imageIds[i], images, imgX, imgY, imgWidth, imgHeight);
  }
}

async function addCollageLayout(
  doc: jsPDF,
  imageIds: string[],
  images: Record<string, ProcessedImage>,
  x: number,
  y: number,
  width: number,
  height: number
) {
  if (imageIds.length === 0) return;

  // Main image takes 2/3 of the width and full height
  if (imageIds[0]) {
    await addImageToPage(
      doc,
      imageIds[0],
      images,
      x,
      y,
      (width * 2) / 3,
      height
    );
  }

  // Two smaller images on the right
  if (imageIds[1]) {
    await addImageToPage(
      doc,
      imageIds[1],
      images,
      x + (width * 2) / 3,
      y,
      width / 3,
      height / 2
    );
  }

  if (imageIds[2]) {
    await addImageToPage(
      doc,
      imageIds[2],
      images,
      x + (width * 2) / 3,
      y + height / 2,
      width / 3,
      height / 2
    );
  }
}

async function addImageToPage(
  doc: jsPDF,
  imageId: string,
  images: Record<string, ProcessedImage>,
  x: number,
  y: number,
  width: number,
  height: number
) {
  const image = images[imageId];
  if (!image) return;

  // Convert image to data URL if needed
  let imageUrl = image.previewUrl;
  if (imageUrl.startsWith('blob:')) {
    imageUrl = await blobToDataUrl(imageUrl);
  }

  // Add image to PDF
  doc.addImage(
    imageUrl,
    'JPEG',
    x,
    y,
    width,
    height,
    undefined,
    'FAST'
  );
}

function blobToDataUrl(blobUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', blobUrl, true);
    xhr.responseType = 'blob';
    xhr.onload = function() {
      if (this.status === 200) {
        const reader = new FileReader();
        reader.onloadend = function() {
          resolve(reader.result as string);
        };
        reader.onerror = reject;
        reader.readAsDataURL(this.response);
      } else {
        reject(new Error(`Failed to load blob: ${this.statusText}`));
      }
    };
    xhr.onerror = reject;
    xhr.send();
  });
}

async function convertPdfToImage(
  pdfBlob: Blob,
  format: 'jpg' | 'png',
  quality = 0.9
): Promise<Blob> {
  // This is a simplified example - in a real app, you'd use a PDF.js worker
  // to render each page to a canvas and then convert to the desired format
  throw new Error('Image export not yet implemented');
}

export function downloadFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function saveToLocalStorage(key: string, data: any) {
  try {
    localStorage.setItem(`memflow_${key}`, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('Error saving to localStorage:', error);
    return false;
  }
}

export function loadFromLocalStorage<T>(key: string): T | null {
  try {
    const data = localStorage.getItem(`memflow_${key}`);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error loading from localStorage:', error);
    return null;
  }
}
