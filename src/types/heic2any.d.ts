declare module 'heic2any' {
  interface Heic2AnyOptions {
    /** The HEIC file to convert */
    blob: Blob;
    /** The image format to convert to */
    toType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
    /** Quality between 0 and 1 (default: 0.92) */
    quality?: number;
  }

  /**
   * Converts a HEIC/HEIF image to another format
   * @param options Conversion options
   * @returns A promise that resolves to the converted Blob or Blob[]
   */
  function heic2any(options: Heic2AnyOptions): Promise<Blob | Blob[]>;
  
  export = heic2any;
}
